import { Link } from 'react-router-dom';
import { Crown, Users, Copy, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface TripWithDetails {
  id: string;
  name: string;
  status: 'planning' | 'decided';
  date_start: string | null;
  date_end: string | null;
  flexible_dates: boolean | null;
  member_count: number;
  cover_image_url: string | null;
  top_destination: string | null;
}

interface TripCardProps {
  trip: TripWithDetails;
  onCopyInvite: (e: React.MouseEvent, trip: TripWithDetails) => void;
  isCopied: boolean;
}

export function TripCard({ trip, onCopyInvite, isCopied }: TripCardProps) {
  // Generate initials from trip name
  const initials = trip.name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  // Format date string
  const dateString = (() => {
    if (trip.date_start || trip.date_end) {
      const start = trip.date_start ? format(new Date(trip.date_start), 'MMM d') : '';
      const end = trip.date_end ? format(new Date(trip.date_end), 'd') : '';
      if (start && end) return `${start} - ${end}`;
      return start || end;
    }
    if (trip.flexible_dates) return 'Flexible dates';
    return null;
  })();

  return (
    <Link to={`/app/trip/${trip.id}`}>
      <div className="group bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          {trip.cover_image_url ? (
            <img
              src={trip.cover_image_url}
              alt={trip.top_destination || trip.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
              {initials ? (
                <span className="text-3xl font-semibold text-primary/70">{initials}</span>
              ) : (
                <MessageCircle className="h-12 w-12 text-primary/50" />
              )}
            </div>
          )}

          {/* Gradient overlay for images */}
          {trip.cover_image_url && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          )}

          {/* Status badge */}
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              trip.status === 'decided'
                ? 'bg-vote-in text-white'
                : 'bg-white/90 backdrop-blur-sm text-primary'
            }`}>
              {trip.status === 'decided' && <Crown className="h-3 w-3" />}
              {trip.status === 'decided' ? 'Decided' : 'Planning'}
            </span>
          </div>

          {/* Copy invite button - appears on hover */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 h-8 w-8 bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            onClick={(e) => onCopyInvite(e, trip)}
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-vote-in" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {trip.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            {dateString && (
              <>
                <span>{dateString}</span>
                <span>·</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {trip.member_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
