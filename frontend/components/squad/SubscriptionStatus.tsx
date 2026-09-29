"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSubscription } from "@/lib/api";
import type { SubscriptionInfo } from "@/lib/types";
import { timeLeftLabel } from "@/lib/subscriptionTime";

/**
 * Shows the student their own subscription state -- free trial, paid, or
 * ended -- fetched from GET /students/:id/subscription (the same end date
 * the admin sees, with trial and paid time stacked). A quiet one-liner
 * while there's plenty of time, an unmissable banner near the end or once
 * it has ended.
 */
export function SubscriptionStatus({ studentId }: { studentId: number }) {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSubscription(studentId)
      .then((info) => {
        if (!cancelled) setSub(info);
      })
      .catch(() => {
        if (!cancelled) setSub(null);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (!sub || sub.status === "none") return null;

  const expired = sub.status === "expired";
  const time = timeLeftLabel(sub.expires_at);
  const urgent = expired || time.tone === "coral";
  const isTrial = sub.status === "trial";

  if (!urgent) {
    // Plenty of time left -- a quiet one-liner, not a banner.
    return (
      <p className="mt-2 text-xs text-text-faint">
        {isTrial ? "Free trial" : "Subscription"}: <span className="text-text-dim">{time.label}</span>
      </p>
    );
  }

  return (
    <div className="animate-fade-in-up relative mt-6 overflow-hidden rounded-2xl border border-coral/35 bg-coral/[0.06] px-5 py-4">
      <div className="glow-orb h-32 w-32 bg-coral/25" style={{ top: "-2rem", right: "-2rem" }} />
      <div className="relative z-10">
        <p className="eyebrow text-coral">{isTrial ? "Free trial" : "Subscription"}</p>
        <p className="mt-1.5 text-sm text-text">
          {expired
            ? "Your subscription has ended."
            : isTrial
              ? `Your free trial ${time.label.toLowerCase()}.`
              : `Your subscription ${time.label.toLowerCase()}.`}{" "}
          {expired
            ? "Renew to get your squad, notes and tasks back."
            : "Subscribe now to keep your squad access uninterrupted."}
        </p>
        <Link href="/squad/subscribe" className="btn btn-danger mt-3.5 inline-flex !py-2 text-sm">
          {expired ? "Renew Now" : isTrial ? "Subscribe Now" : "Extend Now"}
        </Link>
      </div>
    </div>
  );
}
