import { Calendar, DollarSign, Users } from 'lucide-react';
import type { TripTemplate } from '@/lib/tripchat-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  template: TripTemplate;
  onClick: (template: TripTemplate) => void;
}

const categoryColors: Record<string, string> = {
  beach: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  city: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  adventure: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  culture: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  nature: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  romantic: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
};

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={() => onClick(template)}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card',
        'hover:shadow-lg hover:border-primary/30 transition-all duration-200',
        'text-left w-full'
      )}
    >
      {/* Cover Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={template.cover_image_url}
          alt={template.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Featured badge */}
        {template.is_featured && (
          <Badge className="absolute top-2 left-2 bg-amber-500 text-white border-0">
            Featured
          </Badge>
        )}

        {/* Category badge */}
        {template.category && (
          <Badge
            variant="outline"
            className={cn(
              'absolute top-2 right-2 capitalize border',
              categoryColors[template.category] || 'bg-muted text-muted-foreground'
            )}
          >
            {template.category}
          </Badge>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white text-lg">{template.name}</h3>
          <p className="text-white/80 text-sm">{template.destination}</p>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{template.duration_days} days</span>
          </div>
          {template.budget_estimate_per_person && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span>~${template.budget_estimate_per_person}/person</span>
            </div>
          )}
        </div>

        {/* Vibe tags */}
        {template.vibe_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {template.vibe_tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
