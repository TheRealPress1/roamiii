import { useState } from 'react';
import { Check, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IncludeToggleProps {
  proposalId: string;
  included: boolean;
  onToggled?: (included: boolean) => void;
  variant?: 'button' | 'badge';
  className?: string;
}

export function IncludeToggle({
  proposalId,
  included,
  onToggled,
  variant = 'button',
  className,
}: IncludeToggleProps) {
  const [loading, setLoading] = useState(false);
  const [isIncluded, setIsIncluded] = useState(included);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const newValue = !isIncluded;

      const { error } = await supabase
        .from('trip_proposals')
        .update({ included: newValue })
        .eq('id', proposalId);

      if (error) throw error;

      setIsIncluded(newValue);
      onToggled?.(newValue);
      toast.success(newValue ? 'Added to itinerary' : 'Removed from itinerary');
    } catch (error: any) {
      console.error('Error toggling include:', error);
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'badge') {
    return (
      <Badge
        variant={isIncluded ? 'default' : 'secondary'}
        className={cn(
          'cursor-pointer transition-all',
          isIncluded
            ? 'bg-vote-in/10 text-vote-in border-vote-in/20 hover:bg-vote-in/20'
            : 'hover:bg-muted',
          className
        )}
        onClick={handleToggle}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isIncluded ? (
          <>
            <Check className="h-3 w-3 mr-1" />
            Included
          </>
        ) : (
          <>
            <Plus className="h-3 w-3 mr-1" />
            Add to plan
          </>
        )}
      </Badge>
    );
  }

  return (
    <Button
      variant={isIncluded ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        isIncluded
          ? 'bg-vote-in hover:bg-vote-in/90 text-white'
          : 'hover:bg-vote-in/10 hover:text-vote-in hover:border-vote-in/50',
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isIncluded ? (
        <>
          <Check className="h-4 w-4 mr-1.5" />
          Included in Plan
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-1.5" />
          Include in Plan
        </>
      )}
    </Button>
  );
}

// Read-only badge to show included status
export function IncludedBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'bg-vote-in/10 text-vote-in border-vote-in/20',
        className
      )}
    >
      <Check className="h-3 w-3 mr-1" />
      Included
    </Badge>
  );
}
