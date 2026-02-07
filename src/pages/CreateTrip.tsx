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
  Check,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COVER_PRESETS, PRESET_CATEGORIES } from '@/lib/cover-presets';
import { cn } from '@/lib/utils';
import { DestinationAutocomplete } from '@/components/ui/DestinationAutocomplete';
import BookingItemCard, {
  createEmptyBooking,
  type BookingEntry,
} from '@/components/trip/BookingItemCard';

// ── Font styles (like Partiful's Classic / Eclectic / Fancy / Literary) ──

type FontStyle = 'classic' | 'eclectic' | 'fancy' | 'literary' | 'modern';

const FONT_STYLES: { key: FontStyle; label: string; preview: string }[] = [
  { key: 'classic', label: 'Classic', preview: 'Classic' },
  { key: 'eclectic', label: 'Eclectic', preview: 'Eclectic' },
  { key: 'fancy', label: 'Fancy', preview: 'Fancy' },
  { key: 'literary', label: 'Literary', preview: 'Literary' },
  { key: 'modern', label: 'Modern', preview: 'Modern' },
];

// ── Emoji presets for RSVP buttons ──

type EmojiPreset = 'thumbs' | 'faces' | 'hands' | 'travel' | 'fire' | 'hearts';

const EMOJI_PRESETS: { key: EmojiPreset; label: string; emojis: [string, string, string] }[] = [
  { key: 'thumbs', label: '👍 Thumbs', emojis: ['👍', '🤔', '😢'] },
  { key: 'faces', label: '😎 Faces', emojis: ['😎', '🤷', '😬'] },
  { key: 'hands', label: '🙌 Hands', emojis: ['🙌', '🤞', '🙅'] },
  { key: 'travel', label: '✈️ Travel', emojis: ['✈️', '🤔', '🏠'] },
  { key: 'fire', label: '🔥 Fire', emojis: ['🔥', '👀', '💤'] },
  { key: 'hearts', label: '❤️ Hearts', emojis: ['❤️', '💛', '💔'] },
];

// ── Component ──

