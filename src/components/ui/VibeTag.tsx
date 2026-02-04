import { cn } from '@/lib/utils';
import { VIBE_TAGS } from '@/lib/supabase-types';
import { SFSymbol } from '@/components/icons';
import { VIBE_ICON_MAP } from '@/lib/icon-mappings';

interface VibeTagProps {
  vibe: string;
  size?: 'sm' | 'md';
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const vibeColors: Record<string, string> = {
  party: 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-transparent shadow-sm',
  chill: 'bg-gradient-to-r from-cyan-400 to-teal-400 text-white border-transparent shadow-sm',
  adventure: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-sm',
  culture: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow-sm',
  nature: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-transparent shadow-sm',
  luxury: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white border-transparent shadow-sm',
  beach: 'bg-gradient-to-r from-sky-400 to-blue-500 text-white border-transparent shadow-sm',
  city: 'bg-gradient-to-r from-slate-500 to-gray-600 text-white border-transparent shadow-sm',
  food: 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-transparent shadow-sm',
  romantic: 'bg-gradient-to-r from-pink-500 to-rose-400 text-white border-transparent shadow-sm',
};

export function VibeTag({ vibe, size = 'sm', interactive, selected, onClick }: VibeTagProps) {
  const vibeInfo = VIBE_TAGS.find(v => v.value === vibe);
  const colorClasses = vibeColors[vibe] || 'bg-gray-100 text-gray-700 border-gray-200';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const iconName = VIBE_ICON_MAP[vibe];

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border transition-all',
        sizeClasses[size],
        colorClasses,
        interactive && 'cursor-pointer hover:shadow-sm',
        selected && 'ring-2 ring-offset-1 ring-primary'
      )}
    >
      {iconName && <SFSymbol name={iconName} size="xs" className="opacity-90 invert" />}
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
