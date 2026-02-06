import { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Calendar,
  ExternalLink,
  DollarSign,
  Hotel,
  Ticket,
  Plane,
  CheckCircle2,
  MessageCircle,
  X,
} from 'lucide-react';
import { getSiteName } from '@/lib/url-utils';
import { searchUnsplash } from '@/lib/cover-image-resolver';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { VibeTag } from '@/components/ui/VibeTag';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ChatFeed } from '@/components/chat/ChatFeed';
import { ChatComposer } from '@/components/chat/ChatComposer';
import type { Trip, TripProposal, TripMember, Message } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES } from '@/lib/tripchat-types';
import { SFSymbol } from '@/components/icons';
import { PROPOSAL_TYPE_ICON_MAP } from '@/lib/icon-mappings';
import { cn } from '@/lib/utils';

interface TripReadyViewProps {
  trip: Trip;
  lockedDestination: TripProposal | null;
  includedProposals: TripProposal[];
  members: TripMember[];
  // Chat props (optional - for when chat is enabled)
  messages?: Message[];
  messagesLoading?: boolean;
  onSendMessage?: (message: string, replyToId?: string) => Promise<{ error: Error | null }>;
  tripId?: string;
  // Proposal interaction
  onViewProposal?: (proposal: TripProposal) => void;
}

