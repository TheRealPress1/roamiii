import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileComplete } from '@/hooks/useProfileComplete';
import { Loader2 } from 'lucide-react';

interface ProfileGateProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that ensures users have a complete profile before accessing the app.
 * Redirects to /app/profile if profile is incomplete, preserving the intended destination.
 */
export function ProfileGate({ children }: ProfileGateProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isComplete, isLoading } = useProfileComplete();

  useEffect(() => {
    // Skip if still loading
    if (authLoading || isLoading) return;

    // Skip if no user (ProtectedRoute handles this)
    if (!user) return;

    // Skip if already on profile page
    if (location.pathname === '/app/profile') return;

    // Redirect to profile if incomplete
    if (!isComplete) {
      // Check for pending invite code
      const pendingInviteCode = localStorage.getItem('pending_invite_code');
      const nextPath = pendingInviteCode 
        ? `/invite/${pendingInviteCode}`
        : location.pathname + location.search;
      navigate(`/app/profile?next=${encodeURIComponent(nextPath)}`, { replace: true });
    }
  }, [authLoading, isLoading, isComplete, user, location.pathname, location.search, navigate]);

  // Show loading while checking
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If profile is incomplete and not on profile page, don't render children yet
  // (navigation will happen in useEffect)
  if (!isComplete && location.pathname !== '/app/profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
