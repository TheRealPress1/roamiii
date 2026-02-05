import { useState, useMemo } from 'react';
import {
  MapPin,
  Calendar,
  Plus,
  Plane,
  Car,
  Share2,
  Loader2,
  DollarSign,
  Hotel,
  Ticket,
  ChevronRight,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateProposalModal } from '@/components/proposal/CreateProposalModal';
import { TravelModeSelector } from './TravelModeSelector';
import { FlightCostCard } from './FlightCostCard';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Trip, TripProposal, TripMember, TravelMode } from '@/lib/tripchat-types';

interface TripBuilderViewProps {
  trip: Trip;
  proposals: TripProposal[];
  members: TripMember[];
  isAdmin: boolean;
  onUpdated: () => void;
}

export function TripBuilderView({
  trip,
  proposals,
  members,
  isAdmin,
  onUpdated,
}: TripBuilderViewProps) {
  const { user } = useAuth();
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalType, setProposalType] = useState<'destination' | 'activity' | 'housing'>('destination');
  const [sharing, setSharing] = useState(false);
  const [dateStart, setDateStart] = useState(trip.date_start || '');
  const [dateEnd, setDateEnd] = useState(trip.date_end || '');
  const [savingDates, setSavingDates] = useState(false);

  // Group proposals
  const destinationProposal = useMemo(
    () => proposals.find((p) => p.is_destination) || null,
    [proposals]
  );
  const itineraryProposals = useMemo(
    () => proposals.filter((p) => !p.is_destination),
    [proposals]
  );
  const housingProposals = useMemo(
    () => itineraryProposals.filter((p) => p.type === 'housing'),
    [itineraryProposals]
  );
  const activityProposals = useMemo(
    () => itineraryProposals.filter((p) => p.type === 'activity'),
    [itineraryProposals]
  );

  // Calculate costs
  const activityCost = useMemo(
    () => activityProposals.reduce((sum, p) => sum + (p.estimated_cost_per_person || 0), 0),
    [activityProposals]
  );
  const housingCost = useMemo(
    () => housingProposals.reduce((sum, p) => sum + (p.estimated_cost_per_person || 0), 0),
    [housingProposals]
  );
  const transportCost = trip.flight_cost || 0;
  const totalCost = activityCost + housingCost + transportCost;

  // Flying member count for cost calculations
  const flyingMemberCount = useMemo(() => {
    return members.filter((m) => {
      const effectiveMode = m.travel_mode || trip.travel_mode;
      return effectiveMode === 'flying';
    }).length;
  }, [members, trip.travel_mode]);

  const handleOpenProposalModal = (type: 'destination' | 'activity' | 'housing') => {
    setProposalType(type);
    setProposalModalOpen(true);
  };

  const handleUpdateTravelMode = async (mode: TravelMode) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ travel_mode: mode })
        .eq('id', trip.id);

      if (error) throw error;
      onUpdated();
    } catch (err: any) {
      console.error('Error updating travel mode:', err);
      toast.error('Failed to update travel mode');
    }
  };

  const handleSaveDates = async () => {
    setSavingDates(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          date_start: dateStart || null,
          date_end: dateEnd || null,
        })
        .eq('id', trip.id);

      if (error) throw error;
      toast.success('Dates saved');
      onUpdated();
    } catch (err: any) {
      console.error('Error saving dates:', err);
      toast.error('Failed to save dates');
    } finally {
      setSavingDates(false);
    }
  };

  const handleShareTrip = async () => {
    // Validate: at least one destination
    if (!destinationProposal) {
      toast.error('Please add a destination before sharing');
      return;
    }

    setSharing(true);
    try {
      // Lock the destination and move to ready phase
      const { error } = await supabase
        .from('trips')
        .update({
          phase: 'ready',
          locked_destination_id: destinationProposal.id,
        })
        .eq('id', trip.id);

      if (error) throw error;

      // Mark all proposals as included
      const { error: proposalError } = await supabase
        .from('trip_proposals')
        .update({ included: true })
        .eq('trip_id', trip.id);

      if (proposalError) throw proposalError;

      // Post system message
      await supabase.from('messages').insert({
        trip_id: trip.id,
        user_id: user?.id,
        type: 'system',
        body: 'Trip is ready! The itinerary has been finalized.',
      });

      toast.success('Trip shared! Your group can now see the full itinerary.');
      onUpdated();
    } catch (err: any) {
      console.error('Error sharing trip:', err);
      toast.error('Failed to share trip');
    } finally {
      setSharing(false);
    }
  };

  // Non-owner sees waiting message
  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Trip is being planned</h2>
        <p className="text-muted-foreground max-w-sm">
          The trip organizer is building the itinerary. Check back soon to see the final plan!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-2xl mx-auto p-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Build Your Trip</h1>
          <p className="text-muted-foreground mt-1">
            Add your destination, activities, and travel details
          </p>
        </div>

        {/* Destination Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Destination
            </h2>
          </div>

          {destinationProposal ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {destinationProposal.cover_image_url ? (
                    <img
                      src={destinationProposal.cover_image_url}
                      alt={destinationProposal.destination}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <MapPin className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">
                    {destinationProposal.name || destinationProposal.destination}
                  </p>
                  {destinationProposal.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {destinationProposal.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-auto py-4"
              onClick={() => handleOpenProposalModal('destination')}
            >
              <Plus className="h-4 w-4" />
              Add destination
            </Button>
          )}
        </section>

        {/* Dates Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Dates
          </h2>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateStart">Start Date</Label>
                <Input
                  id="dateStart"
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateEnd">End Date</Label>
                <Input
                  id="dateEnd"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  min={dateStart}
                />
              </div>
            </div>
            {(dateStart !== (trip.date_start || '') || dateEnd !== (trip.date_end || '')) && (
              <Button
                size="sm"
                onClick={handleSaveDates}
                disabled={savingDates}
              >
                {savingDates ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save Dates'
                )}
              </Button>
            )}
          </div>
        </section>

        {/* Activities Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Activities ({activityProposals.length})
            </h2>
          </div>

          <div className="space-y-2">
            {activityProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleOpenProposalModal('activity')}
            >
              <Plus className="h-4 w-4" />
              Add activity
            </Button>
          </div>
        </section>

        {/* Housing Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Hotel className="h-4 w-4" />
              Housing ({housingProposals.length})
            </h2>
          </div>

          <div className="space-y-2">
            {housingProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleOpenProposalModal('housing')}
            >
              <Plus className="h-4 w-4" />
              Add housing
            </Button>
          </div>
        </section>

        {/* Transportation Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            {trip.travel_mode === 'flying' ? (
              <Plane className="h-4 w-4" />
            ) : (
              <Car className="h-4 w-4" />
            )}
            Transportation
          </h2>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="space-y-2">
              <Label>Travel Mode</Label>
              <TravelModeSelector
                value={trip.travel_mode}
                onChange={handleUpdateTravelMode}
              />
            </div>

            {trip.travel_mode === 'flying' && (
              <FlightCostCard
                trip={trip}
                flyingMemberCount={flyingMemberCount || members.length}
                onCostUpdated={onUpdated}
              />
            )}
          </div>
        </section>

        {/* Cost Summary */}
        {totalCost > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
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
          </section>
        )}

        {/* Share Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border md:relative md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <Button
            size="lg"
            className="w-full gradient-primary text-white"
            onClick={handleShareTrip}
            disabled={sharing || !destinationProposal}
          >
            {sharing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="h-5 w-5 mr-2" />
                Share Trip
              </>
            )}
          </Button>
          {!destinationProposal && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Add a destination to share your trip
            </p>
          )}
        </div>
      </div>

      {/* Proposal Modal */}
      <CreateProposalModal
        open={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        tripId={trip.id}
        onCreated={() => {
          setProposalModalOpen(false);
          onUpdated();
        }}
        memberCount={members.length}
        tripPhase={proposalType === 'destination' ? 'destination' : 'itinerary'}
      />
    </ScrollArea>
  );
}

// Simple proposal card for the builder view
function ProposalCard({ proposal }: { proposal: TripProposal }) {
  const TypeIcon = proposal.type === 'housing' ? Hotel : Ticket;

  return (
    <div className="rounded-xl border border-border bg-card p-3 flex gap-3">
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {proposal.cover_image_url ? (
          <img
            src={proposal.cover_image_url}
            alt={proposal.name || proposal.destination}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <TypeIcon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">
          {proposal.name || proposal.destination}
        </p>
        {proposal.estimated_cost_per_person > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {proposal.estimated_cost_per_person.toLocaleString()}/person
          </p>
        )}
      </div>
      {proposal.url && (
        <a
          href={proposal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
