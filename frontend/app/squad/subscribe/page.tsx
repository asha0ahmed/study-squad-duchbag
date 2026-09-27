"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getMySquad,
  getSession,
  getLatestPayment,
  needsProfiler,
  StoredSession,
  submitPayment,
} from "@/lib/api";
import type { Payment } from "@/lib/types";
import { timeLeftLabel } from "@/lib/subscriptionTime";
import { PaymentForm, PaymentFormInput } from "@/components/squad/PaymentForm";

type Screen =
  | { state: "loading" }
  // `payment` is the student's latest payment while they already have a
  // squad -- null if they've never paid (unusual but possible if an
  // admin matched them manually). Used to decide whether to show a renew
  // form inline, and to show a small "renewal pending" note.
  | { state: "has-squad"; payment: Payment | null }
  | { state: "form" }
  | { state: "pending"; payment: Payment }
  | { state: "rejected"; payment: Payment }
  | { state: "approved"; payment: Payment };

const ASSIGNMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Counts down from the moment the payment was submitted (created_at) --
// not from admin approval -- so it starts right after the student pays.
// Clamped at zero -- it never goes negative or wraps.
function getAssignmentCountdown(payment: Payment, now: number) {
  const submittedAt = new Date(payment.created_at).getTime();
  const remainingMs = Math.max(0, submittedAt + ASSIGNMENT_WINDOW_MS - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: remainingMs === 0,
  };
}

function two(n: number) {
  return n.toString().padStart(2, "0");
}

function AssignmentCountdown({ payment, now }: { payment: Payment; now: number }) {
  const countdown = getAssignmentCountdown(payment, now);
  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-2/70 px-5 py-6">
      <p className="text-sm font-semibold text-text-dim">
        You will be assigned to a squad within 24 hours
      </p>
      <div
        className="mt-4 flex items-center justify-center gap-1 font-display text-3xl font-extrabold tabular-nums text-text"
        role="timer"
        aria-live="polite"
        aria-label={`${countdown.hours} hours ${countdown.minutes} minutes ${countdown.seconds} seconds remaining`}
      >
        <span>{two(countdown.hours)}</span>
        <span className="text-text-faint">:</span>
        <span>{two(countdown.minutes)}</span>
        <span className="text-text-faint">:</span>
        <span>{two(countdown.seconds)}</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-6 text-[11px] uppercase tracking-[0.08em] text-text-faint">
        <span>Hours</span>
        <span>Minutes</span>
        <span>Seconds</span>
      </div>
      <p className="mt-4 text-xs text-text-faint">
        {countdown.expired
          ? "Any moment now -- we're checking automatically, no need to refresh."
          : "We're checking automatically in the background, no need to refresh."}
      </p>
    </div>
  );
}

/** True once an approved payment is close enough to (or past) its expiry that a renewal form should be offered. Matches the "urgent" cutoff used elsewhere (see lib/subscriptionTime). */
function needsRenewal(payment: Payment | null): boolean {
  if (!payment || payment.status !== "approved") return false;
  return timeLeftLabel(payment.expires_at).tone === "coral";
}

