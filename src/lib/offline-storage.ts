import { get, set, del, keys, clear } from "idb-keyval";

// Offline storage using IndexedDB via idb-keyval
// Used for caching trip data and queuing messages when offline

export interface QueuedMessage {
  id: string;
  tripId: string;
  content: string;
  createdAt: string;
  type: "message" | "proposal";
}

export interface CachedTrip {
  id: string;
  data: unknown;
  cachedAt: string;
}

const QUEUED_MESSAGES_KEY = "roamiii:queued_messages";
const TRIP_CACHE_PREFIX = "roamiii:trip:";

// Message queue for offline support
export async function queueMessage(message: QueuedMessage): Promise<void> {
  const messages = await getQueuedMessages();
  messages.push(message);
  await set(QUEUED_MESSAGES_KEY, messages);
}

export async function getQueuedMessages(): Promise<QueuedMessage[]> {
  const messages = await get<QueuedMessage[]>(QUEUED_MESSAGES_KEY);
  return messages ?? [];
}

export async function removeQueuedMessage(id: string): Promise<void> {
  const messages = await getQueuedMessages();
  const filtered = messages.filter((m) => m.id !== id);
  await set(QUEUED_MESSAGES_KEY, filtered);
}

export async function clearQueuedMessages(): Promise<void> {
  await del(QUEUED_MESSAGES_KEY);
}

// Trip cache for offline viewing
export async function cacheTrip(tripId: string, data: unknown): Promise<void> {
  const cached: CachedTrip = {
    id: tripId,
    data,
    cachedAt: new Date().toISOString(),
  };
  await set(`${TRIP_CACHE_PREFIX}${tripId}`, cached);
}

export async function getCachedTrip(tripId: string): Promise<CachedTrip | null> {
  const cached = await get<CachedTrip>(`${TRIP_CACHE_PREFIX}${tripId}`);
  return cached ?? null;
}

export async function removeCachedTrip(tripId: string): Promise<void> {
  await del(`${TRIP_CACHE_PREFIX}${tripId}`);
}

export async function getAllCachedTripIds(): Promise<string[]> {
  const allKeys = await keys();
  return allKeys
    .filter((key) => String(key).startsWith(TRIP_CACHE_PREFIX))
    .map((key) => String(key).replace(TRIP_CACHE_PREFIX, ""));
}

// Clear all offline data
export async function clearAllOfflineData(): Promise<void> {
  await clear();
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online/offline events
export function onOnlineStatusChange(
  callback: (isOnline: boolean) => void
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
