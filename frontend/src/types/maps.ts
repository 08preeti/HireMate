// Map, GPS, routing and live-tracking types.
import type { LatLng } from "./auth";

export type LatLngTuple = [number, number];

export interface DetailedStep {
  instruction: string;
  type: string;
  modifier?: string;
  distanceMeters: number;
  durationSeconds: number;
  streetName?: string;
  location?: LatLngTuple | null;
}

/** A route from the routing provider: real distance / duration and a [lat, lng] polyline. */
export interface RouteInfo {
  destination: LatLng;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: LatLngTuple[];
  steps: string[];
  /** [lat, lng] of each step's maneuver, same order as `steps`. */
  stepLocations?: (LatLngTuple | null)[];
  detailedSteps?: DetailedStep[];
}

/** The latest position a worker chose to share for one application. */
export interface LiveLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  updatedAt?: string;
  /** Where this sharing period began. */
  start?: LatLng | null;
}

export type SharingState = "active" | "not_enabled" | "ended";

export interface TrackingResponse {
  applicationId: string;
  serverTime: string;
  status: string;
  completionRequested: boolean;
  sharing: SharingState;
  location: LiveLocation | null;
  stale: boolean;
  destination: LatLng | null;
}

export interface PlaceSuggestion {
  label: string;
  short: string;
  lat: number;
  lng: number;
}

export interface ReversePlace {
  label: string;
  postalCode: string;
  city: string;
  state: string;
}

export type MarkerKind =
  | "worker"
  | "workerStale"
  | "destination"
  | "pin"
  | "start";

export type LocationStatus =
  | "live"
  | "stale"
  | "waiting"
  | "off"
  | "ended"
  | "denied"
  | "unavailable";
export type RouteStatus =
  | "idle"
  | "calculating"
  | "onRoute"
  | "rerouting"
  | "offRoute"
  | "unavailable";

export type MapTheme = "day" | "night";

export interface MapMarker {
  id: string;
  position: LatLngTuple;
  kind: MarkerKind;
  label?: string;
  sublabel?: string;
  heading?: number | null;
  speed?: number | null;
}
