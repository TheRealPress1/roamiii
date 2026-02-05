import { useAuth } from '@/contexts/AuthContext';

interface ProfileCompleteness {
  isComplete: boolean;
  isLoading: boolean;
  missingFields: string[];
}

/**
 * Hook to check if user's profile is complete enough to use the app.
 * Profile just needs to exist - phone and other fields are optional.
 */
export function useProfileComplete(): ProfileCompleteness {
  const { profile, loading } = useAuth();

  if (loading) {
    return { isComplete: true, isLoading: true, missingFields: [] };
  }

  if (!profile) {
    return { isComplete: false, isLoading: false, missingFields: ['profile'] };
  }

  // Profile exists - that's all we need
  return {
    isComplete: true,
    isLoading: false,
    missingFields: [],
  };
}
