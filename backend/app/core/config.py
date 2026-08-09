from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import secrets


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Email mode (env: EMAIL_MODE)
    # Used to decide whether to send invitation emails synchronously and/or return activation links.
    email_mode: str = "LOCAL_DISPLAY"


    # Database
    database_url: str
    database_url_sync: str

    # Security
    secret_key: str = secrets.token_urlsafe(32)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Initial Admin
    admin_email: str
    admin_password: str

    # Email Configuration
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@ebios-rm.com"
    smtp_use_tls: bool = True

    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Application
    app_name: str = "EBIOS RM"
    app_version: str = "0.1.0"
    debug: bool = True

    # Rate Limiting
    rate_limit_login: str = "5/minute"
    rate_limit_forgot_password: str = "3/minute"

    # File Upload
    upload_dir: str = "./uploads"
    max_file_size: int = 10485760  # 10MB

    # Invitation expiration (hours)
    invitation_expire_hours: int = 72

    # Password reset expiration (hours)
    password_reset_expire_hours: int = 2


settings = Settings()
