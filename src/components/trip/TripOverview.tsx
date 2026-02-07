import { useState, useMemo, useEffect } from 'react';
import { format, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
import {
  Calendar,
  MapPin,
  Users,
  Copy,
  Check,
  Share2,
  Home,
  Plane,
  Compass,
  DollarSign,
  ExternalLink,
  Plus,
  Ship,
  ChevronDown,
  Clock,
  CreditCard,
  UtensilsCrossed,
  Car,
  Package,
  Type,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import BookingItemCard, { createEmptyBooking, type BookingEntry } from '@/components/trip/BookingItemCard';
import { supabase } from '@/integrations/supabase/client';
import type { Trip, TripProposal, TripMember } from '@/lib/tripchat-types';

interface TripOverviewProps {
  trip: Trip;
  proposals: TripProposal[];
  members: TripMember[];
  isAdmin: boolean;
  onUpdated: () => void;
}

const BOOKING_ICONS: Record<string, typeof Home> = {
  housing: Home,
  flight: Plane,
  cruise: Ship,
  activity: Compass,
  restaurant: UtensilsCrossed,
  transport: Car,
  other: Package,
};

function getBookingIcon(type: string) {
  return BOOKING_ICONS[type] || Compass;
}

type FontStyle = 'classic' | 'eclectic' | 'fancy' | 'literary' | 'modern' | 'bold';

const FONT_STYLES: { key: FontStyle; label: string; className: string }[] = [
  { key: 'classic', label: 'Classic', className: 'title-classic' },
  { key: 'eclectic', label: 'Handwritten', className: 'title-eclectic' },
  { key: 'fancy', label: 'Elegant', className: 'title-fancy' },
  { key: 'literary', label: 'Serif', className: 'title-literary' },
  { key: 'modern', label: 'Poster', className: 'title-modern' },
  { key: 'bold', label: 'Bold', className: 'title-bold' },
];

const EMOJI_PRESETS: Record<string, [string, string, string]> = {
  thumbs: ['👍', '🤔', '😢'],
  faces: ['😎', '🤷', '😬'],
  hands: ['🙌', '🤞', '🙅'],
  travel: ['✈️', '🤔', '🏠'],
  fire: ['🔥', '👀', '💤'],
  hearts: ['❤️', '💛', '💔'],
};

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
  const [costExpanded, setCostExpanded] = useState(false);
  const [fontStyle, setFontStyle] = useState<FontStyle>('classic');
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [rsvpEmojis, setRsvpEmojis] = useState<[string, string, string]>(['👍', '🤔', '😢']);
  const [newBookings, setNewBookings] = useState<BookingEntry[]>([]);
  const [savingBookings, setSavingBookings] = useState(false);
  const [assigningDay, setAssigningDay] = useState<string | null>(null);

  // Load font and emoji preferences from localStorage
  useEffect(() => {
    const savedFont = localStorage.getItem(`trip-${trip.id}-fontStyle`) as FontStyle | null;
    if (savedFont && FONT_STYLES.some((f) => f.key === savedFont)) {
      setFontStyle(savedFont);
    }
    const savedEmoji = localStorage.getItem(`trip-${trip.id}-emojiPreset`);
    if (savedEmoji && EMOJI_PRESETS[savedEmoji]) {
      setRsvpEmojis(EMOJI_PRESETS[savedEmoji]);
    }
  }, [trip.id]);

  const handleFontChange = (fs: FontStyle) => {
    setFontStyle(fs);
    localStorage.setItem(`trip-${trip.id}-fontStyle`, fs);
    setShowFontPicker(false);
  };

  const coverUrl = trip.cover_image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=450&fit=crop';
  const hostMember = members.find((m) => m.role === 'owner');
  const hostProfile = hostMember?.profile;
  const inviteLink = `${window.location.origin}/join/${trip.join_code}`;

  // Compute trip days for day-by-day itinerary
  const tripDays = useMemo(() => {
    if (!trip.date_start || !trip.date_end) return [];
    try {
      return eachDayOfInterval({
        start: parseISO(trip.date_start),
        end: parseISO(trip.date_end),
      });
    } catch {
      return [];
    }
  }, [trip.date_start, trip.date_end]);

  // Group proposals by day
  const proposalsByDay = useMemo(() => {
    const grouped: Map<string, TripProposal[]> = new Map();
    const unscheduled: TripProposal[] = [];

    proposals.forEach((p) => {
      if (p.date_start) {
        const pDate = parseISO(p.date_start);
        const matchingDay = tripDays.find((d) => isSameDay(d, pDate));
        if (matchingDay) {
          const key = matchingDay.toISOString();
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(p);
        } else {
          unscheduled.push(p);
        }
      } else {
        unscheduled.push(p);
      }
    });

    return { grouped, unscheduled };
  }, [proposals, tripDays]);

  // Total cost
  const totalCostPerPerson = proposals.reduce(
    (sum, p) => sum + (p.estimated_cost_per_person || 0),
    0
  );

  // Proposals with costs for breakdown
  const costItems = proposals.filter((p) => p.estimated_cost_per_person > 0);

  // Count of items that need booking
  const unbookedItems = proposals.filter((p) => !p.booked_by && p.url);

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

  // ── Booking management (admin) ──
  const addNewBooking = () => {
    setNewBookings((prev) => [...prev, createEmptyBooking()]);
  };

  const updateNewBooking = (id: string, updated: BookingEntry) => {
    setNewBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const removeNewBooking = (id: string) => {
    setNewBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSaveBookings = async () => {
    const valid = newBookings.filter((b) => b.name.trim());
    if (valid.length === 0) return;
    setSavingBookings(true);
    try {
      const inserts = valid.map((b) => {
        const costPerPerson =
          b.costType === 'per_person'
            ? Number(b.cost) || 0
            : b.spots
              ? Math.round((Number(b.cost) || 0) / Number(b.spots))
              : Number(b.cost) || 0;
        return {
          trip_id: trip.id,
          created_by: user?.id,
          type: b.type === 'housing' || b.type === 'cruise' ? ('housing' as const) : ('activity' as const),
          destination: trip.home_city || trip.name,
          name: b.name.trim(),
          url: b.url.trim() || null,
          cover_image_url: trip.cover_image_url,
          estimated_cost_per_person: costPerPerson,
          attendee_count: Number(b.spots) || null,
          is_destination: false,
          included: true,
          booked_by: b.bookingMode === 'host_books' ? user?.id : null,
          description: b.bookingMode === 'everyone_books' ? 'Everyone books their own' : null,
        };
      });
      const { error } = await supabase.from('trip_proposals').insert(inserts);
      if (error) throw error;
      toast.success(`${valid.length} booking${valid.length > 1 ? 's' : ''} added!`);
      setNewBookings([]);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bookings');
    } finally {
      setSavingBookings(false);
    }
  };

  // ── Itinerary day assignment (admin) ──
  const handleAssignToDay = async (proposalId: string, dayDate: Date) => {
    setAssigningDay(proposalId);
    try {
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const { error } = await supabase
        .from('trip_proposals')
        .update({ date_start: dateStr })
        .eq('id', proposalId);
      if (error) throw error;
      onUpdated();
    } catch {
      toast.error('Failed to assign item');
    } finally {
      setAssigningDay(null);
    }
  };

  const handleUnschedule = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('trip_proposals')
        .update({ date_start: null })
        .eq('id', proposalId);
      if (error) throw error;
      onUpdated();
    } catch {
      toast.error('Failed to unschedule item');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr + 'T00:00:00'), 'EEEE, MMM d');
  };

  const formatDayHeader = (date: Date, index: number) => {
    return `Day ${index + 1} — ${format(date, 'EEE, MMM d')}`;
  };

  // Render a single plan item (no price) with optional admin controls
  const renderPlanItem = (proposal: TripProposal, options?: { showDayAssign?: boolean; showUnschedule?: boolean }) => {
    const Icon = getBookingIcon(proposal.type);
    return (
      <div key={proposal.id} className="space-y-1.5">
        <div className="booking-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {proposal.name || proposal.destination}
            </p>
            {proposal.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {proposal.description}
              </p>
            )}
          </div>

          {proposal.booked_by && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-vote-in/10 text-vote-in font-medium shrink-0">
              Booked
            </span>
          )}

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

          {/* Admin: unschedule from day */}
          {isAdmin && options?.showUnschedule && (
            <button
              onClick={() => handleUnschedule(proposal.id)}
              className="p-1.5 rounded-full hover:bg-black/[0.06] transition-colors shrink-0"
              title="Remove from this day"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Admin: day assignment selector for unscheduled items */}
        {isAdmin && options?.showDayAssign && tripDays.length > 0 && (
          <div className="flex items-center gap-1.5 pl-14 flex-wrap">
            <span className="text-[10px] text-muted-foreground mr-0.5">Move to:</span>
            {tripDays.map((day, idx) => (
              <button
                key={day.toISOString()}
                onClick={() => handleAssignToDay(proposal.id, day)}
                disabled={assigningDay === proposal.id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                Day {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto relative isolate">
      {/* Themed background — scoped to this container, not full viewport */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${coverUrl})`,
          filter: 'blur(80px) brightness(0.85) saturate(1.4)',
          transform: 'scale(1.3)',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Main card */}
        <div className="create-card p-6 sm:p-8 mb-6">
          {/* Cover image at top */}
          <div className="relative rounded-xl overflow-hidden aspect-[21/9] bg-muted mb-6 -mx-2 -mt-2 sm:-mx-4 sm:-mt-4">
            <img
              src={coverUrl}
              alt={trip.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Trip name + font picker */}
          <div className="relative">
            <h1
              className={cn('title-input mb-1', `title-${fontStyle}`)}
              style={{ cursor: isAdmin ? 'pointer' : 'default' }}
              onClick={() => isAdmin && setShowFontPicker(!showFontPicker)}
              title={isAdmin ? 'Click to change font' : undefined}
            >
              {trip.name}
            </h1>

            {/* Font picker — only visible to admin/host */}
            {isAdmin && showFontPicker && (
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {FONT_STYLES.map((fs) => (
                  <button
                    key={fs.key}
                    type="button"
                    onClick={() => handleFontChange(fs.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                      fs.className,
                      fontStyle === fs.key
                        ? 'bg-foreground text-background border-foreground shadow-sm'
                        : 'bg-white/60 text-foreground border-white/40 hover:bg-white/80'
                    )}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            )}
            {isAdmin && !showFontPicker && (
              <button
                onClick={() => setShowFontPicker(true)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <Type className="h-3 w-3" />
                Change font
              </button>
            )}
          </div>

          {/* Date */}
          {trip.date_start && (
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                {formatDate(trip.date_start)}
                {trip.date_end && trip.date_end !== trip.date_start && (
                  <> — {formatDate(trip.date_end)}</>
                )}
              </p>
            </div>
          )}

          {/* Location */}
          {trip.home_city && (
            <div className="flex items-center gap-2 mb-5">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">{trip.home_city}</p>
            </div>
          )}

          {/* Hosted by + actions row */}
          <div className="flex items-center justify-between mb-5">
            {hostProfile && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={hostProfile.avatar_url || ''} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {hostProfile.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Hosted by</p>
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {hostProfile.name || 'Host'}
                  </p>
                </div>
              </div>
            )}

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
          </div>

          {/* RSVP buttons */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRsvpStatus(rsvpStatus === 'in' ? null : 'in')}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all',
                'bg-gradient-to-br border',
                rsvpStatus === 'in'
                  ? 'from-vote-in/20 to-vote-in/5 border-vote-in/30 shadow-md'
                  : 'from-white/60 to-white/30 border-white/40 hover:from-vote-in/10 hover:to-vote-in/5'
              )}
            >
              <span className="text-2xl">{rsvpEmojis[0]}</span>
              <span className={cn(
                'text-xs font-semibold',
                rsvpStatus === 'in' ? 'text-vote-in' : 'text-foreground'
              )}>Going</span>
            </button>
            <button
              type="button"
              onClick={() => setRsvpStatus(rsvpStatus === 'maybe' ? null : 'maybe')}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all',
                'bg-gradient-to-br border',
                rsvpStatus === 'maybe'
                  ? 'from-vote-maybe/20 to-vote-maybe/5 border-vote-maybe/30 shadow-md'
                  : 'from-white/60 to-white/30 border-white/40 hover:from-vote-maybe/10 hover:to-vote-maybe/5'
              )}
            >
              <span className="text-2xl">{rsvpEmojis[1]}</span>
              <span className={cn(
                'text-xs font-semibold',
                rsvpStatus === 'maybe' ? 'text-vote-maybe' : 'text-foreground'
              )}>Maybe</span>
            </button>
            <button
              type="button"
              onClick={() => setRsvpStatus(rsvpStatus === 'out' ? null : 'out')}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all',
                'bg-gradient-to-br border',
                rsvpStatus === 'out'
                  ? 'from-vote-out/20 to-vote-out/5 border-vote-out/30 shadow-md'
                  : 'from-white/60 to-white/30 border-white/40 hover:from-vote-out/10 hover:to-vote-out/5'
              )}
            >
              <span className="text-2xl">{rsvpEmojis[2]}</span>
              <span className={cn(
                'text-xs font-semibold',
                rsvpStatus === 'out' ? 'text-vote-out' : 'text-foreground'
              )}>Can't Go</span>
            </button>
          </div>

          {/* Guest List */}
          <div className="border-t border-black/[0.06] pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                The Crew
                <span className="text-muted-foreground font-normal ml-1.5">
                  {members.length}
                </span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-7"
                onClick={handleShare}
              >
                <Plus className="h-3 w-3 mr-1" />
                Invite
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
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

        {/* Booking CTA — shown when there are unbooked items */}
        {unbookedItems.length > 0 && (
          <div className="create-card p-5 mb-6 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {unbookedItems.length} item{unbookedItems.length !== 1 ? 's' : ''} to book
                </h3>
                <p className="text-xs text-muted-foreground">
                  Reserve your spot to lock in the trip
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {unbookedItems.map((item) => {
                const Icon = getBookingIcon(item.type);
                return (
                  <a
                    key={item.id}
                    href={item.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/60 hover:bg-white/80 border border-white/40 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1 truncate">
                      {item.name || item.destination}
                    </span>
                    <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1">
                      Book Now <ExternalLink className="h-3 w-3" />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin: Things to Book */}
        {isAdmin && (
          <div className="create-card p-6 sm:p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-display font-semibold text-foreground">
                  Things to Book
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add lodging, flights, activities — anything the group needs
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewBooking}
                className="rounded-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {newBookings.length === 0 ? (
              <button
                type="button"
                onClick={addNewBooking}
                className="w-full py-6 border-2 border-dashed border-black/[0.08] rounded-xl hover:border-primary/30 hover:bg-primary/[0.02] transition-all flex flex-col items-center gap-2 text-muted-foreground"
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm font-medium">Add a booking</span>
                <span className="text-xs">Airbnb, flights, cruises, activities...</span>
              </button>
            ) : (
              <div className="space-y-3">
                {newBookings.map((booking) => (
                  <BookingItemCard
                    key={booking.id}
                    entry={booking}
                    onChange={(updated) => updateNewBooking(booking.id, updated)}
                    onRemove={() => removeNewBooking(booking.id)}
                  />
                ))}
                <Button
                  onClick={handleSaveBookings}
                  disabled={savingBookings || newBookings.every((b) => !b.name.trim())}
                  className="w-full gradient-primary text-white rounded-full"
                >
                  {savingBookings ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Bookings
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Day-by-Day Itinerary */}
        {(proposals.length > 0 || isAdmin) && (
          <div className="create-card p-6 sm:p-8 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Itinerary
              </h2>
              <span className="text-sm text-muted-foreground">
                {proposals.length} item{proposals.length !== 1 ? 's' : ''}
              </span>
            </div>

            {proposals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Add bookings above, then structure your day-by-day plan here
              </p>
            ) : tripDays.length > 0 ? (
              <div className="space-y-5">
                {tripDays.map((day, idx) => {
                  const dayKey = day.toISOString();
                  const dayProposals = proposalsByDay.grouped.get(dayKey) || [];
                  return (
                    <div key={dayKey}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {formatDayHeader(day, idx)}
                        </h3>
                      </div>
                      {dayProposals.length > 0 ? (
                        <div className="space-y-2 ml-8">
                          {dayProposals.map((p) => renderPlanItem(p, { showUnschedule: true }))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground ml-8 py-2 italic">
                          Nothing planned yet
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Unscheduled items — admin can assign to days */}
                {proposalsByDay.unscheduled.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Not yet scheduled
                      </h3>
                    </div>
                    <div className="space-y-2 ml-8">
                      {proposalsByDay.unscheduled.map((p) => renderPlanItem(p, { showDayAssign: true }))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* No dates set — flat list */
              <div className="space-y-2">
                {proposals.map((p) => renderPlanItem(p))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Cost Summary */}
        {costItems.length > 0 && (
          <div className="create-card mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => setCostExpanded(!costExpanded)}
              className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-black/[0.01] transition-colors"
            >
              <h2 className="text-lg font-display font-semibold text-foreground">
                Cost Summary
              </h2>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">
                    ${totalCostPerPerson.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">est. per person</p>
                </div>
                <motion.div
                  animate={{ rotate: costExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence>
              {costExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 sm:px-8 pb-6 sm:pb-8 border-t border-black/[0.06]">
                    <div className="space-y-3 pt-4">
                      {costItems.map((item) => {
                        const Icon = getBookingIcon(item.type);
                        return (
                          <div key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-sm text-foreground">
                                {item.name || item.destination}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              ${item.estimated_cost_per_person.toLocaleString()}/person
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
