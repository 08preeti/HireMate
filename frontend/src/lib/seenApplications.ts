// Remembers how many applications the employer has already looked at, so the red
// badge on "Applications" only counts NEW ones. Stored per employer in this browser.

const key = (employerId?: string) => `hm_seen_applications_${employerId || "employer"}`;

/** How many applications the employer had seen the last time they opened the Applications page. */
export function getSeenCount(employerId?: string): number {
  try {
    return Number(window.localStorage.getItem(key(employerId))) || 0;
  } catch {
    return 0;
  }
}

/** Call when the Applications page has loaded — everything listed there counts as seen. */
export function markApplicationsSeen(employerId: string | undefined, total: number): void {
  try {
    window.localStorage.setItem(key(employerId), String(total));
  } catch {
    /* storage unavailable — ignore */
  }
}

const viewedKey = (employerId?: string) => `hm_viewed_application_ids_${employerId || "employer"}`;

/** Ids of the applications the employer has opened in the details view. */
export function getViewedIds(employerId?: string): string[] {
  try {
    const raw = window.localStorage.getItem(viewedKey(employerId));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function markApplicationViewed(employerId: string | undefined, id: string): string[] {
  const ids = getViewedIds(employerId);
  if (ids.includes(id)) return ids;
  const next = [...ids, id];
  try {
    window.localStorage.setItem(viewedKey(employerId), JSON.stringify(next));
  } catch {
    /* storage unavailable — ignore */
  }
  return next;
}
