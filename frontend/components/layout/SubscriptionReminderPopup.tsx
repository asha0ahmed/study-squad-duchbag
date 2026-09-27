"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dismissReminder, getSession, getUnseenReminder, StoredSession } from "@/lib/api";
import type { AdminReminder } from "@/lib/types";

/**
 * Surfaces an admin-sent reminder (e.g. "your subscription is ending
 * soon") as a popup the next time a logged-in student opens the app.
 * Checked once per route change rather than continuously polled -- a
 * reminder isn't urgent enough to justify a running interval, and the
 * student naturally navigates often enough to see it promptly.
 */
export function SubscriptionReminderPopup() {
  const pathname = usePathname();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [reminder, setReminder] = useState<AdminReminder | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system on route change
    setSession(getSession());
  }, [pathname]);

  useEffect(() => {
    if (!session?.student || pathname.startsWith("/admin")) return;
    let cancelled = false;
    getUnseenReminder(session.student.id)
      .then((result) => {
        if (!cancelled) setReminder(result);
      })
      .catch(() => {
        // No student is blocked by a failed reminder check -- fail silent.
      });
    return () => {
      cancelled = true;
    };
  }, [session, pathname]);

  async function handleDismiss() {
    if (!session?.student || !reminder) return;
    setDismissing(true);
    try {
      await dismissReminder(session.student.id, reminder.id);
    } catch {
      // If the dismiss call fails, still close the popup locally -- it'll
      // just show again on the next route change, which is harmless.
    } finally {
      setDismissing(false);
      setReminder(null);
    }
  }

  if (!reminder || pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber/10">
          <span className="text-xl">⏰</span>
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-text">A reminder from Study Squad</h2>
        <p className="mt-2 text-sm text-text-dim">{reminder.message}</p>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="btn btn-primary mt-5 w-full !py-2.5 text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
