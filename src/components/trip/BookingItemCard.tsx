import { useState, useCallback } from 'react';
import {
  Home,
  Plane,
  Compass,
  UtensilsCrossed,
  Car,
  Package,
  Ship,
  X,
  Link as LinkIcon,
  DollarSign,
  Users,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type BookingType = 'housing' | 'flight' | 'cruise' | 'activity' | 'restaurant' | 'transport' | 'other';
export type BookingMode = 'host_books' | 'everyone_books';
export type CostType = 'total' | 'per_person';

export interface BookingEntry {
  id: string;
  type: BookingType;
  name: string;
  url: string;
  cost: string;
  costType: CostType;
  spots: string;
  bookingMode: BookingMode;
}

const BOOKING_TYPES: { value: BookingType; label: string; icon: typeof Home }[] = [
  { value: 'housing', label: 'Housing', icon: Home },
  { value: 'flight', label: 'Flight', icon: Plane },
  { value: 'cruise', label: 'Cruise', icon: Ship },
  { value: 'activity', label: 'Activity', icon: Compass },
  { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { value: 'transport', label: 'Transport', icon: Car },
  { value: 'other', label: 'Other', icon: Package },
];

interface BookingItemCardProps {
  entry: BookingEntry;
  onChange: (updated: BookingEntry) => void;
  onRemove: () => void;
}

export default function BookingItemCard({ entry, onChange, onRemove }: BookingItemCardProps) {
  const [typeOpen, setTypeOpen] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);

  const currentType = BOOKING_TYPES.find((t) => t.value === entry.type) || BOOKING_TYPES[0];
  const TypeIcon = currentType.icon;

  const update = (partial: Partial<BookingEntry>) => {
    onChange({ ...entry, ...partial });
  };

  // Extract metadata from pasted URL
  const fetchUrlMetadata = useCallback(async (url: string) => {
    if (!url || !url.startsWith('http')) return;
    setFetchingMeta(true);
    try {
      const res = await fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();

      const updates: Partial<BookingEntry> = {};

      // Auto-fill name from page title if empty
      if (!entry.name && data.title) {
        // Clean up common title suffixes
        let title = data.title
          .replace(/\s*[-|·–]\s*(Airbnb|Booking\.com|Expedia|VRBO|Hotels\.com|Kayak|Google).*$/i, '')
          .replace(/\s*[-|·–]\s*\d{4}.*$/, '')
          .trim();
        if (title.length > 60) title = title.substring(0, 57) + '...';
        updates.name = title;
      }

      // Try to extract price from title/description
      if (!entry.cost) {
        const priceText = `${data.title || ''} ${data.description || ''}`;
        // Match patterns like $1,234, $99.99, $500/night, from $299
        const priceMatch = priceText.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/);
        if (priceMatch) {
          const price = priceMatch[1].replace(/,/g, '');
          updates.cost = price;
          updates.costType = 'total';
        }
      }

      // Try to detect type from URL domain
      const domain = new URL(url).hostname.toLowerCase();
      if (domain.includes('airbnb') || domain.includes('vrbo') || domain.includes('booking.com') || domain.includes('hotels.com')) {
        updates.type = 'housing';
      } else if (domain.includes('airline') || domain.includes('delta') || domain.includes('united') || domain.includes('southwest') || domain.includes('kayak') || domain.includes('google.com/travel/flights')) {
        updates.type = 'flight';
      } else if (domain.includes('carnival') || domain.includes('royal') || domain.includes('norwegian') || domain.includes('cruise')) {
        updates.type = 'cruise';
      } else if (domain.includes('opentable') || domain.includes('resy') || domain.includes('yelp')) {
        updates.type = 'restaurant';
      }

      if (Object.keys(updates).length > 0) {
        onChange({ ...entry, url, ...updates });
      }
    } catch {
      // Silently fail — metadata is a nice-to-have
    } finally {
      setFetchingMeta(false);
    }
  }, [entry, onChange]);

  return (
    <div className="booking-card p-4 space-y-3 relative group">
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/5 transition-all"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Type selector + Name */}
      <div className="flex items-center gap-3">
        {/* Type dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTypeOpen(!typeOpen)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              'bg-black/5 hover:bg-black/8 text-foreground'
            )}
          >
            <TypeIcon className="h-3.5 w-3.5" />
            {currentType.label}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>

          {typeOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setTypeOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl shadow-lg border border-black/5 py-1 min-w-[160px]">
                {BOOKING_TYPES.map((bt) => {
                  const Icon = bt.icon;
                  return (
                    <button
                      key={bt.value}
                      type="button"
                      onClick={() => {
                        update({ type: bt.value });
                        setTypeOpen(false);
                      }}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-black/5 transition-colors',
                        entry.type === bt.value && 'text-primary font-medium'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {bt.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Name */}
        <input
          type="text"
          value={entry.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={`${currentType.label} name...`}
          className="inline-field flex-1 text-sm font-medium border-b-0 py-1"
        />
      </div>

      {/* URL */}
      <div className="flex items-center gap-2 text-sm">
        {fetchingMeta ? (
          <Loader2 className="h-3.5 w-3.5 text-primary shrink-0 animate-spin" />
        ) : (
          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <input
          type="url"
          value={entry.url}
          onChange={(e) => update({ url: e.target.value })}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted.startsWith('http')) {
              // Let the onChange fire first, then fetch metadata
              setTimeout(() => fetchUrlMetadata(pasted), 100);
            }
          }}
          placeholder="Paste booking link..."
          className="inline-field py-1 text-sm text-muted-foreground"
        />
      </div>

      {/* Cost + Spots row */}
      <div className="flex items-center gap-4">
        {/* Cost */}
        <div className="flex items-center gap-2 flex-1">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="number"
            value={entry.cost}
            onChange={(e) => update({ cost: e.target.value })}
            placeholder="0"
            className="inline-field py-1 text-sm w-20"
            min="0"
          />
          <button
            type="button"
            onClick={() => update({ costType: entry.costType === 'total' ? 'per_person' : 'total' })}
            className="text-xs px-2 py-0.5 rounded-full bg-black/5 hover:bg-black/8 text-muted-foreground whitespace-nowrap transition-colors"
          >
            {entry.costType === 'total' ? 'total' : '/ person'}
          </button>
        </div>

        {/* Spots */}
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="number"
            value={entry.spots}
            onChange={(e) => update({ spots: e.target.value })}
            placeholder="—"
            className="inline-field py-1 text-sm w-12 text-center"
            min="1"
          />
          <span className="text-xs text-muted-foreground">spots</span>
        </div>
      </div>

      {/* Booking mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => update({ bookingMode: 'host_books' })}
          className={cn(
            'flex-1 text-xs py-2 px-3 rounded-lg font-medium transition-all',
            entry.bookingMode === 'host_books'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-black/[0.03] text-muted-foreground hover:bg-black/[0.06] border border-transparent'
          )}
        >
          I'll book this
        </button>
        <button
          type="button"
          onClick={() => update({ bookingMode: 'everyone_books' })}
          className={cn(
            'flex-1 text-xs py-2 px-3 rounded-lg font-medium transition-all',
            entry.bookingMode === 'everyone_books'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-black/[0.03] text-muted-foreground hover:bg-black/[0.06] border border-transparent'
          )}
        >
          Everyone books their own
        </button>
      </div>
    </div>
  );
}

export function createEmptyBooking(): BookingEntry {
  return {
    id: crypto.randomUUID(),
    type: 'housing',
    name: '',
    url: '',
    cost: '',
    costType: 'total',
    spots: '',
    bookingMode: 'host_books',
  };
}
