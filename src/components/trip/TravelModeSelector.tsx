import { Plane, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TravelMode } from '@/lib/tripchat-types';

interface TravelModeSelectorProps {
  value: TravelMode | null;
  onChange: (mode: TravelMode) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function TravelModeSelector({
  value,
  onChange,
  disabled = false,
  size = 'md',
  className,
}: TravelModeSelectorProps) {
  const isSmall = size === 'sm';

  return (
    <div className={cn('flex gap-2', className)}>
      <button
        type="button"
        onClick={() => onChange('flying')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 rounded-lg border transition-all',
          isSmall ? 'px-3 py-1.5 text-sm' : 'px-4 py-2',
          value === 'flying'
            ? 'bg-primary text-white border-primary'
            : 'bg-card border-border hover:border-primary/50 text-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Plane className={cn(isSmall ? 'h-4 w-4' : 'h-5 w-5')} />
        <span className="font-medium">Flying</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('driving')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 rounded-lg border transition-all',
          isSmall ? 'px-3 py-1.5 text-sm' : 'px-4 py-2',
          value === 'driving'
            ? 'bg-primary text-white border-primary'
            : 'bg-card border-border hover:border-primary/50 text-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Car className={cn(isSmall ? 'h-4 w-4' : 'h-5 w-5')} />
        <span className="font-medium">Driving</span>
      </button>
    </div>
  );
}
