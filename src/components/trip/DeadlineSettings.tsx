import { useState } from 'react';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { Clock, Calendar, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Trip, TripPhase } from '@/lib/tripchat-types';

interface DeadlineSettingsProps {
  trip: Trip;
  onUpdated: () => void;
}

export function DeadlineSettings({ trip, onUpdated }: DeadlineSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('18:00');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const currentPhase = trip.phase || 'destination';

  // Get current deadline based on phase
  const currentDeadline = currentPhase === 'destination'
    ? trip.destination_voting_deadline
    : trip.itinerary_voting_deadline;

  const deadlineField = currentPhase === 'destination'
    ? 'destination_voting_deadline'
    : 'itinerary_voting_deadline';

  const phaseLabel = currentPhase === 'destination' ? 'Destination' : 'Itinerary';

  const handleSetDeadline = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const deadline = new Date(selectedDate);
      deadline.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('trips')
        .update({ [deadlineField]: deadline.toISOString() })
        .eq('id', trip.id);

      if (error) throw error;

      toast.success(`${phaseLabel} voting deadline set!`);
      setSelectedDate(undefined);
      setCalendarOpen(false);
      onUpdated();
    } catch (error: any) {
      console.error('Error setting deadline:', error);
      toast.error('Failed to set deadline');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDeadline = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ [deadlineField]: null })
        .eq('id', trip.id);

      if (error) throw error;

      toast.success('Deadline cleared');
      onUpdated();
    } catch (error: any) {
      console.error('Error clearing deadline:', error);
      toast.error('Failed to clear deadline');
    } finally {
      setLoading(false);
    }
  };

  // Quick deadline options
  const quickOptions = [
    { label: 'Tomorrow', days: 1 },
    { label: 'In 3 days', days: 3 },
    { label: 'In a week', days: 7 },
  ];

  const handleQuickSet = async (days: number) => {
    setLoading(true);
    try {
      const deadline = addDays(new Date(), days);
      deadline.setHours(18, 0, 0, 0); // Default to 6 PM

      const { error } = await supabase
        .from('trips')
        .update({ [deadlineField]: deadline.toISOString() })
        .eq('id', trip.id);

      if (error) throw error;

      toast.success(`${phaseLabel} voting deadline set!`);
      onUpdated();
    } catch (error: any) {
      console.error('Error setting deadline:', error);
      toast.error('Failed to set deadline');
    } finally {
      setLoading(false);
    }
  };

  // Don't show for phases past itinerary
  if (currentPhase !== 'destination' && currentPhase !== 'itinerary') {
    return null;
  }

  // Don't show if destination is already locked and we're showing destination deadline
  if (currentPhase !== 'destination' && deadlineField === 'destination_voting_deadline' && trip.locked_destination_id) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>Voting Deadline</span>
      </div>

      {currentDeadline ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 p-2 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">
              {format(new Date(currentDeadline), 'MMM d, h:mm a')}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(currentDeadline) > new Date()
                ? `Ends ${formatDistanceToNow(new Date(currentDeadline), { addSuffix: true })}`
                : 'Deadline passed'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearDeadline}
            disabled={loading}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Quick options */}
          <div className="flex gap-1">
            {quickOptions.map(opt => (
              <Button
                key={opt.days}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSet(opt.days)}
                disabled={loading}
                className="flex-1 text-xs h-7"
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Custom date picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs justify-start"
              >
                <Calendar className="h-3.5 w-3.5 mr-2" />
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Pick custom date...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
              {selectedDate && (
                <div className="p-3 border-t space-y-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="time" className="text-xs">Time:</Label>
                    <Input
                      id="time"
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleSetDeadline}
                    disabled={loading}
                    size="sm"
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Set Deadline
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
