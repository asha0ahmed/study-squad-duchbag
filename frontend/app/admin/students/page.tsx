"use client";

import { UiIcon } from "@/components/layout/DockIcons";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  adminListStudents,
  adminRemoveStudent,
  adminRestoreStudent,
  adminSearchStudents,
  getAdminSecret,
} from "@/lib/api";
import type { AdminStudentRecord } from "@/lib/types";
import { timeLeftLabel } from "@/lib/subscriptionTime";

const PAGE_SIZE = 20;

// "browse" is the default -- every student, newest first, paginated.
// "search" takes over once the admin submits a non-empty query, and
// stays active (even across an empty result) until they clear it.
type Browse =
  | { status: "loading" }
  | { status: "loaded"; students: AdminStudentRecord[]; total: number }
  | { status: "error"; message: string };

type Search =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; students: AdminStudentRecord[] }
  | { status: "no-results"; query: string }
  | { status: "error"; message: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { dateStyle: "medium" });
}

export default function AdminStudentsPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"browse" | "search">("browse");
  const [browse, setBrowse] = useState<Browse>({ status: "loading" });
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const [actingId, setActingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadBrowsePage = useCallback(async (append: boolean) => {
    const secret = getAdminSecret();
    if (!secret) return;
    if (!append) setBrowse({ status: "loading" });
    try {
      const offset = append && browse.status === "loaded" ? browse.students.length : 0;
      const result = await adminListStudents(secret, PAGE_SIZE, offset);
      setBrowse((prev) => ({
        status: "loaded",
        total: result.total,
        students: append && prev.status === "loaded" ? [...prev.students, ...result.students] : result.students,
      }));
    } catch (err) {
      setBrowse({
        status: "error",
        message: err instanceof ApiError ? err.message : "Couldn't load student records.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads browse.students.length as a snapshot for the offset, not a reactive dependency; re-running this on every page load would refetch page 1 repeatedly
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only after the request resolves
    loadBrowsePage(false);
  }, [loadBrowsePage]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const secret = getAdminSecret();
    const trimmed = query.trim();
    if (!secret || !trimmed) return;

    setMode("search");
    setSearch({ status: "loading" });
    setActionError(null);
    try {
      const students = await adminSearchStudents(secret, trimmed);
      setSearch({ status: "results", students });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSearch({ status: "no-results", query: trimmed });
      } else {
        setSearch({
          status: "error",
          message: err instanceof ApiError ? err.message : "Couldn't search right now. Try again.",
        });
      }
    }
  }

  function handleClearSearch() {
    setQuery("");
    setMode("browse");
    setSearch({ status: "idle" });
  }

  // Whichever list is currently on screen -- used so Remove/Restore can
  // patch the right one in place without needing to know which mode is
  // active at the call site.
  function patchVisibleStudent(id: number, patch: Partial<AdminStudentRecord>) {
    setBrowse((prev) =>
      prev.status === "loaded"
        ? { ...prev, students: prev.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) }
        : prev
    );
    setSearch((prev) =>
      prev.status === "results"
        ? { ...prev, students: prev.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) }
        : prev
    );
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
      patchVisibleStudent(student.id, { status: "removed", removed_at: new Date().toISOString(), squad: null });
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
      patchVisibleStudent(student.id, { status: "active", removed_at: null });
    } catch {
      setActionError("Couldn't restore that student. Try again.");
    } finally {
      setActingId(null);
    }
  }

  const visibleStudents =
    mode === "search" && search.status === "results"
      ? search.students
      : browse.status === "loaded"
      ? browse.students
      : null;

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow text-cyan">Admin</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          Student Records
        </h1>
        <p className="mt-2 text-sm text-text-dim">
          Every student is listed below, newest first. Search narrows it down to one match by email,
          phone number, or payment transaction ID.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Email, phone number, or transaction ID"
            className="input flex-1"
            aria-label="Search students"
          />
          {mode === "search" ? (
            <button type="button" onClick={handleClearSearch} className="btn btn-ghost shrink-0">
              Clear
            </button>
          ) : (
            <button
              type="submit"
              disabled={!query.trim() || search.status === "loading"}
              className="btn btn-primary shrink-0"
            >
              {search.status === "loading" ? "Searching…" : "Search"}
            </button>
          )}
        </form>

        <div className="mt-8">
          {actionError && (
            <div className="mb-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3.5 text-sm text-coral">
              {actionError}
            </div>
          )}

          {mode === "search" && search.status === "error" && (
            <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3.5 text-sm text-coral">
              {search.message}
            </div>
          )}

          {mode === "search" && search.status === "no-results" && (
            <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
              <UiIcon name="inbox" className="h-7 w-7 text-text-faint" />
              <p className="text-sm text-text-dim">
                No student matched &quot;{search.query}&quot;. Double-check the email, phone number, or
                transaction ID.
              </p>
              <button onClick={handleClearSearch} className="btn btn-ghost mt-2 !py-2 text-sm">
                Back to all students
              </button>
            </div>
          )}

          {mode === "browse" && browse.status === "error" && (
            <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3.5 text-sm text-coral">
              {browse.message}
            </div>
          )}

          {(mode === "search" ? search.status === "loading" : browse.status === "loading") && (
            <div className="flex flex-col gap-3">
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-24 w-full" />
            </div>
          )}

          {visibleStudents && (
            <>
              {mode === "browse" && browse.status === "loaded" && (
                <p className="mb-3 text-xs text-text-faint">
                  Showing {browse.students.length} of {browse.total}
                </p>
              )}

              {visibleStudents.length === 0 ? (
                <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
                  <UiIcon name="inbox" className="h-7 w-7 text-text-faint" />
                  <p className="text-sm text-text-dim">No students have signed up yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {visibleStudents.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      acting={actingId === student.id}
                      onRemove={() => handleRemove(student)}
                      onRestore={() => handleRestore(student)}
                    />
                  ))}
                </div>
              )}

              {mode === "browse" && browse.status === "loaded" && browse.students.length < browse.total && (
                <button onClick={() => loadBrowsePage(true)} className="btn btn-ghost mt-5 w-full">
                  Load More
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function StudentCard({
  student,
  acting,
  onRemove,
  onRestore,
}: {
  student: AdminStudentRecord;
  acting: boolean;
  onRemove: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="card p-5">
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
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Latest payment</p>
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
                      (time.tone === "coral" ? "badge-coral" : time.tone === "amber" ? "badge-amber" : "badge-emerald")
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
          <button onClick={onRestore} disabled={acting} className="btn btn-success !py-2 text-sm">
            Restore access
          </button>
        ) : (
          <button onClick={onRemove} disabled={acting} className="btn btn-danger !py-2 text-sm">
            Remove
          </button>
        )}
      </div>
    </div>
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
