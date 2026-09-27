"use client";

import { UiIcon } from "@/components/layout/DockIcons";
import { useState } from "react";
import {
  ApiError,
  adminRemoveStudent,
  adminRestoreStudent,
  adminSearchStudents,
  getAdminSecret,
} from "@/lib/api";
import type { AdminStudentRecord } from "@/lib/types";
import { timeLeftLabel } from "@/lib/subscriptionTime";

type Screen =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "results"; students: AdminStudentRecord[] }
  | { state: "no-results" }
  | { state: "error"; message: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { dateStyle: "medium" });
}

export default function AdminStudentsPage() {
  const [query, setQuery] = useState("");
  const [screen, setScreen] = useState<Screen>({ state: "idle" });
  const [actingId, setActingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const secret = getAdminSecret();
    const trimmed = query.trim();
    if (!secret || !trimmed) return;

    setScreen({ state: "loading" });
    setActionError(null);
    try {
      const students = await adminSearchStudents(secret, trimmed);
      setScreen({ state: "results", students });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setScreen({ state: "no-results" });
      } else {
        setScreen({
          state: "error",
          message: err instanceof ApiError ? err.message : "Couldn't search right now. Try again.",
        });
      }
    }
  }

  async function handleRemove(student: AdminStudentRecord) {
    const secret = getAdminSecret();
    if (!secret) return;
    // Manual-only by design -- this confirm is the one deliberate step
    // that actually removes access and pulls them from their squad.
    const confirmed = window.confirm(
      `Remove ${student.name}? This blocks their login immediately and kicks them out of their squad. Their history is kept -- you can restore them right here afterwards.`
    );
    if (!confirmed) return;

    setActingId(student.id);
    setActionError(null);
    try {
      await adminRemoveStudent(secret, student.id);
      setScreen((prev) =>
        prev.state === "results"
          ? {
              state: "results",
              students: prev.students.map((s) =>
                s.id === student.id ? { ...s, status: "removed", removed_at: new Date().toISOString(), squad: null } : s
              ),
            }
          : prev
      );
    } catch {
      setActionError("Couldn't remove that student. Try again.");
    } finally {
      setActingId(null);
    }
  }

  async function handleRestore(student: AdminStudentRecord) {
    const secret = getAdminSecret();
    if (!secret) return;

    setActingId(student.id);
    setActionError(null);
    try {
      await adminRestoreStudent(secret, student.id);
      setScreen((prev) =>
        prev.state === "results"
          ? {
              state: "results",
              students: prev.students.map((s) =>
                s.id === student.id ? { ...s, status: "active", removed_at: null } : s
              ),
            }
          : prev
      );
    } catch {
      setActionError("Couldn't restore that student. Try again.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow text-cyan">Admin</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          Student Records
        </h1>
        <p className="mt-2 text-sm text-text-dim">
          Look up a student by email, phone number, or payment transaction ID.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Email, phone number, or transaction ID"
            className="input flex-1"
            aria-label="Search students"
          />
          <button
            type="submit"
            disabled={!query.trim() || screen.state === "loading"}
            className="btn btn-primary shrink-0"
          >
            {screen.state === "loading" ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="mt-8">
          {actionError && (
            <div className="mb-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3.5 text-sm text-coral">
              {actionError}
            </div>
          )}

          {screen.state === "idle" && (
            <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
              <UiIcon name="search" className="h-7 w-7 text-text-faint" />
              <p className="text-sm text-text-dim">Enter an email, phone number, or transaction ID to search.</p>
            </div>
          )}

          {screen.state === "loading" && (
            <div className="flex flex-col gap-3">
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-24 w-full" />
            </div>
          )}

          {screen.state === "error" && (
            <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3.5 text-sm text-coral">
              {screen.message}
            </div>
          )}

          {screen.state === "no-results" && (
            <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
              <UiIcon name="inbox" className="h-7 w-7 text-text-faint" />
              <p className="text-sm text-text-dim">
                No student matched &quot;{query.trim()}&quot;. Double-check the email, phone number, or
                transaction ID.
              </p>
            </div>
          )}

          {screen.state === "results" && (
            <div className="flex flex-col gap-4">
              {screen.students.map((student) => (
                <div key={student.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-bold text-text">{student.name}</p>
                      <p className="text-sm text-text-dim">{student.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {student.status === "removed" && <span className="badge badge-coral">removed</span>}
                      <span className="badge badge-indigo">{student.matching_status}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <Field label="Institution" value={student.institution ?? "—"} />
                    <Field label="Year" value={student.year ?? "—"} />
                    <Field label="Group" value={student.academic_group ?? "—"} />
                    <Field label="Joined" value={formatDate(student.created_at)} />
                  </div>

                  <div className="mt-4 border-t border-border-soft pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Squad</p>
                    {student.squad ? (
                      <p className="mt-1.5 text-sm text-text">
                        {student.squad.academic_group} · {student.squad.year} —{" "}
                        <span className="text-text-dim">{student.squad.status}</span>
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm text-text-faint">Not in a squad yet.</p>
                    )}
                  </div>

                  <div className="mt-4 border-t border-border-soft pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">
                      Latest payment
                    </p>
                    {student.latest_payment ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <p className="text-sm text-text">
                          ৳{student.latest_payment.amount} · {student.latest_payment.method} · Trx{" "}
                          {student.latest_payment.trx_id} ·{" "}
                          <span
                            className={
                              student.latest_payment.status === "approved"
                                ? "text-emerald"
                                : student.latest_payment.status === "pending"
                                ? "text-cyan"
                                : "text-coral"
                            }
                          >
                            {student.latest_payment.status}
                          </span>
                        </p>
                        {student.latest_payment.status === "approved" &&
                          (() => {
                            const time = timeLeftLabel(student.latest_payment!.expires_at);
                            return (
                              <span
                                className={
                                  "badge " +
                                  (time.tone === "coral"
                                    ? "badge-coral"
                                    : time.tone === "amber"
                                    ? "badge-amber"
                                    : "badge-emerald")
                                }
                              >
                                {time.label}
                              </span>
                            );
                          })()}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-sm text-text-faint">No payment submitted yet.</p>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end border-t border-border-soft pt-4">
                    {student.status === "removed" ? (
                      <button
                        onClick={() => handleRestore(student)}
                        disabled={actingId === student.id}
                        className="btn btn-success !py-2 text-sm"
                      >
                        Restore access
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRemove(student)}
                        disabled={actingId === student.id}
                        className="btn btn-danger !py-2 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-faint">{label}</p>
      <p className="mt-0.5 font-medium text-text">{value}</p>
    </div>
  );
}