export default function CreateTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverCategory, setCoverCategory] = useState('popular');

  // Form state
  const [name, setName] = useState('');
  const [fontStyle, setFontStyle] = useState<FontStyle>('classic');
  const [emojiPreset, setEmojiPreset] = useState<EmojiPreset>('thumbs');
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

  // Filter cover presets by active category
  const filteredPresets = useMemo(() => {
    if (coverCategory === 'popular') {
      return COVER_PRESETS.filter(
        (p) => p.category === 'popular' || ['nature', 'party'].includes(p.key)
      );
    }
    return COVER_PRESETS.filter((p) => p.category === coverCategory);
  }, [coverCategory]);

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
            type: b.type === 'housing' || b.type === 'cruise' ? ('housing' as const) : ('activity' as const),
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
        }
      }

      // 3. Save font + emoji preferences to localStorage
      localStorage.setItem(`trip-${trip.id}-fontStyle`, fontStyle);
      localStorage.setItem(`trip-${trip.id}-emojiPreset`, emojiPreset);

      // 4. Post welcome message
      await supabase.from('messages').insert({
        trip_id: trip.id,
        user_id: user.id,
        type: 'system',
        body: 'Trip created! Share the link to invite your crew.',
      });

      toast.success('Trip created!');
      navigate(`/app/trip/${trip.id}`);
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
      text += ` \u2013 ${end.toLocaleDateString('en-US', opts)}`;
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                        className={cn('title-input', `title-${fontStyle}`)}
                        autoFocus
                      />

                      {/* Font style picker */}
                      <div className="flex items-center gap-1.5 pb-3">
                        {FONT_STYLES.map((fs) => (
                          <button
                            key={fs.key}
                            type="button"
                            onClick={() => setFontStyle(fs.key)}
                            className={cn(
                              'px-3 py-1 rounded-full text-sm transition-all',
                              fontStyle === fs.key
                                ? 'bg-foreground text-background font-medium'
                                : 'bg-black/[0.04] text-muted-foreground hover:bg-black/[0.08]'
                            )}
                          >
                            <span className={`title-${fs.key}`} style={{ fontSize: '0.875rem', lineHeight: '1.25rem' }}>
                              {fs.preview}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-3 py-3 border-b border-black/[0.06]">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="inline-field border-b-0 py-0 text-sm"
                          />
                          <span className="text-muted-foreground text-sm">&ndash;</span>
                          <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            min={dateStart}
                            className="inline-field border-b-0 py-0 text-sm"
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

                      {/* Location — Mapbox Autocomplete */}
                      <div className="py-1 border-b border-black/[0.06]">
                        <DestinationAutocomplete
                          value={location}
                          onChange={setLocation}
                          placeholder="Add destination..."
                          className="border-0 shadow-none bg-transparent pl-9 text-sm h-auto py-2 focus-visible:ring-0"
                        />
                      </div>

                      {/* Spots */}
                      <div className="flex items-center gap-3 py-3 border-b border-black/[0.06]">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
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

                    {/* Right column — Cover image + RSVP */}
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

                      {/* Cover picker with category tabs */}
                      <AnimatePresence>
                        {showCoverPicker && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="create-card-inner p-3 space-y-3">
                              {/* Category tabs */}
                              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                                {PRESET_CATEGORIES.map((cat) => (
                                  <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => setCoverCategory(cat.key)}
                                    className={cn(
                                      'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                                      coverCategory === cat.key
                                        ? 'bg-foreground text-background'
                                        : 'bg-black/[0.05] text-muted-foreground hover:bg-black/[0.1]'
                                    )}
                                  >
                                    {cat.label}
                                  </button>
                                ))}
                              </div>

                              {/* Image grid */}
                              <div className="grid grid-cols-4 gap-1.5 max-h-[240px] overflow-y-auto">
                                {filteredPresets.map((preset) => (
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
                                      coverImageKey === preset.key && 'ring-2 ring-primary'
                                    )}
                                  >
                                    <img
                                      src={preset.imageUrl}
                                      alt={preset.label}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                                      <span className="text-[9px] text-white font-medium leading-none">
                                        {preset.label}
                                      </span>
                                    </div>
                                    {coverImageKey === preset.key && (
                                      <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                                        <Check className="h-4 w-4 text-white drop-shadow" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* RSVP Options with emoji picker */}
                      <div className="create-card-inner p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">RSVP Options</h3>
                          <select
                            value={emojiPreset}
                            onChange={(e) => setEmojiPreset(e.target.value as EmojiPreset)}
                            className="text-xs font-medium bg-white/60 border border-white/40 rounded-full px-3 py-1 text-foreground cursor-pointer hover:bg-white/80 transition-colors"
                          >
                            {EMOJI_PRESETS.map((ep) => (
                              <option key={ep.key} value={ep.key}>
                                {ep.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(() => {
                          const currentEmojis = EMOJI_PRESETS.find((ep) => ep.key === emojiPreset)?.emojis || EMOJI_PRESETS[0].emojis;
                          return (
                            <div className="grid grid-cols-3 gap-2">
                              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-vote-in/5 border border-vote-in/10">
                                <span className="text-2xl">{currentEmojis[0]}</span>
                                <span className="text-xs font-medium text-vote-in">I'm In</span>
                              </div>
                              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-vote-maybe/5 border border-vote-maybe/10">
                                <span className="text-2xl">{currentEmojis[1]}</span>
                                <span className="text-xs font-medium text-vote-maybe">Maybe</span>
                              </div>
                              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-vote-out/5 border border-vote-out/10">
                                <span className="text-2xl">{currentEmojis[2]}</span>
                                <span className="text-xs font-medium text-vote-out">Can't Go</span>
                              </div>
                            </div>
                          );
                        })()}
                        <p className="text-[11px] text-muted-foreground text-center">
                          Your crew will see these options when they open the invite
                        </p>
                      </div>

                      {/* Date/location summary */}
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
                        Add lodging, flights, cruises, activities — anything the group needs
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
                      <span className="text-xs">Airbnb, flights, cruises, activities, restaurants...</span>
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
        </div>
      </div>
    </div>
  );
}
