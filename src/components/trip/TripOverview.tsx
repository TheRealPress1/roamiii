import { useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  MapPin,
  Users,
  Copy,
  Check,
  Pencil,
  Share2,
  Home,
  Plane,
  Compass,
  DollarSign,
  ExternalLink,
  Plus,
  Ship,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Trip, TripProposal, TripMember } from '@/lib/tripchat-types';

interface TripOverviewProps {
  trip: Trip;
  proposals: TripProposal[];
  members: TripMember[];
  isAdmin: boolean;
  onUpdated: () => void;
}

export function TripOverview({
  trip,
  proposals,
  members,
  isAdmin,
  onUpdated,
}: TripOverviewProps) {
  const { user } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<'in' | 'maybe' | 'out' | null>(null);

  const coverUrl = trip.cover_image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=450&fit=crop';
  const hostMember = members.find((m) => m.role === 'owner');
  const hostProfile = hostMember?.profile;
  const inviteLink = `${window.location.origin}/join/${trip.join_code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: trip.name,
          text: `Join my trip: ${trip.name}`,
          url: inviteLink,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr + 'T00:00:00'), 'EEEE, MMM d');
  };

  const getBookingIcon = (type: string) => {
    if (type === 'housing') return Home;
    return Compass;
  };

  const goingCount = rsvpStatus === 'in' ? 1 : 0;
  const maybeCount = rsvpStatus === 'maybe' ? 1 : 0;

  return (
    <div className="flex-1 overflow-y-auto relative">
      {/* Themed background */}
      <div
        className="create-bg"
        style={{ backgroundImage: `url(${coverUrl})` }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Main card */}
        <div className="create-card p-6 sm:p-8 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-8">
            {/* Left column — Trip details */}
            <div className="space-y-5">
              {/* Trip name */}
              <h1 className="title-input title-classic" style={{ cursor: 'default' }}>
                {trip.name}
              </h1>

              {/* Date */}
              {trip.date_start && (
                <div className="space-y-0.5">
                  <p className="text-lg font-medium text-foreground">
                    {formatDate(trip.date_start)}
                  </p>
                  {trip.date_end && trip.date_end !== trip.date_start && (
                    <p className="text-sm text-muted-foreground">
                      to {formatDate(trip.date_end)}
                    </p>
                  )}
                  {trip.flexible_dates && (
                    <p className="text-xs text-muted-foreground">(Dates are flexible)</p>
                  )}
                </div>
              )}

              {/* Action icons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] transition-colors"
                  title="Copy invite link"
                >
                  {copiedLink ? (
                    <Check className="h-4 w-4 text-vote-in" />
                  ) : (
                    <Copy className="h-4 w-4 text-foreground" />
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="p-2.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] transition-colors"
                  title="Share trip"
                >
                  <Share2 className="h-4 w-4 text-foreground" />
                </button>
              </div>

              {/* Hosted by */}
              {hostProfile && (
                <div className="flex items-center gap-3 py-2">
                  <span className="text-sm text-muted-foreground">Hosted by</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={hostProfile.avatar_url || ''} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {hostProfile.name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">
                      {hostProfile.name || 'Host'}
                    </span>
                  </div>
                </div>
              )}

              {/* Location */}
              {trip.home_city && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{trip.home_city}</p>
                  </div>
                </div>
              )}

              {/* Members / Guest List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Guest List
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                      {goingCount > 0 && ` \u00b7 ${goingCount} Going`}
                      {maybeCount > 0 && ` \u00b7 ${maybeCount} Maybe`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={handleShare}
                  >
                    Invite
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {members.map((member) => (
                    <div key={member.id} className="flex flex-col items-center gap-1">
                      <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                        <AvatarImage src={member.profile?.avatar_url || ''} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-medium">
                          {member.profile?.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground max-w-[48px] truncate">
                        {member.profile?.name?.split(' ')[0] || 'Guest'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column — Cover image + RSVP */}
            <div className="space-y-4">
              {/* Cover image */}
              <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-muted">
                <img
                  src={coverUrl}
                  alt={trip.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* RSVP buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRsvpStatus(rsvpStatus === 'in' ? null : 'in')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all',
                    'bg-gradient-to-br border',
                    rsvpStatus === 'in'
                      ? 'from-vote-in/20 to-vote-in/5 border-vote-in/30 shadow-md'
                      : 'from-white/60 to-white/30 border-white/40 hover:from-vote-in/10 hover:to-vote-in/5'
                  )}
                >
                  <span className="text-3xl">&#x1F44D;</span>
                  <span className={cn(
                    'text-xs font-semibold',
                    rsvpStatus === 'in' ? 'text-vote-in' : 'text-foreground'
                  )}>
                    Going
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRsvpStatus(rsvpStatus === 'maybe' ? null : 'maybe')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all',
                    'bg-gradient-to-br border',
                    rsvpStatus === 'maybe'
                      ? 'from-vote-maybe/20 to-vote-maybe/5 border-vote-maybe/30 shadow-md'
                      : 'from-white/60 to-white/30 border-white/40 hover:from-vote-maybe/10 hover:to-vote-maybe/5'
                  )}
                >
                  <span className="text-3xl">&#x1F914;</span>
                  <span className={cn(
                    'text-xs font-semibold',
                    rsvpStatus === 'maybe' ? 'text-vote-maybe' : 'text-foreground'
                  )}>
                    Maybe
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRsvpStatus(rsvpStatus === 'out' ? null : 'out')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all',
                    'bg-gradient-to-br border',
                    rsvpStatus === 'out'
                      ? 'from-vote-out/20 to-vote-out/5 border-vote-out/30 shadow-md'
                      : 'from-white/60 to-white/30 border-white/40 hover:from-vote-out/10 hover:to-vote-out/5'
                  )}
                >
                  <span className="text-3xl">&#x1F622;</span>
                  <span className={cn(
                    'text-xs font-semibold',
                    rsvpStatus === 'out' ? 'text-vote-out' : 'text-foreground'
                  )}>
                    Can't Go
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings / Things in the Plan */}
        {proposals.length > 0 && (
          <div className="create-card p-6 sm:p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-foreground">
                In the Plan
              </h2>
              <span className="text-sm text-muted-foreground">
                {proposals.length} item{proposals.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {proposals.map((proposal) => {
                const Icon = getBookingIcon(proposal.type);
                return (
                  <div
                    key={proposal.id}
                    className="booking-card p-4 flex items-center gap-4"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {proposal.name || proposal.destination}
                      </p>
                      {proposal.estimated_cost_per_person > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {proposal.estimated_cost_per_person}/person
                        </p>
                      )}
                      {proposal.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {proposal.description}
                        </p>
                      )}
                    </div>

                    {/* Booker badge */}
                    {proposal.booked_by && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-vote-in/10 text-vote-in font-medium shrink-0">
                        Booked
                      </span>
                    )}

                    {/* External link */}
                    {proposal.url && (
                      <a
                        href={proposal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full hover:bg-black/[0.04] transition-colors shrink-0"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cost summary */}
        {proposals.some((p) => p.estimated_cost_per_person > 0) && (
          <div className="create-card p-6 sm:p-8 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Cost Summary
              </h2>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">
                  ${proposals.reduce((sum, p) => sum + (p.estimated_cost_per_person || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">estimated per person</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
