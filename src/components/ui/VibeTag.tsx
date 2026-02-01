import { cn } from '@/lib/utils';
import { VIBE_TAGS } from '@/lib/supabase-types';

interface VibeTagProps {
  vibe: string;
  size?: 'sm' | 'md';
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const vibeColors: Record<string, string> = {
  party: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  chill: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  adventure: 'bg-orange-100 text-orange-700 border-orange-200',
  culture: 'bg-violet-100 text-violet-700 border-violet-200',
  nature: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  luxury: 'bg-amber-100 text-amber-700 border-amber-200',
  beach: 'bg-sky-100 text-sky-700 border-sky-200',
  city: 'bg-slate-100 text-slate-700 border-slate-200',
  food: 'bg-red-100 text-red-700 border-red-200',
  romantic: 'bg-pink-100 text-pink-700 border-pink-200',
};

export function VibeTag({ vibe, size = 'sm', interactive, selected, onClick }: VibeTagProps) {
  const vibeInfo = VIBE_TAGS.find(v => v.value === vibe);
  const colorClasses = vibeColors[vibe] || 'bg-gray-100 text-gray-700 border-gray-200';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full font-medium border transition-all',
        sizeClasses[size],
        colorClasses,
        interactive && 'cursor-pointer hover:shadow-sm',
        selected && 'ring-2 ring-offset-1 ring-primary'
      )}
    >
      {vibeInfo?.label || vibe}
    </span>
  );
}

export function VibeTagSelector({ 
  selected, 
  onChange,
  max = 5 
}: { 
  selected: string[]; 
  onChange: (vibes: string[]) => void;
  max?: number;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else if (selected.length < max) {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {VIBE_TAGS.map((vibe) => (
        <VibeTag
          key={vibe.value}
          vibe={vibe.value}
          size="md"
          interactive
          selected={selected.includes(vibe.value)}
          onClick={() => toggle(vibe.value)}
        />
      ))}
    </div>
  );
}
