import { useState } from 'react';
import {
  Home,
  Plane,
  Compass,
  UtensilsCrossed,
  Car,
  Package,
  X,
  Link as LinkIcon,
  DollarSign,
  Users,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type BookingType = 'housing' | 'flight' | 'activity' | 'restaurant' | 'transport' | 'other';
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

  const currentType = BOOKING_TYPES.find((t) => t.value === entry.type) || BOOKING_TYPES[0];
  const TypeIcon = currentType.icon;

  const update = (partial: Partial<BookingEntry>) => {
    onChange({ ...entry, ...partial });
  };

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
        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="url"
          value={entry.url}
          onChange={(e) => update({ url: e.target.value })}
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
