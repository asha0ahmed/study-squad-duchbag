"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getSession, needsProfiler, submitComplaint } from "@/lib/api";
import type { StoredSession } from "@/lib/api";

const MAX_COMPLAINT_LENGTH = 5000;

export default function ComplaintsPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [complaintText, setComplaintText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentSession = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount
    setSession(currentSession);
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    if (!session || session.role !== "student") {
      router.replace("/auth");
    } else if (needsProfiler(session)) {
      router.replace("/profiler");
    }
  }, [sessionChecked, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const text = complaintText.trim();
    if (!text) {
      setError("Please write your complaint before submitting.");
      return;
    }

    if (text.length > MAX_COMPLAINT_LENGTH) {
      setError(`Your complaint must be ${MAX_COMPLAINT_LENGTH} characters or fewer.`);
      return;
    }

    if (!session?.student) return;

    setSubmitting(true);
    try {
      await submitComplaint(session.student.id, text);
      setComplaintText("");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit your complaint. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!sessionChecked || !session?.student || needsProfiler(session)) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <Link href="/squad" className="text-sm font-semibold text-cyan hover:text-text">
          ← Back to My Squad
        </Link>

        <p className="eyebrow mt-8 text-cyan">Student Support</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          Submit a complaint
        </h1>
        <p className="mt-3 text-text-dim">
          Tell the admin team what went wrong. Your complaint will be sent securely for review.
        </p>

        {submitted && (
          <div className="mt-8 rounded-2xl border border-emerald/40 bg-emerald/10 px-5 py-4">
            <p className="text-sm font-semibold text-emerald">Complaint submitted successfully.</p>
            <p className="mt-1 text-sm text-text-dim">The admin team can now review your message.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label htmlFor="complaint_text" className="field-label">
            Complaint
          </label>
          <textarea
            id="complaint_text"
            value={complaintText}
            onChange={(e) => {
              setComplaintText(e.target.value);
              if (submitted) setSubmitted(false);
              if (error) setError(null);
            }}
            placeholder="Write your complaint here..."
            rows={8}
            maxLength={MAX_COMPLAINT_LENGTH}
            className="input min-h-48 resize-y"
            required
          />
          <div className="flex items-center justify-between gap-4 text-xs text-text-faint">
            <span>Your message is limited to {MAX_COMPLAINT_LENGTH} characters.</span>
            <span>{complaintText.length}/{MAX_COMPLAINT_LENGTH}</span>
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}

          <button type="submit" disabled={submitting} className="btn btn-primary self-start">
            {submitting ? "Submitting…" : "Submit Complaint"}
          </button>
        </form>
      </div>
    </main>
  );
}
