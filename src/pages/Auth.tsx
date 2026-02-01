import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const { user, loading: authLoading, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      const pendingJoinCode = sessionStorage.getItem('pendingJoinCode');
      if (pendingJoinCode) {
        sessionStorage.removeItem('pendingJoinCode');
        navigate(`/join/${pendingJoinCode}`, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, authLoading, navigate, from]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
    // If successful, the page will redirect via OAuth flow
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email.trim());
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to send magic link');
      return;
    }

    setEmailSent(true);
    toast.success('Check your email for the magic link!');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-vote-in-bg mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-vote-in" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Check Your Email
            </h1>
            <p className="text-muted-foreground mb-6">
              We sent a magic link to <strong className="text-foreground">{email}</strong>. 
              Click the link in the email to sign in.
            </p>
            <Button 
              variant="outline" 
              onClick={() => { setEmailSent(false); setShowEmailForm(false); }}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign in options
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Sign in
            </h1>
            <p className="text-muted-foreground">
              One click with Google, or use email.
            </p>
          </div>

          {!showEmailForm ? (
            <div className="space-y-4">
              {/* Google OAuth - Primary */}
              <Button 
                onClick={handleGoogleSignIn}
                className="w-full gradient-primary text-white" 
                size="lg"
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <GoogleIcon className="h-5 w-5 mr-2" />
                    Continue with Google
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Email Magic Link - Secondary */}
              <Button 
                variant="outline"
                onClick={() => setShowEmailForm(true)}
                className="w-full" 
                size="lg"
              >
                <Mail className="h-5 w-5 mr-2" />
                Continue with Email
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4">
                We'll email you a secure sign-in link.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowEmailForm(false)}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full gradient-primary text-white" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending magic link...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                We'll email you a magic link for a password-free sign in.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
