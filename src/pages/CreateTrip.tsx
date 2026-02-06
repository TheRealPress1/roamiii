import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Plus,
  Loader2,
  Copy,
  Check,
  PartyPopper,
  Pencil,
  Link as LinkIcon,
  Image,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COVER_PRESETS } from '@/lib/cover-presets';
import { cn } from '@/lib/utils';
import BookingItemCard, {
  createEmptyBooking,
  type BookingEntry,
} from '@/components/trip/BookingItemCard';

interface CreatedTrip {
  id: string;
  name: string;
  join_code: string;
}

export default function CreateTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [createdTrip, setCreatedTrip] = useState<CreatedTrip | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [location, setLocation] = useState('');
  const [spots, setSpots] = useState('');
  const [coverImageKey, setCoverImageKey] = useState('beach');
  const [bookings, setBookings] = useState<BookingEntry[]>([]);

  const coverPreset = useMemo(
    () => COVER_PRESETS.find((p) => p.key === coverImageKey) || COVER_PRESETS[0],
    [coverImageKey]
  );

  const getInviteLink = () => {
    if (!createdTrip) return '';
    return `${window.location.origin}/join/${createdTrip.join_code}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getInviteLink());
      setCopiedLink(true);
      toast.success('Link copied! Share it with your crew');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const addBooking = () => {
    setBookings((prev) => [...prev, createEmptyBooking()]);
  };

  const updateBooking = (id: string, updated: BookingEntry) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const removeBooking = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      // 1. Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: name.trim(),
          created_by: user.id,
          date_start: dateStart || null,
          date_end: dateEnd || null,
          flexible_dates: flexibleDates,
          cover_image_url: coverPreset.imageUrl,
          home_city: location.trim() || null,
          planning_mode: 'freeform',
          phase: 'building',
        })
        .select('id, name, join_code')
        .single();

      if (tripError) throw tripError;

      // 2. Create proposals for each booking
      const validBookings = bookings.filter((b) => b.name.trim());
      if (validBookings.length > 0) {
        const proposals = validBookings.map((b) => {
          const costPerPerson =
            b.costType === 'per_person'
              ? Number(b.cost) || 0
              : b.spots
                ? Math.round((Number(b.cost) || 0) / Number(b.spots))
                : Number(b.cost) || 0;

          return {
            trip_id: trip.id,
            created_by: user.id,
            type: b.type === 'housing' ? ('housing' as const) : ('activity' as const),
            destination: location.trim() || name.trim(),
            name: b.name.trim(),
            url: b.url.trim() || null,
            cover_image_url: coverPreset.imageUrl,
            estimated_cost_per_person: costPerPerson,
            attendee_count: Number(b.spots) || null,
            is_destination: false,
            included: true,
            booked_by: b.bookingMode === 'host_books' ? user.id : null,
            description:
              b.bookingMode === 'everyone_books'
                ? 'Everyone books their own'
                : null,
          };
        });

        const { error: proposalError } = await supabase
          .from('trip_proposals')
          .insert(proposals);

        if (proposalError) {
          console.error('Error creating bookings:', proposalError);
          // Don't block trip creation for booking errors
        }
      }

      // 3. Post welcome message
      await supabase.from('messages').insert({
        trip_id: trip.id,
        user_id: user.id,
        type: 'system',
        body: 'Trip created! Share the link to invite your crew.',
      });

      setCreatedTrip(trip);
      toast.success('Trip created!');
    } catch (error: any) {
      console.error('Error creating trip:', error);
      toast.error(error.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDateRange = () => {
    if (!dateStart) return null;
    const start = new Date(dateStart + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    let text = start.toLocaleDateString('en-US', opts);
    if (dateEnd) {
      const end = new Date(dateEnd + 'T00:00:00');
      text += ` – ${end.toLocaleDateString('en-US', opts)}`;
    }
    if (flexibleDates) text += ' (flexible)';
    return text;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Themed blurred background */}
      <div
        className="create-bg"
        style={{ backgroundImage: `url(${coverPreset.imageUrl})` }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-5xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="text-foreground/70 hover:text-foreground hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        </div>

        <div className="px-4 sm:px-6 pb-12 max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {!createdTrip ? (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Main card */}
                <div className="create-card p-6 sm:p-8 mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-8">
                    {/* Left column — Form fields */}
                    <div className="space-y-1">
                      {/* Trip name */}
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Trip Name"
                        className="title-input"
                        autoFocus
                      />

                      {/* Dates */}
                      <div className="flex items-center gap-3 py-3 border-b border-black/[0.06]">
                        <Calendar className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="inline-field border-b-0 py-0 text-sm"
                            placeholder="Start date"
                          />
                          <span className="text-muted-foreground text-sm">–</span>
                          <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            min={dateStart}
                            className="inline-field border-b-0 py-0 text-sm"
                            placeholder="End date"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Switch
                            id="flex"
                            checked={flexibleDates}
                            onCheckedChange={setFlexibleDates}
                            className="scale-75"
                          />
                          <label
                            htmlFor="flex"
                            className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                          >
                            Flexible
                          </label>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-3 py-3 border-b border-black/[0.06]">
                        <MapPin className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Add destination..."
                          className="inline-field border-b-0 py-0 text-sm flex-1"
                        />
                      </div>

                      {/* Spots */}
                      <div className="flex items-center gap-3 py-3 border-b border-black/[0.06]">
                        <Users className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                        <input
                          type="number"
                          value={spots}
                          onChange={(e) => setSpots(e.target.value)}
                          placeholder="Unlimited spots"
                          className="inline-field border-b-0 py-0 text-sm flex-1"
                          min="1"
                        />
                      </div>

                      {/* Description */}
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a description of your trip..."
                        className="inline-field border-b-0 py-3 text-sm resize-none w-full min-h-[80px]"
                        rows={3}
                      />
                    </div>

                    {/* Right column — Cover image */}
                    <div className="space-y-4">
                      {/* Main cover preview */}
                      <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-muted group">
                        <img
                          src={coverPreset.imageUrl}
                          alt={coverPreset.label}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        <button
                          type="button"
                          onClick={() => setShowCoverPicker(!showCoverPicker)}
                          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white text-sm font-medium backdrop-blur-sm transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </div>

                      {/* Cover picker */}
                      <AnimatePresence>
                        {showCoverPicker && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-5 gap-1.5 p-3 create-card-inner">
                              {COVER_PRESETS.slice(0, 15).map((preset) => (
                                <button
                                  key={preset.key}
                                  type="button"
                                  onClick={() => {
                                    setCoverImageKey(preset.key);
                                    setShowCoverPicker(false);
                                  }}
                                  className={cn(
                                    'relative aspect-square rounded-lg overflow-hidden transition-all',
                                    'hover:ring-2 hover:ring-primary/50',
                                    coverImageKey === preset.key &&
                                      'ring-2 ring-primary'
                                  )}
                                >
                                  <img
                                    src={preset.imageUrl}
                                    alt={preset.label}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  {coverImageKey === preset.key && (
                                    <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                                      <Check className="h-4 w-4 text-white drop-shadow" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Date summary chip */}
                      {formatDateRange() && (
                        <div className="create-card-inner px-4 py-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-medium">{formatDateRange()}</span>
                          </div>
                          {location && (
                            <div className="flex items-center gap-2 text-sm mt-1.5">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-medium">{location}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bookings section */}
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
                      onClick={addBooking}
                      className="rounded-full border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {bookings.length === 0 ? (
                    <button
                      type="button"
                      onClick={addBooking}
                      className="w-full py-8 border-2 border-dashed border-black/[0.08] rounded-xl hover:border-primary/30 hover:bg-primary/[0.02] transition-all flex flex-col items-center gap-2 text-muted-foreground"
                    >
                      <div className="w-10 h-10 rounded-full bg-black/[0.04] flex items-center justify-center">
                        <Plus className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium">Add your first booking</span>
                      <span className="text-xs">Airbnb, flights, activities, restaurants...</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map((booking) => (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          layout
                        >
                          <BookingItemCard
                            entry={booking}
                            onChange={(updated) => updateBooking(booking.id, updated)}
                            onRemove={() => removeBooking(booking.id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Create button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleCreate}
                    disabled={loading || name.trim().length < 3}
                    size="lg"
                    className="gradient-primary text-white rounded-full px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-40"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create Trip
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Success / Invite screen */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="max-w-lg mx-auto"
              >
                <div className="create-card p-8 text-center space-y-6">
                  {/* Celebration */}
                  <div>
                    <div className="w-20 h-20 rounded-full bg-vote-in/10 mx-auto mb-4 flex items-center justify-center">
                      <PartyPopper className="h-10 w-10 text-vote-in" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-foreground">
                      {createdTrip.name}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Your trip is ready. Share the link with your crew!
                    </p>
                  </div>

                  {/* Invite link */}
                  <div className="create-card-inner p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-left">
                        <p className="text-xs text-muted-foreground mb-1">Invite link</p>
                        <p className="text-sm font-mono text-foreground truncate">
                          {getInviteLink()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleCopyLink}
                        className={cn(
                          'rounded-full shrink-0 transition-all',
                          copiedLink
                            ? 'bg-vote-in text-white'
                            : 'gradient-primary text-white'
                        )}
                      >
                        {copiedLink ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="pt-2 border-t border-black/[0.06]">
                      <p className="text-xs text-muted-foreground mb-1">Join code</p>
                      <p className="text-2xl font-mono font-bold tracking-[0.15em] text-foreground">
                        {createdTrip.join_code}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => navigate(`/app/trip/${createdTrip.id}`)}
                      className="gradient-primary text-white rounded-full w-full"
                      size="lg"
                    >
                      Go to Trip
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/app')}
                      className="text-muted-foreground"
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
