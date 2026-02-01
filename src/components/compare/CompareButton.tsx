import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompareButtonProps {
  isComparing: boolean;
  onToggle: () => void;
}

export function CompareButton({ isComparing, onToggle }: CompareButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
        isComparing
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/80 hover:bg-muted text-muted-foreground'
      )}
    >
      {isComparing ? (
        <>
          <Check className="h-3 w-3" />
          Comparing
        </>
      ) : (
        <>
          <Plus className="h-3 w-3" />
          Compare
        </>
      )}
    </button>
  );
}
