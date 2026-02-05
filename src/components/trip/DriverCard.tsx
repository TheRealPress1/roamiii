import { Car, Plus, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, getDisplayName } from '@/lib/utils';
import type { TripMember } from '@/lib/tripchat-types';

interface DriverCardProps {
  driver: TripMember;
  passengers: TripMember[];
  currentUserId: string;
  onJoinCar: () => void;
  onLeaveCar: () => void;
  isJoining?: boolean;
  className?: string;
  readOnly?: boolean;
}

export function DriverCard({
  driver,
  passengers,
  currentUserId,
  onJoinCar,
  onLeaveCar,
  isJoining = false,
  className,
  readOnly = false,
}: DriverCardProps) {
  const driverName = getDisplayName(driver.profile, 'Driver');
  const capacity = driver.car_capacity || 4;
  const spotsLeft = capacity - passengers.length;
  const isCurrentUserDriver = driver.user_id === currentUserId;
  const isCurrentUserPassenger = passengers.some(p => p.user_id === currentUserId);

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      {/* Driver header */}
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
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Car className="h-3.5 w-3.5" />
              {capacity} {capacity === 1 ? 'seat' : 'seats'}
            </p>
          </div>
        </div>
        <div className={cn(
          'text-sm font-medium px-2 py-1 rounded-full',
          spotsLeft > 0
            ? 'bg-vote-in/10 text-vote-in'
            : 'bg-muted text-muted-foreground'
        )}>
          {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left` : 'Full'}
        </div>
      </div>

      {/* Passenger slots */}
      <div className="flex flex-wrap gap-2">
        {/* Filled seats */}
        {passengers.map((passenger) => {
          const passengerName = getDisplayName(passenger.profile, '?');
          const isCurrentUser = passenger.user_id === currentUserId;
          return (
            <div
              key={passenger.id}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted',
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
              {isCurrentUser && !readOnly && (
                <button
                  onClick={onLeaveCar}
                  className="ml-1 p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Empty seats / Join button */}
        {Array.from({ length: spotsLeft }).map((_, index) => {
          const isFirstEmpty = index === 0 && !isCurrentUserDriver && !isCurrentUserPassenger && !readOnly;
          return isFirstEmpty ? (
            <Button
              key={`empty-${index}`}
              variant="outline"
              size="sm"
              onClick={onJoinCar}
              disabled={isJoining}
              className="rounded-full border-dashed border-primary/50 text-primary hover:bg-primary/5"
            >
              <Plus className="h-4 w-4 mr-1" />
              Join
            </Button>
          ) : (
            <div
              key={`empty-${index}`}
              className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30"
            >
              <Plus className="h-4 w-4 text-muted-foreground/30" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
