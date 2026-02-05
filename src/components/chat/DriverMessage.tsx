import { Car, Plus, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Message, TripMember } from '@/lib/tripchat-types';

interface DriverMessageProps {
  message: Message;
  members: TripMember[];
  currentUserId: string;
  onJoinCar: (driverId: string) => void;
  onLeaveCar: () => void;
  isJoining?: boolean;
}

export function DriverMessage({
  message,
  members,
  currentUserId,
  onJoinCar,
  onLeaveCar,
  isJoining = false,
}: DriverMessageProps) {
  // Find the driver from the message's driver relation or from members list
  const driver = message.driver || members.find(m => m.id === message.driver_id);

  if (!driver) {
    return null;
  }

  const driverName = driver.profile?.name || driver.profile?.email?.split('@')[0] || 'Driver';
  const capacity = driver.car_capacity || 4;

  // Get passengers riding with this driver
  const passengers = members.filter(m => m.rides_with_id === driver.id);
  const spotsLeft = capacity - passengers.length;

  const isCurrentUserDriver = driver.user_id === currentUserId;
  const isCurrentUserPassenger = passengers.some(p => p.user_id === currentUserId);
  const canJoin = !isCurrentUserDriver && !isCurrentUserPassenger && spotsLeft > 0;

  return (
    <div className="px-4 py-2">
      <div className="max-w-md mx-auto">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 text-sm text-primary">
            <Car className="h-4 w-4" />
            <span className="font-medium">
              {isCurrentUserDriver ? "You're offering a ride!" : `${driverName} is offering a ride!`}
            </span>
          </div>

          {/* Driver info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={driver.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {driverName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">
                  {driverName}
                  {isCurrentUserDriver && <span className="text-muted-foreground font-normal"> (You)</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {capacity} {capacity === 1 ? 'seat' : 'seats'} available
                </p>
              </div>
            </div>
            <div className={cn(
              'text-sm font-medium px-2 py-1 rounded-full',
              spotsLeft > 0
                ? 'bg-vote-in/10 text-vote-in'
                : 'bg-muted text-muted-foreground'
            )}>
              {spotsLeft > 0 ? `${spotsLeft} left` : 'Full'}
            </div>
          </div>

          {/* Passenger slots */}
          <div className="flex flex-wrap gap-2">
            {/* Filled seats */}
            {passengers.map((passenger) => {
              const passengerName = passenger.profile?.name || passenger.profile?.email?.split('@')[0] || '?';
              const isCurrentUser = passenger.user_id === currentUserId;
              return (
                <div
                  key={passenger.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full bg-background',
                    isCurrentUser && 'ring-2 ring-primary/50'
                  )}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={passenger.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {passengerName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {passengerName}
                    {isCurrentUser && <span className="text-muted-foreground"> (You)</span>}
                  </span>
                  {isCurrentUser && (
                    <button
                      onClick={onLeaveCar}
                      disabled={isJoining}
                      className="ml-1 p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Empty seats / Join button */}
            {Array.from({ length: spotsLeft }).map((_, index) => {
              const showJoinButton = index === 0 && canJoin;
              return showJoinButton ? (
                <Button
                  key={`empty-${index}`}
                  variant="outline"
                  size="sm"
                  onClick={() => onJoinCar(driver.id)}
                  disabled={isJoining}
                  className="rounded-full border-dashed border-primary/50 text-primary hover:bg-primary/5 bg-background"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Join
                </Button>
              ) : (
                <div
                  key={`empty-${index}`}
                  className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 bg-background"
                >
                  <Plus className="h-4 w-4 text-muted-foreground/30" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
