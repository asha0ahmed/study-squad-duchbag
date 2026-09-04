"use client";

import { useState } from "react";
import { ApiError, adminSearchStudents, getAdminSecret } from "@/lib/api";
import type { AdminStudentRecord } from "@/lib/types";

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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const secret = getAdminSecret();
    const trimmed = query.trim();
    if (!secret || !trimmed) return;

    setScreen({ state: "loading" });
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
          {screen.state === "idle" && (
            <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
              <span className="text-2xl">🔍</span>
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
              <span className="text-2xl">📭</span>
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
                    <span className="badge badge-indigo">{student.matching_status}</span>
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
                      <p className="mt-1.5 text-sm text-text">
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
                    ) : (
                      <p className="mt-1.5 text-sm text-text-faint">No payment submitted yet.</p>
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
