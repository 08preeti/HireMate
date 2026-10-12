// Routing / map helpers.

export type LatLngTuple = [number, number];

export interface RouteResult {
  coords: LatLngTuple[];
  distKm: string;
  timeMin: number;
  steps: string[];
}
