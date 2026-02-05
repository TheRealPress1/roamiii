import { useState, useMemo } from 'react';
import { Plane, Car, ArrowRight, Loader2, Users, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Trip, TripMember, TravelMode } from '@/lib/tripchat-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TravelModeSelector } from './TravelModeSelector';
import { DriverCard } from './DriverCard';
import { FlightCostCard } from './FlightCostCard';

interface TransportationViewProps {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  members: TripMember[];
  isAdmin: boolean;
  onUpdated: () => void;
  onSendDriverMessage?: (driverId: string, driverName: string) => void;
}

export function TransportationView({
  open,
  onClose,
  trip,
  members,
  isAdmin,
  onUpdated,
  onSendDriverMessage,
}: TransportationViewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);

  const currentMember = members.find((m) => m.user_id === user?.id);
  const tripTravelMode = trip.travel_mode;

  // Group members by travel status
  const { drivers, passengers, flying, needsRide } = useMemo(() => {
    const flying: TripMember[] = [];
    const drivers: TripMember[] = [];
    const passengers: TripMember[] = [];
    const needsRide: TripMember[] = [];

    members.forEach((member) => {
      const effectiveMode = member.travel_mode || tripTravelMode;

      if (effectiveMode === 'flying') {
        flying.push(member);
      } else if (effectiveMode === 'driving') {
        if (member.is_driver) {
          drivers.push(member);
        } else if (member.rides_with_id) {
          passengers.push(member);
        } else {
          needsRide.push(member);
        }
      } else {
        // No mode set - show as needing assignment
        needsRide.push(member);
      }
    });

    return { drivers, passengers, flying, needsRide };
  }, [members, tripTravelMode]);

  // Get passengers for a specific driver
  const getPassengersForDriver = (driverId: string) => {
    return members.filter((m) => m.rides_with_id === driverId);
  };

  // Update trip travel mode (admin only)
  const handleUpdateTripMode = async (mode: TravelMode) => {
    if (!user || !isAdmin) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ travel_mode: mode })
        .eq('id', trip.id);

      if (error) throw error;

      await supabase.from('messages').insert({
        trip_id: trip.id,
        user_id: user.id,
        type: 'system',
        body: `Trip travel mode set to: ${mode === 'flying' ? 'Flying' : 'Driving'}`,
      });

      toast.success(`Travel mode set to ${mode}`);
      onUpdated();
    } catch (error: any) {
      console.error('Error updating trip mode:', error);
      toast.error(error.message || 'Failed to update travel mode');
    } finally {
      setLoading(false);
    }
  };

  // Update member travel mode
  const handleUpdateMemberMode = async (mode: TravelMode) => {
    if (!user || !currentMember) return;

    setUpdatingMember(currentMember.id);
    try {
      const updates: Record<string, any> = { travel_mode: mode };

      // Clear driver/passenger state if switching to flying
      if (mode === 'flying') {
        updates.is_driver = false;
        updates.car_capacity = null;
        updates.rides_with_id = null;
      }

      const { error } = await supabase
        .from('trip_members')
        .update(updates)
        .eq('id', currentMember.id);

      if (error) throw error;
      onUpdated();
    } catch (error: any) {
      console.error('Error updating member mode:', error);
      toast.error(error.message || 'Failed to update travel mode');
    } finally {
      setUpdatingMember(null);
    }
  };

  // Toggle driver status
  const handleToggleDriver = async (isDriver: boolean) => {
    if (!user || !currentMember) return;

    setUpdatingMember(currentMember.id);
    try {
      const updates: Record<string, any> = {
        is_driver: isDriver,
        car_capacity: isDriver ? 4 : null,
        rides_with_id: isDriver ? null : currentMember.rides_with_id,
      };

      const { error } = await supabase
        .from('trip_members')
        .update(updates)
        .eq('id', currentMember.id);

      if (error) throw error;
      toast.success(isDriver ? 'You are now offering to drive!' : 'Removed driver status');

      // Send driver announcement to chat when becoming a driver
      if (isDriver && onSendDriverMessage) {
        const driverName = currentMember.profile?.name || currentMember.profile?.email?.split('@')[0] || 'Driver';
        onSendDriverMessage(currentMember.id, driverName);
      }

      onUpdated();
    } catch (error: any) {
      console.error('Error toggling driver:', error);
      toast.error(error.message || 'Failed to update driver status');
    } finally {
      setUpdatingMember(null);
    }
  };

  // Update car capacity
  const handleUpdateCapacity = async (capacity: number) => {
    if (!user || !currentMember) return;

    setUpdatingMember(currentMember.id);
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ car_capacity: capacity })
        .eq('id', currentMember.id);

      if (error) throw error;
      onUpdated();
    } catch (error: any) {
      console.error('Error updating capacity:', error);
      toast.error(error.message || 'Failed to update capacity');
    } finally {
      setUpdatingMember(null);
    }
  };

  // Join a car
  const handleJoinCar = async (driverId: string) => {
    if (!user || !currentMember) return;

    setUpdatingMember(currentMember.id);
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ rides_with_id: driverId, is_driver: false })
        .eq('id', currentMember.id);

      if (error) throw error;
      toast.success('Joined car!');
      onUpdated();
    } catch (error: any) {
      console.error('Error joining car:', error);
      toast.error(error.message || 'Failed to join car');
    } finally {
      setUpdatingMember(null);
    }
  };

  // Leave a car
  const handleLeaveCar = async () => {
    if (!user || !currentMember) return;

    setUpdatingMember(currentMember.id);
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ rides_with_id: null })
        .eq('id', currentMember.id);

      if (error) throw error;
      toast.success('Left car');
      onUpdated();
    } catch (error: any) {
      console.error('Error leaving car:', error);
      toast.error(error.message || 'Failed to leave car');
    } finally {
      setUpdatingMember(null);
    }
  };

  // Advance to finalize phase
  const handleContinue = async () => {
    if (!user || !isAdmin) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ phase: 'finalize' })
        .eq('id', trip.id);

      if (error) throw error;

      await supabase.from('messages').insert({
        trip_id: trip.id,
        user_id: user.id,
        type: 'system',
        body: 'Trip moved to: Finalize & Book',
      });

      toast.success('Moving to finalize!');
      onUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error advancing phase:', error);
      toast.error(error.message || 'Failed to advance phase');
    } finally {
      setLoading(false);
    }
  };

  const effectiveMode = currentMember?.travel_mode || tripTravelMode;
  const isDrivingMode = effectiveMode === 'driving';
  const isFlying = effectiveMode === 'flying';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {tripTravelMode === 'flying' ? (
              <Plane className="h-6 w-6 text-primary" />
            ) : (
              <Car className="h-6 w-6 text-primary" />
            )}
            How is everyone getting there?
          </DialogTitle>
          <DialogDescription>
            Set the travel mode and coordinate carpools if driving.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="p-6 space-y-6">
            {/* Trip Default Mode (Admin Only) */}
            {isAdmin && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Trip Default
                </h3>
                <TravelModeSelector
                  value={tripTravelMode}
                  onChange={handleUpdateTripMode}
                  disabled={loading}
                />
              </div>
            )}

            {/* Driving Mode: Carpool Roster */}
            {(tripTravelMode === 'driving' || drivers.length > 0) && (
              <>
                {/* Drivers Section */}
                {drivers.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Drivers ({drivers.length})
                    </h3>
                    <div className="space-y-3">
                      {drivers.map((driver) => (
                        <DriverCard
                          key={driver.id}
                          driver={driver}
                          passengers={getPassengersForDriver(driver.id)}
                          currentUserId={user?.id || ''}
                          onJoinCar={() => handleJoinCar(driver.id)}
                          onLeaveCar={handleLeaveCar}
                          isJoining={updatingMember === currentMember?.id}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Members Needing a Ride */}
                {needsRide.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-vote-maybe uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Still Need a Ride ({needsRide.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {needsRide.map((member) => {
                        const name = member.profile?.name || member.profile?.email?.split('@')[0] || '?';
                        const isCurrentUser = member.user_id === user?.id;
                        return (
                          <div
                            key={member.id}
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 rounded-full bg-vote-maybe/10 border border-vote-maybe/20',
                              isCurrentUser && 'ring-2 ring-primary/50'
                            )}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.profile?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-vote-maybe/20 text-vote-maybe">
                                {name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-vote-maybe">
                              {name}
                              {isCurrentUser && ' (You)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Flying Mode: Cards with costs */}
            {tripTravelMode === 'flying' && flying.length > 0 && (
              <div className="space-y-3">
                {/* Header with totals */}
                {(() => {
                  const totalFlightCost = flying.reduce((sum, m) => sum + (m.flight_cost || 0), 0);
                  const membersWithCost = flying.filter(m => m.flight_cost && m.flight_cost > 0).length;
                  const avgFlightCost = membersWithCost > 0 ? totalFlightCost / membersWithCost : 0;

                  return (
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        Flying ({flying.length})
                      </h3>
                      {totalFlightCost > 0 && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            Total: ${totalFlightCost.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ~${Math.round(avgFlightCost).toLocaleString()}/person
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Flight cost cards */}
                <div className="space-y-2">
                  {flying.map((member) => (
                    <FlightCostCard
                      key={member.id}
                      member={member}
                      isCurrentUser={member.user_id === user?.id}
                      onCostUpdated={onUpdated}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Current User Controls */}
            {currentMember && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">Your Travel</h3>

                {/* Personal Mode Override */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Your travel mode:</p>
                  <TravelModeSelector
                    value={currentMember.travel_mode}
                    onChange={handleUpdateMemberMode}
                    disabled={!!updatingMember}
                    size="sm"
                  />
                </div>

                {/* Driver Controls (if driving) */}
                {isDrivingMode && (
                  <div className="space-y-3">
                    {!currentMember.is_driver && !currentMember.rides_with_id && (
                      <Button
                        variant="outline"
                        onClick={() => handleToggleDriver(true)}
                        disabled={!!updatingMember}
                        className="w-full"
                      >
                        <Car className="h-4 w-4 mr-2" />
                        I'm driving - offer a ride
                      </Button>
                    )}

                    {currentMember.is_driver && (
                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">You're driving!</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleDriver(false)}
                            disabled={!!updatingMember}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-muted-foreground">Seats available:</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                              <button
                                key={num}
                                onClick={() => handleUpdateCapacity(num)}
                                disabled={!!updatingMember}
                                className={cn(
                                  'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                                  currentMember.car_capacity === num
                                    ? 'bg-primary text-white'
                                    : 'bg-muted hover:bg-muted/80 text-foreground'
                                )}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Continue Button (Admin Only) */}
            {isAdmin && (
              <Button
                onClick={handleContinue}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Moving to Finalize...
                  </>
                ) : (
                  <>
                    Continue to Finalize
                    <ArrowRight className="h-4 w-4 ml-2" />
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
