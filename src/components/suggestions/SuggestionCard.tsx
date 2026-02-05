import { Clock, DollarSign, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ActivitySuggestion } from '@/lib/tripchat-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SuggestionCardProps {
  suggestion: ActivitySuggestion;
  onAdd: (suggestion: ActivitySuggestion) => void;
  index?: number;
}

const categoryIcons: Record<string, string> = {
  activity: '🎯',
  food: '🍽️',
  experience: '✨',
  nightlife: '🌙',
};

const categoryColors: Record<string, string> = {
  activity: 'bg-blue-500/10 text-blue-600',
  food: 'bg-orange-500/10 text-orange-600',
  experience: 'bg-purple-500/10 text-purple-600',
  nightlife: 'bg-pink-500/10 text-pink-600',
};

export function SuggestionCard({ suggestion, onAdd, index = 0 }: SuggestionCardProps) {
  const categoryLabel = suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{categoryIcons[suggestion.category] || '📍'}</span>
            <h4 className="font-semibold text-foreground truncate">{suggestion.name}</h4>
          </div>
          <Badge variant="secondary" className={cn('text-xs', categoryColors[suggestion.category])}>
            {categoryLabel}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdd(suggestion)}
          className="flex-shrink-0 gap-1 text-primary border-primary/30 hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
        {suggestion.description}
      </p>

      {/* Meta info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5" />
          <span>~${suggestion.estimatedCost}/person</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{suggestion.duration}</span>
        </div>
      </div>

      {/* Vibes */}
      {suggestion.vibes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {suggestion.vibes.slice(0, 3).map((vibe) => (
            <Badge key={vibe} variant="outline" className="text-xs">
              {vibe}
            </Badge>
          ))}
        </div>
      )}
    </motion.div>
  );
}
