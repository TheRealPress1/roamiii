import { useAuth } from '@/contexts/AuthContext';

interface ProfileCompleteness {
  isComplete: boolean;
  isLoading: boolean;
  missingFields: string[];
}

/**
 * Hook to check if user's profile is complete enough to use the app.
 * Required: phone number
 * Optional: avatar, tagline
 */
export function useProfileComplete(): ProfileCompleteness {
  const { profile, loading } = useAuth();

  if (loading) {
    return { isComplete: true, isLoading: true, missingFields: [] };
  }

  if (!profile) {
    return { isComplete: false, isLoading: false, missingFields: ['profile'] };
  }

  const missingFields: string[] = [];

  // Check required fields - phone is required per spec
  if (!profile.phone || profile.phone.trim() === '') {
    missingFields.push('phone');
  }

  return {
    isComplete: missingFields.length === 0,
    isLoading: false,
    missingFields,
  };
}
