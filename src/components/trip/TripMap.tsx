import { useEffect, useRef, useState, useCallback } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl";
import type { MapRef, MarkerDragEvent } from "react-map-gl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, MapPin, Navigation } from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

export interface MapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: "destination" | "activity" | "accommodation" | "transport";
  description?: string;
  imageUrl?: string;
}

interface TripMapProps {
  locations: MapLocation[];
  isOpen: boolean;
  onClose: () => void;
  onLocationClick?: (location: MapLocation) => void;
  onLocationDrag?: (locationId: string, lat: number, lng: number) => void;
  draggable?: boolean;
  initialCenter?: { latitude: number; longitude: number };
  initialZoom?: number;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;

const markerColors: Record<string, string> = {
  destination: "#8B5CF6",
  activity: "#10B981",
  accommodation: "#F59E0B",
  transport: "#3B82F6",
};

export function TripMap({
  locations,
  isOpen,
  onClose,
  onLocationClick,
  onLocationDrag,
  draggable = false,
  initialCenter,
  initialZoom = 10,
}: TripMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [viewState, setViewState] = useState({
    latitude: initialCenter?.latitude ?? locations[0]?.latitude ?? 48.8566,
    longitude: initialCenter?.longitude ?? locations[0]?.longitude ?? 2.3522,
    zoom: initialZoom,
  });

  // Fit bounds to all markers
  const fitBounds = useCallback(() => {
    if (!mapRef.current || locations.length === 0) return;

    if (locations.length === 1) {
      mapRef.current.flyTo({
        center: [locations[0].longitude, locations[0].latitude],
        zoom: 12,
        duration: 1000,
      });
      return;
    }

    const lngs = locations.map((l) => l.longitude);
    const lats = locations.map((l) => l.latitude);

    mapRef.current.fitBounds(
      [
        [Math.min(...lngs) - 0.1, Math.min(...lats) - 0.1],
        [Math.max(...lngs) + 0.1, Math.max(...lats) + 0.1],
      ],
      { padding: 50, duration: 1000 }
    );
  }, [locations]);

  useEffect(() => {
    if (isOpen && locations.length > 0) {
      // Small delay to ensure map is mounted
      const timer = setTimeout(fitBounds, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fitBounds]);

  const handleMarkerDrag = (locationId: string, event: MarkerDragEvent) => {
    if (onLocationDrag) {
      onLocationDrag(locationId, event.lngLat.lat, event.lngLat.lng);
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Map Unavailable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Map functionality requires a Mapbox API token. Please add VITE_MAPBOX_TOKEN to your environment variables.
                </p>
                <Button onClick={onClose}>Close</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 top-16 bg-background rounded-t-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background to-transparent">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">Trip Map</span>
                <span className="text-sm text-muted-foreground">
                  ({locations.length} locations)
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fitBounds}
                  className="bg-background/80 backdrop-blur-sm"
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Fit all
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="bg-background/80 backdrop-blur-sm"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Map */}
            <Map
              ref={mapRef}
              {...viewState}
              onMove={(evt) => setViewState(evt.viewState)}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              mapboxAccessToken={MAPBOX_TOKEN}
              style={{ width: "100%", height: "100%" }}
            >
              <NavigationControl position="bottom-right" />
              <FullscreenControl position="bottom-right" />

              {locations.map((location) => (
                <Marker
                  key={location.id}
                  latitude={location.latitude}
                  longitude={location.longitude}
                  anchor="bottom"
                  draggable={draggable}
                  onDragEnd={(e) => handleMarkerDrag(location.id, e)}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedLocation(location);
                    onLocationClick?.(location);
                  }}
                >
                  <div
                    className="cursor-pointer transition-transform hover:scale-110"
                    style={{
                      color: markerColors[location.type ?? "destination"],
                    }}
                  >
                    <MapPin className="h-8 w-8 drop-shadow-md" fill="currentColor" />
                  </div>
                </Marker>
              ))}

              {selectedLocation && (
                <Popup
                  latitude={selectedLocation.latitude}
                  longitude={selectedLocation.longitude}
                  anchor="top"
                  onClose={() => setSelectedLocation(null)}
                  closeOnClick={false}
                  className="min-w-[200px]"
                >
                  <div className="p-1">
                    {selectedLocation.imageUrl && (
                      <img
                        src={selectedLocation.imageUrl}
                        alt={selectedLocation.name}
                        className="w-full h-24 object-cover rounded-md mb-2"
                      />
                    )}
                    <h3 className="font-medium text-sm">{selectedLocation.name}</h3>
                    {selectedLocation.description && (
                      <p className="text-xs text-gray-600 mt-1">
                        {selectedLocation.description}
                      </p>
                    )}
                    {selectedLocation.type && (
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded-full mt-2 text-white"
                        style={{ backgroundColor: markerColors[selectedLocation.type] }}
                      >
                        {selectedLocation.type}
                      </span>
                    )}
                  </div>
                </Popup>
              )}
            </Map>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for map state management
export function useTripMap(initialLocations: MapLocation[] = []) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [locations, setLocations] = useState<MapLocation[]>(initialLocations);

  const openMap = () => setIsMapOpen(true);
  const closeMap = () => setIsMapOpen(false);
  const toggleMap = () => setIsMapOpen((prev) => !prev);

  const addLocation = (location: MapLocation) => {
    setLocations((prev) => [...prev, location]);
  };

  const removeLocation = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLocation = (id: string, updates: Partial<MapLocation>) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  return {
    isMapOpen,
    locations,
    openMap,
    closeMap,
    toggleMap,
    addLocation,
    removeLocation,
    updateLocation,
    setLocations,
  };
}
