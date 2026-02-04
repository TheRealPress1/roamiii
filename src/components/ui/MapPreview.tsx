import { cn } from '@/lib/utils';

interface MapPreviewProps {
  coordinates: [number, number]; // [lng, lat]
  className?: string;
}

export function MapPreview({ coordinates, className }: MapPreviewProps) {
  const [lng, lat] = coordinates;
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `pin-s+8b5cf6(${lng},${lat})/${lng},${lat},10,0/400x200@2x?access_token=${token}`;

  return (
    <div className={cn("rounded-lg overflow-hidden border", className)}>
      <img
        src={staticMapUrl}
        alt="Location preview"
        className="w-full h-auto"
      />
    </div>
  );
}
