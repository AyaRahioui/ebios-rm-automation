import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const AcceptInvitationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    verifyToken();
  }, [token, navigate]);

  const verifyToken = async () => {
    try {
      const response = await authApi.verifyInvitation(token);
      setRawResponse(response);
      setValid(Boolean((response as any).valid));
      if ((response as any).valid) {
        setEmail((response as any).email || '');
        setRole((response as any).role || '');
      }
    } catch (error: any) {
      console.error('verifyInvitation failed', error);
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setSubmitting(true);

    try {
      await authApi.acceptInvitation({ token, password });
      toast.success('Compte activé avec succès');
      navigate('/login');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d?.msg ?? d).join(', ')
            : detail?.msg
              ? String(detail.msg)
              : 'Erreur lors de l\'activation';

      toast.error(msg);
    } finally {

      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Vérification du token...</div>
      </div>
    );
  }

  if (!valid) {
    const tokenPreview = token ? `${token.slice(0, 6)}…${token.slice(-6)}` : '(vide)';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold text-destructive">Invitation invalide ou expirée</h1>
          <p className="text-sm text-muted-foreground break-all">Token: {tokenPreview}</p>
          <p className="text-sm text-muted-foreground">valid: {String(valid)}</p>
          <p className="text-sm text-muted-foreground break-all">raw: {rawResponse ? JSON.stringify(rawResponse) : '(null)'}</p>
          <p className="text-sm text-muted-foreground">email: {email || '(vide)'}</p>
          <p className="text-sm text-muted-foreground">role: {role || '(vide)'}</p>
          <Button onClick={() => navigate('/login')}>Retour à la connexion</Button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border border-border shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Activer mon compte</h1>
          <p className="text-muted-foreground">{email}</p>
          <p className="text-sm text-muted-foreground">Rôle: {role}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Activation...' : 'Activer mon compte'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
