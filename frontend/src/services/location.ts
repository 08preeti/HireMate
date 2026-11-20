import api from "./api";
import type {
  LatLng,
  PlaceSuggestion,
  ReversePlace,
  RouteInfo,
  TrackingResponse,
} from "@/types";

// Worker: send one GPS fix for one of their own applications (the server checks ownership and consent).
export const sendLiveLocation = (
  applicationId: string,
  fix: { lat: number; lng: number; accuracy: number; recordedAt: number },
): Promise<{ success: boolean; updatedAt: string }> =>
  api.put(`/api/location/applications/${applicationId}`, fix, true);

// Worker: driving route from the worker's position to the job's stored destination.
export const getRouteToJob = (
  applicationId: string,
  from: LatLng,
): Promise<RouteInfo> =>
  api.get(
    `/api/location/applications/${applicationId}/route?lat=${from.lat}&lng=${from.lng}`,
    true,
  );

// Employer: the latest shared position for one of their own applications.
export const getTracking = (applicationId: string): Promise<TrackingResponse> =>
  api.get(`/api/location/applications/${applicationId}`, true);

// Employer: driving route from the worker's last shared position to the job pin (both ends come from the server).
export const getTrackedRoute = (applicationId: string): Promise<RouteInfo> =>
  api.get(`/api/location/applications/${applicationId}/track/route`, true);

// Employer: address search / reverse lookup (proxied and rate-limited by the server).
// `near` biases results toward where the employer is looking (like Google Maps does).
export const searchPlaces = (
  q: string,
  near?: LatLng | null,
): Promise<{ results: PlaceSuggestion[] }> =>
  api.get(
    `/api/location/search?q=${encodeURIComponent(q)}${
      near ? `&lat=${near.lat}&lng=${near.lng}` : ""
    }`,
    true,
  );

export const reversePlace = (lat: number, lng: number): Promise<ReversePlace> =>
  api.get(`/api/location/reverse?lat=${lat}&lng=${lng}`, true);

// Worker: driving route preview from the worker's position to a job's stored pin (job details page, before applying).
export const getJobRoutePreview = (
  jobId: string,
  from: LatLng,
): Promise<RouteInfo> =>
  api.get(
    `/api/location/jobs/${jobId}/route?lat=${from.lat}&lng=${from.lng}`,
    true,
  );
