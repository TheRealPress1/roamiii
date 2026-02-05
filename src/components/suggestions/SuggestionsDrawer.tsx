import { useEffect } from 'react';
import { X, Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActivitySuggestion, Trip, TripProposal } from '@/lib/tripchat-types';
import { useSuggestions } from '@/hooks/useSuggestions';
import { SuggestionCard } from './SuggestionCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SuggestionsDrawerProps {
  open: boolean;
  onClose: () => void;
  trip: Trip | null;
  lockedDestination: TripProposal | null;
  includedProposals: TripProposal[];
  memberCount: number;
  onAddSuggestion: (suggestion: ActivitySuggestion) => void;
}

export function SuggestionsDrawer({
  open,
  onClose,
  trip,
  lockedDestination,
  includedProposals,
  memberCount,
  onAddSuggestion,
}: SuggestionsDrawerProps) {
  const {
    suggestions,
    loading,
    error,
    fetchSuggestions,
    clearCache,
  } = useSuggestions(trip, lockedDestination, includedProposals, memberCount);

  // Fetch suggestions when drawer opens
  useEffect(() => {
    if (open && suggestions.length === 0 && !loading && !error) {
      fetchSuggestions();
    }
  }, [open, suggestions.length, loading, error, fetchSuggestions]);

  const handleRefresh = () => {
    clearCache();
    fetchSuggestions();
  };

  const handleAdd = (suggestion: ActivitySuggestion) => {
    onAddSuggestion(suggestion);
    // Optionally close drawer or stay open for more selections
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50',
              'w-full sm:w-[420px] max-w-full',
              'bg-background border-l border-border shadow-xl',
              'flex flex-col'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">AI Suggestions</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="h-8 w-8"
                  title="Refresh suggestions"
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Destination info */}
            {lockedDestination && (
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <p className="text-sm text-muted-foreground">
                  Suggestions for <span className="font-medium text-foreground">{lockedDestination.destination}</span>
                </p>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Getting AI suggestions...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                  <p className="text-sm text-destructive text-center">{error}</p>
                  <Button variant="outline" onClick={handleRefresh}>
                    Try Again
                  </Button>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
                  <Sparkles className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    No suggestions yet. Click refresh to get AI-powered activity ideas.
                  </p>
                  <Button variant="outline" onClick={fetchSuggestions}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Get Suggestions
                  </Button>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <SuggestionCard
                      key={`${suggestion.name}-${index}`}
                      suggestion={suggestion}
                      onAdd={handleAdd}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            {suggestions.length > 0 && (
              <div className="px-4 py-3 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">
                  Click "Add" to create a proposal from a suggestion
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
