import type { LatLng } from "@/types";

export const STALE_AFTER_MS = 2 * 60_000;

export const isValidLatLng = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

export const googleMapsDirectionsUrl = (to: LatLng, from?: LatLng): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}${from ? `&origin=${from.lat},${from.lng}` : ""}&travelmode=driving`;

export const googleMapsPlaceUrl = (at: LatLng): string => `https://www.google.com/maps/search/?api=1&query=${at.lat},${at.lng}`;

/** Real provider distance in metres -> "850 m" / "4.3 km". */
export const formatDistance = (meters: number): string => (meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`);

/** Real provider duration in seconds -> "6 min" / "1 h 12 min". */
export function formatDuration(seconds: number): string {
  const min = Math.max(1, Math.round(seconds / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

export const clockTime = (date: Date | number | string, withSeconds = false): string =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", ...(withSeconds ? { second: "2-digit" } : {}) });

/** Whole seconds between two instants, never negative. */
export const secondsBetween = (later: number, earlier: number): number => Math.max(0, Math.round((later - earlier) / 1000));
