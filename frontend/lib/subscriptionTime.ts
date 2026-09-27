export type TimeLeftTone = "coral" | "amber" | "emerald";

/** Whole days left until `expiresAt`. Negative means already expired. */
export function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Human label + color tone for a subscription's remaining time, shared by
 * the Subscriptions overview and Student Records pages so "how much time
 * is left" always reads the same way in both places.
 */
export function timeLeftLabel(expiresAt: string | null): { label: string; tone: TimeLeftTone } {
  if (!expiresAt) return { label: "No expiry on file", tone: "coral" };
  const days = daysLeft(expiresAt);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, tone: "coral" };
  if (days === 0) return { label: "Expires today", tone: "coral" };
  if (days <= 3) return { label: `${days}d left`, tone: "coral" };
  if (days <= 7) return { label: `${days}d left`, tone: "amber" };
  return { label: `${days}d left`, tone: "emerald" };
}
