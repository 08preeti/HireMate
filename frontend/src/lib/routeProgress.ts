import type { LatLngTuple, RouteInfo } from "@/types";
// Same great-circle formula as lib/geo.ts, kept local so this file has no runtime imports (and can be unit-tested directly).
function toMeters(a: LatLngTuple, b: LatLngTuple): number {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** A route polyline with the distance travelled up to each of its points, so progress is a cheap lookup. */
export interface MeasuredRoute {
  coords: LatLngTuple[];
  cumulative: number[];
  totalMeters: number;
}

export function measureRoute(coords: LatLngTuple[]): MeasuredRoute {
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) cumulative.push(cumulative[i - 1] + toMeters(coords[i - 1], coords[i]));
  return { coords, cumulative, totalMeters: cumulative[cumulative.length - 1] ?? 0 };
}

export interface RoutePosition {
  /** Index of the polyline point just before the closest spot. */
  segment: number;
  /** The closest spot on the route itself. */
  snapped: LatLngTuple;
  /** How far the position is from the route, in metres. */
  offRouteMeters: number;
  /** How far along the route the closest spot is, in metres. */
  alongMeters: number;
}

/** Closest spot on the route to a position. Uses a flat local approximation, which is exact enough for road segments. */
export function locateOnRoute(route: MeasuredRoute, point: LatLngTuple): RoutePosition | null {
  const { coords, cumulative } = route;
  if (coords.length < 2) return null;
  const cosLat = Math.cos((point[0] * Math.PI) / 180);
  let best: RoutePosition | null = null;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const ax = (a[1] - point[1]) * cosLat;
    const ay = a[0] - point[0];
    const dx = (b[1] - a[1]) * cosLat;
    const dy = b[0] - a[0];
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const snapped: LatLngTuple = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const off = toMeters(point, snapped);
    if (!best || off < best.offRouteMeters) {
      best = { segment: i, snapped, offRouteMeters: off, alongMeters: cumulative[i] + toMeters(a, snapped) };
    }
  }
  return best;
}

export interface RouteProgress {
  /** Part already travelled (route start to the closest spot). */
  done: LatLngTuple[];
  /** Part still to go (closest spot to the destination). */
  remaining: LatLngTuple[];
  remainingMeters: number;
  remainingSeconds: number;
  offRouteMeters: number;
  position: RoutePosition;
}

/** Splits the route at the position and scales the provider's real distance / duration by the share that is left. */
export function routeProgress(route: MeasuredRoute, info: Pick<RouteInfo, "distanceMeters" | "durationSeconds">, point: LatLngTuple): RouteProgress | null {
  const position = locateOnRoute(route, point);
  if (!position) return null;
  const share = route.totalMeters > 0 ? Math.max(0, Math.min(1, 1 - position.alongMeters / route.totalMeters)) : 0;
  return {
    done: [...route.coords.slice(0, position.segment + 1), position.snapped],
    remaining: [position.snapped, ...route.coords.slice(position.segment + 1)],
    remainingMeters: Math.round(info.distanceMeters * share),
    remainingSeconds: Math.round(info.durationSeconds * share),
    offRouteMeters: position.offRouteMeters,
    position,
  };
}

/** The first instruction whose maneuver is still ahead of the position (never the "depart" step at index 0). */
export function nextInstruction(route: MeasuredRoute, info: Pick<RouteInfo, "steps" | "stepLocations">, alongMeters: number): { text: string; inMeters: number } | null {
  const locations = info.stepLocations;
  if (!locations) return info.steps[1] ? { text: info.steps[1], inMeters: 0 } : null;
  for (let i = 1; i < info.steps.length; i++) {
    const at = locations[i];
    if (!at) continue;
    const stepPos = locateOnRoute(route, at);
    if (stepPos && stepPos.alongMeters > alongMeters + 15) return { text: info.steps[i], inMeters: Math.round(stepPos.alongMeters - alongMeters) };
  }
  return null;
}

/** How far from the route counts as "left the route": a little more when the GPS itself is imprecise. */
export const offRouteLimit = (accuracyMeters?: number | null): number => Math.min(150, Math.max(50, (accuracyMeters ?? 0) * 1.5));