export default function SubscribePage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [screen, setScreen] = useState<Screen>({ state: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount
    setSession(s);
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (sessionChecked && (!session || session.role !== "student")) {
      router.replace("/auth");
    }
  }, [sessionChecked, session, router]);

  useEffect(() => {
    if (sessionChecked && needsProfiler(session)) router.replace("/profiler");
  }, [sessionChecked, session, router]);

  const load = useCallback(async () => {
    if (!session?.student) return;

    let hasSquad = true;
    try {
      await getMySquad(session.student.id);
    } catch {
      // 404 means no squad yet (expected -- fall through to payment check).
      // Any other error also falls through rather than getting stuck here.
      hasSquad = false;
    }

    try {
      const payment = await getLatestPayment(session.student.id);
      if (hasSquad) {
        setScreen({ state: "has-squad", payment });
      } else if (payment.status === "pending") {
        setScreen({ state: "pending", payment });
      } else if (payment.status === "rejected") {
        setScreen({ state: "rejected", payment });
      } else {
        setScreen({ state: "approved", payment });
      }
    } catch {
      // 404 means no payment submitted yet.
      if (hasSquad) setScreen({ state: "has-squad", payment: null });
      else setScreen({ state: "form" });
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only happens after the request resolves
    if (session?.student) load();
  }, [session, load]);

  // Countdown clock for the post-payment screens ("pending" and
  // "approved") -- ticks once a second only while one of those is
  // showing, so we're not running a timer in the background on every
  // other screen of this page.
  const showsCountdown = screen.state === "pending" || screen.state === "approved";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!showsCountdown) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [showsCountdown]);

  // While waiting on either post-payment screen, keep re-checking in the
  // background for a squad -- the moment one exists, `load()` flips
  // `screen` to "has-squad" and this screen is replaced automatically.
  useEffect(() => {
    if (!showsCountdown) return;
    const poll = setInterval(() => {
      load();
    }, 20000);
    return () => clearInterval(poll);
  }, [showsCountdown, load]);

  async function handleSubmit(input: PaymentFormInput) {
    if (!session?.student) return;
    setSubmitting(true);
    try {
      await submitPayment(session.student.id, input);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit your payment. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!sessionChecked || !session?.student || needsProfiler(session) || screen.state === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Loading…</p>
      </main>
    );
  }

  if (screen.state === "has-squad") {
    const { payment } = screen;

    if (needsRenewal(payment)) {
      const time = timeLeftLabel(payment!.expires_at);
      return (
        <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">
            <div className="mb-8 rounded-2xl border border-coral/40 bg-coral/10 px-5 py-4">
              <p className="text-sm font-semibold text-coral">
                {time.label === "No expiry on file"
                  ? "We couldn't find an expiry date on your subscription"
                  : `Your subscription ${time.label.toLowerCase()}`}
              </p>
              <p className="mt-1 text-sm text-text-dim">
                Renew below to keep your squad access uninterrupted -- nothing about your squad
                changes while this is pending review.
              </p>
            </div>
            <PaymentForm
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
              setError={setError}
              heading="Renew your subscription"
              subheading="Pick a plan, send the payment, and tell us the details below."
              submitLabel="Submit Renewal"
            />
          </div>
        </main>
      );
    }

    if (payment && payment.status === "pending") {
      return (
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="card w-full max-w-md px-6 py-8 text-center">
            <p className="eyebrow text-cyan">Renewal Submitted</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-text">
              We&apos;ve got your payment
            </h1>
            <p className="mt-3 text-sm text-text-dim">
              Trx ID <span className="font-semibold text-text">{payment.trx_id}</span> is being
              reviewed. Your squad access continues in the meantime.
            </p>
            <Link href="/squad" className="btn btn-primary mt-6 inline-flex">
              View Your Squad
            </Link>
          </div>
        </main>
      );
    }

    const time = payment?.status === "approved" ? timeLeftLabel(payment.expires_at) : null;
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card w-full max-w-md px-6 py-8 text-center">
          <p className="eyebrow text-emerald">You&apos;re already set</p>
          {time && (
            <p className="mt-2 text-xs text-text-faint">
              Subscription: <span className="text-text-dim">{time.label}</span>
            </p>
          )}
          <Link href="/squad" className="btn btn-primary mt-4 inline-flex">
            View Your Squad
          </Link>
        </div>
      </main>
    );
  }

  if (screen.state === "pending") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card w-full max-w-md px-6 py-8 text-center">
          <p className="eyebrow text-cyan">Awaiting Approval</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-text">
            We&apos;ve got your payment
          </h1>
          <p className="mt-3 text-sm text-text-dim">
            Trx ID <span className="font-semibold text-text">{screen.payment.trx_id}</span> is
            being reviewed. This is usually quick — check back shortly.
          </p>

          <AssignmentCountdown payment={screen.payment} now={now} />

          <button onClick={load} className="btn btn-secondary mt-6">
            Check Again
          </button>
        </div>
      </main>
    );
  }

  if (screen.state === "approved") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card w-full max-w-md px-6 py-8 text-center">
          <p className="eyebrow text-emerald">Payment Approved</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-text">You&apos;re all set</h1>

          <AssignmentCountdown payment={screen.payment} now={now} />

          <Link href="/squad/find" className="btn btn-primary mt-6 inline-flex">
            Find My Squad
          </Link>
        </div>
      </main>
    );
  }

  // screen.state === "form" or "rejected"
  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        {screen.state === "rejected" && (
          <div className="mb-8 rounded-2xl border border-coral/40 bg-coral/10 px-5 py-4">
            <p className="text-sm font-semibold text-coral">
              Your last payment couldn&apos;t be verified
            </p>
            <p className="mt-1 text-sm text-text-dim">Double-check the details below and submit again.</p>
          </div>
        )}

        <PaymentForm onSubmit={handleSubmit} submitting={submitting} error={error} setError={setError} />
      </div>
    </main>
  );
}
