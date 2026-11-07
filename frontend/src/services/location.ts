import api from "./api";
import type { LatLng, PlaceSuggestion, ReversePlace, RouteInfo, TrackingResponse } from "@/types";

// Worker: send one GPS fix for one of their own applications (the server checks ownership and consent).
export const sendLiveLocation = (applicationId: string, fix: { lat: number; lng: number; accuracy: number; recordedAt: number }): Promise<{ success: boolean; updatedAt: string }> =>
  api.put(`/api/location/applications/${applicationId}`, fix, true);

// Worker: driving route from the worker's position to the job's stored destination.
export const getRouteToJob = (applicationId: string, from: LatLng): Promise<RouteInfo> =>
  api.get(`/api/location/applications/${applicationId}/route?lat=${from.lat}&lng=${from.lng}`, true);

// Employer: the latest shared position for one of their own applications.
export const getTracking = (applicationId: string): Promise<TrackingResponse> => api.get(`/api/location/applications/${applicationId}`, true);

// Employer: address search / reverse lookup (proxied and rate-limited by the server).
export const searchPlaces = (q: string): Promise<{ results: PlaceSuggestion[] }> => api.get(`/api/location/search?q=${encodeURIComponent(q)}`, true);

export const reversePlace = (lat: number, lng: number): Promise<ReversePlace> => api.get(`/api/location/reverse?lat=${lat}&lng=${lng}`, true);
