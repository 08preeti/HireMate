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