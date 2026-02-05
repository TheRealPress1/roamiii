import { useState } from 'react';
import { X, Loader2, Calendar, DollarSign, Clock, MapPin, Lightbulb, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TripTemplate, TemplateCategory, ActivitySuggestion } from '@/lib/tripchat-types';
import { useTripTemplates } from '@/hooks/useTripTemplates';
import { TemplateCard } from './TemplateCard';
import { cn } from '@/lib/utils';

interface TemplateGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate: (template: TripTemplate, includeSuggestions: boolean) => void;
}

const categories: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'beach', label: 'Beach' },
  { value: 'city', label: 'City' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'culture', label: 'Culture' },
  { value: 'nature', label: 'Nature' },
  { value: 'romantic', label: 'Romantic' },
];

export function TemplateGalleryModal({
  open,
  onOpenChange,
  onApplyTemplate,
}: TemplateGalleryModalProps) {
  const { templates, loading, error } = useTripTemplates();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [includeSuggestions, setIncludeSuggestions] = useState(true);

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: TripTemplate) => {
    setSelectedTemplate(template);
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate, includeSuggestions);
      onOpenChange(false);
      setSelectedTemplate(null);
    }
  };

  const handleBack = () => {
    setSelectedTemplate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {selectedTemplate ? selectedTemplate.name : 'Trip Templates'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Preview mode */}
        {selectedTemplate ? (
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full max-h-[calc(85vh-140px)]">
              <div className="p-6 space-y-6">
                {/* Hero image */}
                <div className="relative h-48 rounded-xl overflow-hidden">
                  <img
                    src={selectedTemplate.cover_image_url}
                    alt={selectedTemplate.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <h2 className="text-2xl font-bold text-white">{selectedTemplate.destination}</h2>
                  </div>
                </div>

                {/* Quick info */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTemplate.duration_days} days</span>
                  </div>
                  {selectedTemplate.budget_estimate_per_person && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>~${selectedTemplate.budget_estimate_per_person}/person</span>
                    </div>
                  )}
                  {selectedTemplate.best_time_to_visit && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedTemplate.best_time_to_visit}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-muted-foreground">{selectedTemplate.description}</p>

                {/* Vibe tags */}
                {selectedTemplate.vibe_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.vibe_tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="capitalize">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Local tips */}
                {selectedTemplate.local_tips && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <span>Local Tips</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate.local_tips}
                    </p>
                  </div>
                )}

                {/* Suggested activities */}
                {selectedTemplate.suggested_activities.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Suggested Activities</h3>
                    <div className="space-y-3">
                      {selectedTemplate.suggested_activities.map((activity: ActivitySuggestion, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{activity.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>${activity.estimatedCost}/person</span>
                              <span>{activity.duration}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs">
                            {activity.category}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested housing */}
                {selectedTemplate.suggested_housing.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Recommended Stays</h3>
                    <div className="space-y-2">
                      {selectedTemplate.suggested_housing.map((housing: { name: string; url: string; price_per_night: number }, i: number) => (
                        <a
                          key={i}
                          href={housing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors"
                        >
                          <span className="font-medium text-sm">{housing.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ~${housing.price_per_night}/night
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-border p-4 flex items-center justify-between">
              <Button variant="ghost" onClick={handleBack}>
                Back to Gallery
              </Button>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeSuggestions}
                    onChange={(e) => setIncludeSuggestions(e.target.checked)}
                    className="rounded border-border"
                  />
                  Include activity suggestions
                </label>
                <Button onClick={handleApply}>
                  Use This Template
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Gallery mode */
          <div className="flex-1 overflow-hidden">
            {/* Category tabs */}
            <div className="px-6 pt-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                      selectedCategory === cat.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-full max-h-[calc(85vh-180px)]">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-48 text-destructive">
                  {error}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  No templates found
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onClick={handleSelectTemplate}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