export function TripReadyView({
  trip,
  lockedDestination,
  includedProposals,
  members,
  messages = [],
  messagesLoading = false,
  onSendMessage,
  tripId,
  onViewProposal,
}: TripReadyViewProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [showDesktopChat, setShowDesktopChat] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Resolve cover image - replace Mapbox URLs with real photos
  const [resolvedCoverUrl, setResolvedCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    const resolveCover = async () => {
      const url = lockedDestination?.cover_image_url;
      if (!url) {
        setResolvedCoverUrl(null);
        return;
      }

      // Check if it's a Mapbox URL that needs replacement
      if (url.includes('api.mapbox.com')) {
        const destinationName = lockedDestination?.name || lockedDestination?.destination;
        if (destinationName) {
          const result = await searchUnsplash(destinationName);
          if (result?.image_url) {
            setResolvedCoverUrl(result.image_url);
            return;
          }
        }
      }

      // Use existing URL if not Mapbox or no replacement found
      setResolvedCoverUrl(url);
    };

    resolveCover();
  }, [lockedDestination?.cover_image_url, lockedDestination?.name, lockedDestination?.destination]);

  // Check if chat is enabled
  const chatEnabled = !!onSendMessage && !!tripId;

  // Group included proposals by type (excluding destinations - shown in header)
  const groupedProposals = useMemo(() => {
    return includedProposals
      .filter(p => !p.is_destination)
      .reduce((acc, proposal) => {
        const type = proposal.type || 'housing';
        if (!acc[type]) acc[type] = [];
        acc[type].push(proposal);
        return acc;
      }, {} as Record<string, TripProposal[]>);
  }, [includedProposals]);

  // Calculate costs (excluding destinations)
  const activityCost = useMemo(() => {
    return includedProposals
      .filter((p) => p.type === 'activity' && !p.is_destination)
      .reduce((sum, p) => sum + (p.estimated_cost_per_person || 0), 0);
  }, [includedProposals]);

  const housingCost = useMemo(() => {
    return includedProposals
      .filter((p) => p.type === 'housing' && !p.is_destination)
      .reduce((sum, p) => sum + (p.estimated_cost_per_person || 0), 0);
  }, [includedProposals]);

  const transportCost = trip.flight_cost || 0;
  const totalCost = activityCost + housingCost + transportCost;

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'housing':
        return <Hotel className="h-4 w-4" />;
      case 'activity':
        return <Ticket className="h-4 w-4" />;
      default:
        return <Ticket className="h-4 w-4" />;
    }
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const displayName = lockedDestination?.name || lockedDestination?.destination || 'Your Trip';

  // Chat component for reuse
  const ChatSection = ({ className }: { className?: string }) => (
    <div className={cn('flex flex-col', className)}>
      <div className="flex-1 min-h-0">
        <ChatFeed
          messages={messages}
          loading={messagesLoading}
          tripId={tripId!}
          onViewProposal={() => {}}
          onReply={setReplyingTo}
          viewMode="chat"
          onViewModeChange={() => {}}
          tripPhase="ready"
          hideViewToggle
        />
      </div>
      <ChatComposer
        onSend={onSendMessage!}
        onPropose={() => {}}
        replyTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        tripPhase="ready"
      />
    </div>
  );

  // Summary content (reused in both layouts)
  const SummaryContent = () => (
    <div className="max-w-3xl mx-auto pb-8 lg:pb-0">
      {/* Destination Header */}
      <div className="h-56 relative bg-gradient-to-br from-primary/20 to-accent/20">
        {resolvedCoverUrl && (
          <img
            src={resolvedCoverUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="px-3 py-1.5 bg-vote-in/90 rounded-full text-white text-sm font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Trip Ready
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3 mb-2">
            <MapPin className="h-7 w-7" />
            {displayName}
          </h1>
          {lockedDestination?.vibe_tags && lockedDestination.vibe_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {lockedDestination.vibe_tags.map((vibe) => (
                <VibeTag key={vibe} vibe={vibe as any} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Trip Dates */}
        {(trip.date_start || trip.date_end) && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">
                  {formatDate(trip.date_start)}
                  {trip.date_end && trip.date_start !== trip.date_end && (
                    <> — {formatDate(trip.date_end)}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cost Summary Card */}
        {totalCost > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Cost Summary</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">
                  ${totalCost.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">per person</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 pt-3 border-t border-border">
              {activityCost > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Activities
                  </span>
                  <span className="font-medium">${activityCost.toLocaleString()}</span>
                </div>
              )}
              {housingCost > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Hotel className="h-4 w-4" />
                    Housing
                  </span>
                  <span className="font-medium">${housingCost.toLocaleString()}</span>
                </div>
              )}
              {transportCost > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Flights
                  </span>
                  <span className="font-medium">${transportCost.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Itinerary Sections by Category */}
        {Object.entries(groupedProposals).map(([type, proposals]) => {
          const typeInfo = PROPOSAL_TYPES.find((t) => t.value === type);
          return (
            <div key={type} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                {getCategoryIcon(type)}
                {typeInfo?.label || type} ({proposals.length})
              </h3>
              <div className="space-y-3">
                {proposals.map((proposal) => (
                  <button
                    key={proposal.id}
                    onClick={() => onViewProposal?.(proposal)}
                    className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:ring-2 hover:ring-primary/50 hover:border-primary/50"
                  >
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {proposal.cover_image_url ? (
                          <img
                            src={proposal.cover_image_url}
                            alt={proposal.name || proposal.destination}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            {type &&
                              PROPOSAL_TYPE_ICON_MAP[
                                type as keyof typeof PROPOSAL_TYPE_ICON_MAP
                              ] && (
                                <SFSymbol
                                  name={
                                    PROPOSAL_TYPE_ICON_MAP[
                                      type as keyof typeof PROPOSAL_TYPE_ICON_MAP
                                    ]
                                  }
                                  size="md"
                                />
                              )}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">
                              {proposal.name || proposal.destination}
                            </p>
                            {proposal.estimated_cost_per_person > 0 && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <DollarSign className="h-3 w-3" />
                                {proposal.estimated_cost_per_person.toLocaleString()}/person
                              </p>
                            )}
                          </div>

                          {/* Book button */}
                          {proposal.url && (
                            <a
                              href={proposal.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1.5 text-xs font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1 flex-shrink-0"
                            >
                              Book on {getSiteName(proposal.url)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {includedProposals.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No items in the itinerary.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex min-h-0">
      {/* Desktop: Resizable split view */}
      <div className="hidden lg:flex flex-1 min-h-0">
        {chatEnabled && showDesktopChat ? (
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="trip-ready-layout"
          >
            <ResizablePanel defaultSize={50} minSize={30}>
              <ScrollArea className="h-full">
                <SummaryContent />
              </ScrollArea>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="flex flex-col h-full bg-card">
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowDesktopChat(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <ChatSection className="flex-1 min-h-0" />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <ScrollArea className="flex-1">
            <SummaryContent />
          </ScrollArea>
        )}
      </div>

      {/* Mobile: Full-width summary */}
      <div className="lg:hidden flex-1 min-h-0">
        <ScrollArea className="h-full">
          <SummaryContent />
        </ScrollArea>
      </div>

      {/* Desktop: Show chat button when hidden */}
      {chatEnabled && !showDesktopChat && (
        <Button
          className="hidden lg:flex fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setShowDesktopChat(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile: Floating chat button + Sheet */}
      {chatEnabled && (
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetTrigger asChild>
            <Button
              className="lg:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat
              </SheetTitle>
            </SheetHeader>
            <ChatSection className="h-[calc(70vh-4rem)]" />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
