import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const { user, profile, signInWithGoogle, signIn, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const nextUrl = searchParams.get('next') || '/app';
  
  // Auth state
  const [authStep, setAuthStep] = useState<'auth' | 'profile'>('auth');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Profile state
  const [name, setName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // If user is logged in and has a complete profile, redirect
  useEffect(() => {
    if (!authLoading && user) {
      // Check if profile has a name - if so, they're fully onboarded
      if (profile?.name) {
        navigate(nextUrl, { replace: true });
      } else {
        // User exists but needs to complete profile
        setAuthStep('profile');
      }
    }
  }, [user, profile, authLoading, navigate, nextUrl]);

  const handleGoogleSignIn = async () => {
    // Store the next URL in session storage so we can use it after redirect
    sessionStorage.setItem('onboardingNext', nextUrl);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setEmailLoading(true);
    
    // Store the next URL in session storage
    sessionStorage.setItem('onboardingNext', nextUrl);
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding?next=${encodeURIComponent(nextUrl)}`,
      },
    });
    
    setEmailLoading(false);
    
    if (error) {
      toast({
        title: "Failed to send link",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEmailSent(true);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    
    setProfileLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', user.id);
    
    setProfileLoading(false);
    
    if (error) {
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Refresh the profile in context
      await refreshProfile();
      // Get the stored next URL or use the one from params
      const storedNext = sessionStorage.getItem('onboardingNext');
      sessionStorage.removeItem('onboardingNext');
      navigate(storedNext || nextUrl, { replace: true });
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
            Already have an account? Sign in
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
            {authStep === 'auth' ? (
              <>
                {/* Auth Step */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                    Create your profile
                  </h1>
                  <p className="text-muted-foreground">
                    So your friends know who's joining.
                  </p>
                </div>

                {emailSent ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                      <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Check your email</h2>
                    <p className="text-muted-foreground mb-4">
                      We sent a sign-in link to <strong>{email}</strong>
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => { setEmailSent(false); setEmail(''); }}
                    >
                      Use a different email
                    </Button>
                  </div>
                ) : showEmailForm ? (
                  <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-primary text-white"
                      disabled={emailLoading || !email}
                    >
                      {emailLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending link...
                        </>
                      ) : (
                        <>
                          Send sign-in link
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setShowEmailForm(false)}
                    >
                      Back to options
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* Google OAuth */}
                    <Button 
                      className="w-full h-12 text-base gradient-primary text-white shadow-lg hover:shadow-xl transition-all"
                      onClick={handleGoogleSignIn}
                    >
                      <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    {/* Email option */}
                    <Button 
                      variant="outline" 
                      className="w-full h-12 text-base"
                      onClick={() => setShowEmailForm(true)}
                    >
                      <Mail className="h-5 w-5 mr-3" />
                      Continue with Email
                    </Button>
                    
                    <p className="text-xs text-center text-muted-foreground">
                      We'll email you a secure sign-in link.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Profile Step */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                    Almost there!
                  </h1>
                  <p className="text-muted-foreground">
                    What should we call you?
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g. Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      This is how you'll appear to your trip crew.
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-white"
                    disabled={profileLoading || !name.trim()}
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
