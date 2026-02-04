import { useState } from 'react';
import { Plane, Car, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TripMember, TravelMode } from '@/lib/tripchat-types';
import { TravelModeSelector } from './TravelModeSelector';

interface MemberTravelCardProps {
  member: TripMember;
  tripTravelMode: TravelMode | null;
  isCurrentUser: boolean;
  drivers: TripMember[];
  onUpdateTravelMode: (mode: TravelMode) => void;
  onToggleDriver: (isDriver: boolean) => void;
  onUpdateCarCapacity: (capacity: number) => void;
  onSelectRide: (driverId: string | null) => void;
  isUpdating?: boolean;
  className?: string;
}

export function MemberTravelCard({
  member,
  tripTravelMode,
  isCurrentUser,
  drivers,
  onUpdateTravelMode,
  onToggleDriver,
  onUpdateCarCapacity,
  onSelectRide,
  isUpdating = false,
  className,
}: MemberTravelCardProps) {
  const memberName = member.profile?.name || member.profile?.email?.split('@')[0] || 'Member';
  const effectiveTravelMode = member.travel_mode || tripTravelMode;
  const isDriving = effectiveTravelMode === 'driving';
  const isDriver = member.is_driver;

  // Find the driver this member is riding with
  const ridingWithDriver = member.rides_with_id
    ? drivers.find(d => d.id === member.rides_with_id)
    : null;

  // Available drivers (excluding self if driving)
  const availableDrivers = drivers.filter(d => {
    if (d.user_id === member.user_id) return false;
    const passengerCount = 0; // This will be passed from parent
    return (d.car_capacity || 4) > passengerCount;
  });

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 transition-colors',
      isCurrentUser ? 'border-primary/30 bg-primary/5' : 'border-border',
      className
    )}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {memberName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-semibold text-foreground truncate">
              {memberName}
              {isCurrentUser && <span className="text-muted-foreground font-normal"> (You)</span>}
            </p>
            {/* Travel mode indicator */}
            {effectiveTravelMode && (
              <span className={cn(
                'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                effectiveTravelMode === 'flying'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              )}>
                {effectiveTravelMode === 'flying' ? (
                  <Plane className="h-3 w-3" />
                ) : (
                  <Car className="h-3 w-3" />
                )}
                {effectiveTravelMode === 'flying' ? 'Flying' : 'Driving'}
              </span>
            )}
          </div>

          {/* Controls for current user */}
          {isCurrentUser && (
            <div className="space-y-3">
              {/* Personal travel mode override */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Your travel:</p>
                <TravelModeSelector
                  value={member.travel_mode}
                  onChange={onUpdateTravelMode}
                  disabled={isUpdating}
                  size="sm"
                />
              </div>

              {/* Driving-specific controls */}
              {isDriving && (
                <div className="pt-2 border-t border-border space-y-3">
                  {/* Toggle to offer driving */}
                  <div className="flex items-center justify-between">
                    <label htmlFor="driver-toggle" className="text-sm font-medium cursor-pointer">
                      I'm driving
                    </label>
                    <Switch
                      id="driver-toggle"
                      checked={isDriver}
                      onCheckedChange={onToggleDriver}
                      disabled={isUpdating}
                    />
                  </div>

                  {/* Car capacity selector */}
                  {isDriver && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-muted-foreground">Passengers I can take:</label>
                      <Select
                        value={String(member.car_capacity || 4)}
                        onValueChange={(val) => onUpdateCarCapacity(parseInt(val))}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                            <SelectItem key={num} value={String(num)}>
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Ride selection for non-drivers */}
                  {!isDriver && availableDrivers.length > 0 && (
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1.5">
                        Ride with:
                      </label>
                      <Select
                        value={member.rides_with_id || 'none'}
                        onValueChange={(val) => onSelectRide(val === 'none' ? null : val)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a ride..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No ride selected</SelectItem>
                          {availableDrivers.map((driver) => {
                            const driverName = driver.profile?.name || driver.profile?.email?.split('@')[0] || 'Driver';
                            return (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driverName}'s car ({driver.car_capacity || 4} seats)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status for other members */}
          {!isCurrentUser && isDriving && (
            <div className="text-sm text-muted-foreground">
              {isDriver ? (
                <span className="flex items-center gap-1">
                  <Car className="h-3.5 w-3.5" />
                  Driving ({member.car_capacity || 4} seats)
                </span>
              ) : ridingWithDriver ? (
                <span>
                  Riding with {ridingWithDriver.profile?.name || ridingWithDriver.profile?.email?.split('@')[0]}
                </span>
              ) : (
                <span className="text-vote-maybe">Needs a ride</span>
              )}
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {isUpdating && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
