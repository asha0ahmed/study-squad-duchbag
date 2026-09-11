"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getSession,
  markStudentProfileComplete,
  saveStudentSubjects,
  StoredSession,
} from "@/lib/api";
import { SUBJECTS_BY_GROUP } from "@/lib/subjects";
import type { AcademicGroup, ImprovementPriority } from "@/lib/types";
import { StampToggleGroup } from "@/components/profiler/StampToggleGroup";
import { FormError, SubmitButton } from "@/components/auth/DossierCard";

// How many subjects a student must pick and rate, per group. A group not
// listed here (Science, Arts) has no cap -- every subject in
// SUBJECTS_BY_GROUP is required, exactly as before. Commerce has a
// 9-subject pool but only asks for 6, so it needs an explicit pick step.
const REQUIRED_SUBJECT_COUNT: Partial<Record<AcademicGroup, number>> = {
  Commerce: 6,
};

const PROFICIENCY_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: String(n),
}));

const PRIORITY_OPTIONS: { value: ImprovementPriority; label: string }[] = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];

interface SubjectRowState {
  selected: boolean;
  proficiency: number | null;
  improvement_priority: ImprovementPriority | null;
}

export default function ProfilerPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [rows, setRows] = useState<Record<number, SubjectRowState>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount
    setSession(s);
    setChecked(true);
  }, []);

  useEffect(() => {
    if (checked && (!session || session.role !== "student")) {
      router.replace("/auth");
    }
  }, [checked, session, router]);

  const group = session?.student?.academic_group ?? null;
  const subjects = useMemo(() => (group ? SUBJECTS_BY_GROUP[group] : []), [group]);

  // No cap (Science, Arts) -> every subject is required, exactly as
  // before. A cap (Commerce) -> student picks that many out of the pool.
  const requiredCount = group ? (REQUIRED_SUBJECT_COUNT[group] ?? subjects.length) : 0;
  const selectionActive = subjects.length > requiredCount;
  const selectedCount = subjects.filter((s) => rows[s.id]?.selected).length;

  function toggleSelected(subjectId: number) {
    setRows((prev) => {
      const wasSelected = prev[subjectId]?.selected ?? false;
      if (!wasSelected && selectedCount >= requiredCount) {
        // Cap already reached -- ignore, don't let a 7th subject in.
        return prev;
      }
      return {
        ...prev,
        [subjectId]: {
          selected: !wasSelected,
          proficiency: prev[subjectId]?.proficiency ?? null,
          improvement_priority: prev[subjectId]?.improvement_priority ?? null,
        },
      };
    });
  }

  function setProficiency(subjectId: number, value: string) {
    setRows((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        selected: selectionActive ? (prev[subjectId]?.selected ?? false) : true,
        proficiency: Number(value),
        improvement_priority: prev[subjectId]?.improvement_priority ?? null,
      },
    }));
  }

  function setPriority(subjectId: number, value: ImprovementPriority) {
    setRows((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        selected: selectionActive ? (prev[subjectId]?.selected ?? false) : true,
        improvement_priority: value,
        proficiency: prev[subjectId]?.proficiency ?? null,
      },
    }));
  }

  // The subjects that actually need (and will be saved with) ratings:
  // every subject when there's no cap, or just the picked ones when there is.
  const activeSubjects = selectionActive ? subjects.filter((s) => rows[s.id]?.selected) : subjects;

  const doneCount = activeSubjects.filter(
    (s) => rows[s.id]?.proficiency && rows[s.id]?.improvement_priority,
  ).length;
  const allComplete =
    activeSubjects.length > 0 &&
    doneCount === activeSubjects.length &&
    (!selectionActive || activeSubjects.length === requiredCount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allComplete || !session?.student) {
      setError(
        selectionActive
          ? `Pick ${requiredCount} subjects and rate each one before continuing.`
          : "Rate every subject and pick a priority before continuing.",
      );
      return;
    }

    setLoading(true);
    try {
      await saveStudentSubjects(
        session.student.id,
        activeSubjects.map((s) => ({
          subject_id: s.id,
          proficiency: rows[s.id].proficiency as 1 | 2 | 3 | 4 | 5,
          improvement_priority: rows[s.id].improvement_priority as ImprovementPriority,
        })),
      );
      // Unlocks /desk and the other student-only routes immediately -- no
      // need to log out and back in for the "first save" redirect to stop.
      markStudentProfileComplete();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your ratings. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!checked || !session?.student) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Opening the Profiler…</p>
      </main>
    );
  }

  if (saved) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card w-full max-w-md px-6 py-10 text-center">
          <span className="text-3xl">✅</span>
          <p className="mt-3 eyebrow text-emerald">Profile saved</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-text">
            Ready to find your squad
          </h1>
          <p className="mt-3 text-sm text-text-dim">
            Your ratings are on file. Head to Find My Squad whenever you&apos;re ready to get matched.
          </p>
          <button onClick={() => router.push("/desk")} className="btn btn-secondary mt-6">
            Back to Your Desk
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow text-cyan">The Profiler</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          Rate yourself, honestly
        </h1>
        <p className="mt-3 max-w-lg text-text-dim">
          {selectionActive ? (
            <>
              Pick {requiredCount} of the {subjects.length} {group} subjects below, then rate your
              current proficiency from 1 (just starting) to 5 (could teach it), and how much you
              want to improve each one. This is how we find people who balance out your squad — not
              just people who match your schedule.
            </>
          ) : (
            <>
              For each subject in {group}, rate your current proficiency from 1 (just starting) to
              5 (could teach it), and how much you want to improve it. This is how we find people
              who balance out your squad — not just people who match your schedule.
            </>
          )}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <div className="progress-track flex-1">
            <div
              className="progress-fill progress-fill-emerald"
              style={{
                width: `${
                  selectionActive
                    ? (doneCount / requiredCount) * 100
                    : subjects.length
                      ? (doneCount / subjects.length) * 100
                      : 0
                }%`,
              }}
            />
          </div>
          <span className="text-sm font-semibold text-text-dim">
            {selectionActive ? `${doneCount}/${requiredCount}` : `${doneCount}/${subjects.length}`}
          </span>
        </div>

        {selectionActive && (
          <p className="mt-2 text-sm text-text-faint">
            {selectedCount}/{requiredCount} subjects picked
            {selectedCount >= requiredCount ? " — deselect one to swap it out." : ""}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="card divide-y divide-border-soft overflow-hidden">
            {subjects.map((subject) => {
              const rowSelected = selectionActive ? rows[subject.id]?.selected ?? false : true;
              const complete = rows[subject.id]?.proficiency && rows[subject.id]?.improvement_priority;
              const checkboxDisabled = !rowSelected && selectedCount >= requiredCount;
              return (
                <div
                  key={subject.id}
                  className={
                    "flex flex-col gap-3 px-5 py-5 transition-colors sm:flex-row sm:items-center sm:justify-between " +
                    (complete ? "bg-emerald/[0.03]" : "")
                  }
                >
                  <span className="flex items-center gap-2 font-display text-lg font-bold text-text">
                    {selectionActive && (
                      <input
                        type="checkbox"
                        aria-label={`Include ${subject.name}`}
                        checked={rowSelected}
                        disabled={checkboxDisabled}
                        onChange={() => toggleSelected(subject.id)}
                        className="h-4 w-4 rounded border-border accent-indigo disabled:opacity-40"
                      />
                    )}
                    {subject.name}
                    {complete && <span className="text-emerald">●</span>}
                  </span>

                  {rowSelected && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                          Proficiency
                        </span>
                        <StampToggleGroup
                          ariaLabel={`${subject.name} proficiency`}
                          options={PROFICIENCY_OPTIONS}
                          value={rows[subject.id]?.proficiency ? String(rows[subject.id].proficiency) : null}
                          onChange={(v) => setProficiency(subject.id, v)}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                          Improvement Priority
                        </span>
                        <StampToggleGroup
                          ariaLabel={`${subject.name} improvement priority`}
                          options={PRIORITY_OPTIONS}
                          value={rows[subject.id]?.improvement_priority ?? null}
                          onChange={(v) => setPriority(subject.id, v)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <FormError message={error} />
            <SubmitButton loading={loading} disabled={!allComplete}>
              Save My Profile
            </SubmitButton>
            {!allComplete && (
              <p className="text-center text-sm text-text-faint">
                {selectionActive
                  ? `Pick ${requiredCount} subjects and rate each one to continue.`
                  : "Rate every subject to continue."}
              </p>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
