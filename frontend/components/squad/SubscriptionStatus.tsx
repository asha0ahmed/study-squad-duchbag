"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLatestPayment } from "@/lib/api";
import { timeLeftLabel } from "@/lib/subscriptionTime";

/**
 * Shows the student their own subscription time-left, fetched from
 * GET /students/:id/payments/latest -- the same expires_at the admin
 * sees, just from the other side. Renders nothing if there's no
 * approved payment on file yet, or once we're plenty far from expiry --
 * a quiet strip most of the time, an unmissable banner near the end.
 */
export function SubscriptionStatus({ studentId }: { studentId: number }) {
  const [state, setState] = useState<{ expiresAt: string | null } | null | "none">(null);

  useEffect(() => {
    let cancelled = false;
    getLatestPayment(studentId)
      .then((payment) => {
        if (cancelled) return;
        if (payment.status === "approved") setState({ expiresAt: payment.expires_at });
        else setState("none");
      })
      .catch(() => {
        if (!cancelled) setState("none");
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (state === null || state === "none") return null;

  const time = timeLeftLabel(state.expiresAt);
  const urgent = time.tone === "coral";

  if (!urgent) {
    // Plenty of time left -- a quiet one-liner, not a banner.
    return (
      <p className="mt-2 text-xs text-text-faint">
        Subscription: <span className="text-text-dim">{time.label}</span>
      </p>
    );
  }

  return (
    <div className="animate-fade-in-up relative mt-6 overflow-hidden rounded-2xl border border-coral/35 bg-coral/[0.06] px-5 py-4">
      <div className="glow-orb h-32 w-32 bg-coral/25" style={{ top: "-2rem", right: "-2rem" }} />
      <div className="relative z-10">
        <p className="eyebrow text-coral">Subscription</p>
        <p className="mt-1.5 text-sm text-text">
          {time.label === "No expiry on file"
            ? "We couldn't find an expiry date on your subscription."
            : `Your mentor-fee subscription ${time.label.toLowerCase()}.`}{" "}
          Renew to keep your squad access uninterrupted.
        </p>
        <Link href="/squad/subscribe" className="btn btn-danger mt-3.5 inline-flex !py-2 text-sm">
          Renew Now
        </Link>
      </div>
    </div>
  );
}
