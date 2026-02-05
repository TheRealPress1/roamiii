import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TripMember } from '@/lib/tripchat-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getDisplayName } from '@/lib/utils';

interface MentionAutocompleteProps {
  suggestions: TripMember[];
  selectedIndex: number;
  onSelect: (member: TripMember) => void;
  position?: { top: number; left: number };
  visible: boolean;
}

export function MentionAutocomplete({
  suggestions,
  selectedIndex,
  onSelect,
  position,
  visible,
}: MentionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (!containerRef.current || selectedIndex < 0) return;
    const selectedEl = containerRef.current.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className={cn(
          'absolute z-50 w-64 max-h-48 overflow-y-auto',
          'bg-popover border border-border rounded-lg shadow-lg',
          'py-1'
        )}
        style={position ? { top: position.top, left: position.left } : { bottom: '100%', left: 0 }}
      >
        {suggestions.map((member, index) => {
          const name = getDisplayName(member.profile);
          const email = member.profile?.email || '';
          const initials = name.slice(0, 2).toUpperCase();

          return (
            <button
              key={member.user_id}
              onClick={() => onSelect(member)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left',
                'hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
