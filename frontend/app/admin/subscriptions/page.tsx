"use client";

import { UiIcon } from "@/components/layout/DockIcons";
import { useCallback, useEffect, useState } from "react";
import {
  adminListSubscriptions,
  adminRemindStudent,
  adminRemoveStudent,
  getAdminSecret,
} from "@/lib/api";
import type { AdminSubscriptionRecord } from "@/lib/types";
import { FormError } from "@/components/auth/DossierCard";
import { timeLeftLabel } from "@/lib/subscriptionTime";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { dateStyle: "medium" });
}

export default function AdminSubscriptionsPage() {
  const secret = getAdminSecret();
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [rows, setRows] = useState<AdminSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [reminderDraft, setReminderDraft] = useState<{ studentId: number; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError(null);
    try {
      const result = await adminListSubscriptions(secret, showExpiredOnly ? "expired" : undefined);
      setRows(result);
    } catch {
      setError("Couldn't load subscriptions. Your admin secret may be invalid.");
    } finally {
      setLoading(false);
    }
  }, [secret, showExpiredOnly]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after the request resolves
    load();
  }, [load]);

  async function handleRemove(studentId: number, studentName: string) {
    if (!secret) return;
    // Removal is manual-only by design (no automation deletes anyone) --
    // this confirm is the one deliberate step that does it.
    const confirmed = window.confirm(
      `Remove ${studentName}? This blocks their login immediately and kicks them out of their squad. Their history is kept -- you can restore them later from Student Records.`
    );
    if (!confirmed) return;

    setActingId(studentId);
    try {
      await adminRemoveStudent(secret, studentId);
      setToast(`${studentName} removed and taken out of their squad.`);
      await load();
    } catch {
      setError("Couldn't remove that student. Try again.");
    } finally {
      setActingId(null);
    }
  }

  async function handleSendReminder() {
    if (!secret || !reminderDraft) return;
    setActingId(reminderDraft.studentId);
    try {
      await adminRemindStudent(secret, reminderDraft.studentId, reminderDraft.text.trim() || undefined);
      setToast("Reminder sent -- it'll pop up next time they open the app.");
      setReminderDraft(null);
    } catch {
      setError("Couldn't send that reminder. Try again.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div>
          <p className="eyebrow text-cyan">Admin</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
            Subscriptions
          </h1>
          <p className="mt-2 text-sm text-text-dim">
            Every student with an approved mentor-fee payment or an invite free trial, soonest-to-expire first. Paid time stacks on top of any trial, so the end date is when their access really stops. Nothing here is
            removed automatically -- expiring or expired just means it&apos;s ready for you to review.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowExpiredOnly((v) => !v)}
            className={
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] transition-all " +
              (showExpiredOnly
                ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_-6px_rgba(99,102,241,0.7)]"
                : "border border-border bg-surface text-text-dim hover:text-text")
            }
          >
            {showExpiredOnly ? "Showing: Expired only" : "Show expired only"}
          </button>
        </div>

        <div className="mt-4">
          <FormError message={error} />
        </div>

        {toast && (
          <div className="mt-4 rounded-xl border border-emerald/40 bg-emerald/10 px-4 py-3.5 text-sm text-emerald">
            {toast}
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex flex-col gap-3">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
            <UiIcon name="inbox" className="h-7 w-7 text-text-faint" />
            <p className="text-sm text-text-dim">
              {showExpiredOnly ? "No expired subscriptions." : "No subscriptions or free trials yet."}
            </p>
          </div>
        ) : (
          <div className="card mt-6 divide-y divide-border-soft overflow-hidden">
            {rows.map((row) => {
              const time = timeLeftLabel(row.expires_at);
              const isRemoved = row.student_status === "removed";
              return (
                <div
                  key={row.student_id}
                  className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-bold text-text">{row.student_name}</span>
                      {isRemoved && <span className="badge badge-coral">removed</span>}
                    </div>
                    <span className="text-xs text-text-faint">{row.student_email}</span>
                    <div className="mt-1 text-sm text-text-dim">
                      {row.plan === "free_trial"
                        ? "Free trial (invited)"
                        : `${row.plan === "1_month" ? "1 Month" : "6 Months"} plan · ৳${row.amount}`}
                      {row.expires_at && <> · ends {formatDate(row.expires_at)}</>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        "badge " +
                        (time.tone === "coral" ? "badge-coral" : time.tone === "amber" ? "badge-amber" : "badge-emerald")
                      }
                    >
                      {time.label}
                    </span>

                    {!isRemoved && (
                      <>
                        <button
                          onClick={() => setReminderDraft({ studentId: row.student_id, text: "" })}
                          disabled={actingId === row.student_id}
                          className="btn btn-ghost !py-2 text-sm"
                          title="Pop a reminder up on this student's app"
                        >
                          Remind
                        </button>
                        <button
                          onClick={() => handleRemove(row.student_id, row.student_name)}
                          disabled={actingId === row.student_id}
                          className="btn btn-danger !py-2 text-sm"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reminderDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setReminderDraft(null)}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold text-text">Send a reminder</h2>
            <p className="mt-1 text-sm text-text-dim">
              This shows as a popup the next time this student opens the app.
            </p>
            <textarea
              value={reminderDraft.text}
              onChange={(e) => setReminderDraft({ ...reminderDraft, text: e.target.value })}
              placeholder="Your subscription is ending soon. Renew now to keep your squad access."
              rows={3}
              className="input mt-4 w-full resize-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReminderDraft(null)} className="btn btn-ghost !py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={actingId === reminderDraft.studentId}
                className="btn btn-primary !py-2 text-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
