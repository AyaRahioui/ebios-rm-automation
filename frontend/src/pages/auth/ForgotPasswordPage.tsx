import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authApi.forgotPassword({ email });
      setSubmitted(true);
      toast.success('Si un compte existe avec cet email, un lien de réinitialisation a été envoyé');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border border-border shadow-lg text-center">
          <h1 className="text-2xl font-bold text-foreground">Email envoyé</h1>
          <p className="text-muted-foreground">
            Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border border-border shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="text-muted-foreground">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full text-sm text-primary hover:underline"
          >
            Retour à la connexion
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
