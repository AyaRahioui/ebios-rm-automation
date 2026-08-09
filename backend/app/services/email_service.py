from abc import ABC, abstractmethod
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


class EmailProvider(ABC):
    """Abstract base class for email providers."""
    
    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email."""
        pass


class ConsoleEmailProvider(EmailProvider):
    """Console-based email provider for development."""
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Print email to console instead of sending."""
        print("=" * 80)
        print(f"EMAIL TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print("=" * 80)
        if text_content:
            print("TEXT CONTENT:")
            print(text_content)
            print()
        print("HTML CONTENT:")
        print(html_content)
        print("=" * 80)
        return True


class LocalDisplayEmailProvider(EmailProvider):
    """Local display email provider for development - returns link in response."""
    
    def __init__(self):
        self.last_link = None
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Extract and store activation link from HTML content for local display."""
        # Extract link from HTML content
        import re
        link_match = re.search(r'href="([^"]+)"', html_content)
        if link_match:
            self.last_link = link_match.group(1)
        else:
            # Fallback: look for code tag
            code_match = re.search(r'<code>([^<]+)</code>', html_content)
            if code_match:
                self.last_link = code_match.group(1)
        
        print("=" * 80)
        print(f"LOCAL DISPLAY MODE - Email would be sent to: {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"ACTIVATION LINK: {self.last_link}")
        print("=" * 80)
        return True
    
    def get_last_link(self) -> Optional[str]:
        """Get the last activation link for local display."""
        return self.last_link


class SMTPEmailProvider(EmailProvider):
    """SMTP-based email provider for production."""
    
    def __init__(self):
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.user = settings.smtp_user
        self.password = settings.smtp_password
        self.from_email = settings.smtp_from
        self.use_tls = settings.smtp_use_tls
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email via SMTP."""
        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.from_email
            message["To"] = to_email
            message["Subject"] = subject
            
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.send_message(message)
            
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False


def get_email_provider() -> EmailProvider:
    """Get the appropriate email provider based on configuration."""
    # EMAIL_MODE drives which provider to use.
    # LOCAL_DISPLAY: returns activation links synchronously for the frontend.
    # SMTP: uses SMTPEmailProvider when SMTP credentials are configured.
    if getattr(settings, "email_mode", None) == "LOCAL_DISPLAY":
        return LocalDisplayEmailProvider()

    if settings.smtp_host and settings.smtp_user:
        return SMTPEmailProvider()

    return ConsoleEmailProvider()



# Email templates
def get_invitation_email_template(invitation_link: str, role: str) -> tuple[str, str]:
    """Generate invitation email content."""
    subject = f"Invitation à rejoindre EBIOS RM en tant que {role}"
    
    text_content = f"""
    Bonjour,
    
    Vous avez été invité à rejoindre la plateforme EBIOS RM en tant que {role}.
    
    Pour activer votre compte et définir votre mot de passe, cliquez sur le lien suivant :
    {invitation_link}
    
    Ce lien expire dans 72 heures.
    
    Cordialement,
    L'équipe EBIOS RM
    """
    
    html_content = f"""
    <html>
    <body>
        <h2>Invitation à rejoindre EBIOS RM</h2>
        <p>Bonjour,</p>
        <p>Vous avez été invité à rejoindre la plateforme EBIOS RM en tant que <strong>{role}</strong>.</p>
        <p>Pour activer votre compte et définir votre mot de passe, cliquez sur le bouton ci-dessous :</p>
        <p>
            <a href="{invitation_link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Activer mon compte
            </a>
        </p>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p><code>{invitation_link}</code></p>
        <p><em>Ce lien expire dans 72 heures.</em></p>
        <p>Cordialement,<br>L'équipe EBIOS RM</p>
    </body>
    </html>
    """
    
    return subject, text_content, html_content


def get_password_reset_email_template(reset_link: str) -> tuple[str, str]:
    """Generate password reset email content."""
    subject = "Réinitialisation de votre mot de passe EBIOS RM"
    
    text_content = f"""
    Bonjour,
    
    Vous avez demandé la réinitialisation de votre mot de passe.
    
    Pour réinitialiser votre mot de passe, cliquez sur le lien suivant :
    {reset_link}
    
    Ce lien expire dans 2 heures.
    
    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    
    Cordialement,
    L'équipe EBIOS RM
    """
    
    html_content = f"""
    <html>
    <body>
        <h2>Réinitialisation de votre mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Pour réinitialiser votre mot de passe, cliquez sur le bouton ci-dessous :</p>
        <p>
            <a href="{reset_link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Réinitialiser mon mot de passe
            </a>
        </p>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p><code>{reset_link}</code></p>
        <p><em>Ce lien expire dans 2 heures.</em></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <p>Cordialement,<br>L'équipe EBIOS RM</p>
    </body>
    </html>
    """
    
    return subject, text_content, html_content


def get_notification_email_template(notification_type: str, message: str, project_name: Optional[str] = None) -> tuple[str, str]:
    """Generate notification email content."""
    subject = f"Notification EBIOS RM - {notification_type}"
    
    text_content = f"""
    Bonjour,
    
    {message}
    
    """
    
    if project_name:
        text_content += f"Projet concerné : {project_name}\n\n"
    
    text_content += """
    Connectez-vous à votre espace EBIOS RM pour plus de détails.
    
    Cordialement,
    L'équipe EBIOS RM
    """
    
    html_content = f"""
    <html>
    <body>
        <h2>Notification EBIOS RM</h2>
        <p><strong>{notification_type}</strong></p>
        <p>{message}</p>
    """
    
    if project_name:
        html_content += f"<p><strong>Projet concerné :</strong> {project_name}</p>"
    
    html_content += """
        <p>Connectez-vous à votre espace EBIOS RM pour plus de détails.</p>
        <p>Cordialement,<br>L'équipe EBIOS RM</p>
    </body>
    </html>
    """
    
    return subject, text_content, html_content
