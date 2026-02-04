import { useState } from 'react';
import { format } from 'date-fns';
import {
  MapPin,
  Calendar,
  ExternalLink,
  Check,
  Loader2,
  ChevronRight,
  Hotel,
  Ticket,
  Navigation,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VibeTag } from '@/components/ui/VibeTag';
import type { Trip, TripProposal } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES } from '@/lib/tripchat-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SFSymbol } from '@/components/icons';
import { PROPOSAL_TYPE_ICON_MAP } from '@/lib/icon-mappings';

interface FinalizeViewProps {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  lockedDestination: TripProposal | null;
  includedProposals: TripProposal[];
  isAdmin: boolean;
  onFinalized: () => void;
}

export function FinalizeView({
  open,
  onClose,
  trip,
  lockedDestination,
  includedProposals,
  isAdmin,
  onFinalized,
}: FinalizeViewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dateStart, setDateStart] = useState(trip.date_start || '');
  const [dateEnd, setDateEnd] = useState(trip.date_end || '');

  // Group included proposals by type
  const groupedProposals = includedProposals.reduce((acc, proposal) => {
    const type = proposal.type || 'housing';
    if (!acc[type]) acc[type] = [];
    acc[type].push(proposal);
    return acc;
  }, {} as Record<string, TripProposal[]>);

  // Collect all booking links
  const allBookingLinks = includedProposals.flatMap((p) => {
    const links: string[] = [];
    if (p.url) links.push(p.url);
    if (p.lodging_links) links.push(...p.lodging_links);
    return links;
  }).filter(Boolean);

  const handleMarkReady = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update trip with final dates and mark as ready
      const { error } = await supabase
        .from('trips')
        .update({
          date_start: dateStart || null,
          date_end: dateEnd || null,
          phase: 'ready',
          status: 'decided',
        })
        .eq('id', trip.id);

      if (error) throw error;

      // Post system message (plain text, icons rendered at display time)
      await supabase.from('messages').insert({
        trip_id: trip.id,
        user_id: user.id,
        type: 'system',
        body: `Trip is ready! ${lockedDestination?.name || lockedDestination?.destination || 'Destination'} is all planned!`,
      });

      // Notify members
      try {
        await supabase.rpc('notify_trip_members', {
          _trip_id: trip.id,
          _actor_id: user.id,
          _type: 'plan_locked',
          _title: 'Trip is ready!',
          _body: `The trip to ${lockedDestination?.name || lockedDestination?.destination || 'your destination'} is fully planned!`,
          _href: `/app/trip/${trip.id}`,
        });
      } catch (notifyError) {
        console.error('Error sending notifications:', notifyError);
      }

      toast.success('Trip marked as ready!');
      onFinalized();
      onClose();
    } catch (error: any) {
      console.error('Error marking trip ready:', error);
      toast.error(error.message || 'Failed to mark trip ready');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'housing':
        return <Hotel className="h-4 w-4" />;
      case 'activity':
        return <Ticket className="h-4 w-4" />;
      default:
        return <Navigation className="h-4 w-4" />;
    }
  };

  if (!lockedDestination) return null;

  const displayName = lockedDestination.name || lockedDestination.destination;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Destination Header */}
        <div className="aspect-[21/9] relative bg-gradient-to-br from-primary/20 to-accent/20">
          {lockedDestination.cover_image_url && (
            <img
              src={lockedDestination.cover_image_url}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-1 bg-vote-in/90 rounded-full text-white text-xs font-medium flex items-center gap-1">
                <Check className="h-3 w-3" />
                Destination Locked
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              {displayName}
            </h2>
            {lockedDestination.vibe_tags && lockedDestination.vibe_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {lockedDestination.vibe_tags.map((vibe) => (
                  <VibeTag key={vibe} vibe={vibe as any} size="sm" />
                ))}
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[55vh]">
          <div className="p-6 space-y-6">
            {/* Date Confirmation */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Trip Dates
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dateStart" className="text-xs">Start Date</Label>
                  <Input
                    id="dateStart"
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dateEnd" className="text-xs">End Date</Label>
                  <Input
                    id="dateEnd"
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    min={dateStart}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </div>

            {/* Included Items by Category */}
            {Object.entries(groupedProposals).map(([type, proposals]) => {
              const typeInfo = PROPOSAL_TYPES.find(t => t.value === type);
              return (
                <div key={type} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    {getCategoryIcon(type)}
                    {typeInfo?.label || type} ({proposals.length})
                  </h3>
                  <div className="space-y-2">
                    {proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {proposal.cover_image_url ? (
                            <img
                              src={proposal.cover_image_url}
                              alt={proposal.name || proposal.destination}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              {type && PROPOSAL_TYPE_ICON_MAP[type as keyof typeof PROPOSAL_TYPE_ICON_MAP] && (
                                <SFSymbol name={PROPOSAL_TYPE_ICON_MAP[type as keyof typeof PROPOSAL_TYPE_ICON_MAP]} size="md" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {proposal.name || proposal.destination}
                          </p>
                          {proposal.estimated_cost_per_person > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ${proposal.estimated_cost_per_person}/person
                            </p>
                          )}
                        </div>
                        {proposal.url && (
                          <a
                            href={proposal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {includedProposals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No items included in the itinerary yet.</p>
                <p className="text-sm mt-1">Go back and include some housing or activities!</p>
              </div>
            )}

            {/* Booking Links */}
            {allBookingLinks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Booking Links
                </h3>
                <div className="space-y-2">
                  {allBookingLinks.slice(0, 5).map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <ExternalLink className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="truncate flex-1 text-primary">{link}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </a>
                  ))}
                  {allBookingLinks.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{allBookingLinks.length - 5} more links
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Mark Ready Button */}
            {isAdmin && (
              <Button
                onClick={handleMarkReady}
                disabled={loading}
                className="w-full bg-vote-in hover:bg-vote-in/90 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Mark Trip Ready
                  </>
                )}
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
