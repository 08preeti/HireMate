// Map, GPS, routing and live-tracking types.
import type { LatLng } from "./auth";

export type LatLngTuple = [number, number];

/** A route from the routing provider: real distance / duration and a [lat, lng] polyline. */
export interface RouteInfo {
  destination: LatLng;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: LatLngTuple[];
  steps: string[];
}

/** The latest position a worker chose to share for one application. */
export interface LiveLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  updatedAt?: string;
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

export type MarkerKind = "worker" | "workerStale" | "destination" | "pin";

export interface MapMarker {
  id: string;
  position: LatLngTuple;
  kind: MarkerKind;
  label?: string;
}
