"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, getSession, saveStudentSubjects, StoredSession } from "@/lib/api";
import { SUBJECTS_BY_GROUP } from "@/lib/subjects";
import type { ImprovementPriority } from "@/lib/types";
import { StampToggleGroup } from "@/components/profiler/StampToggleGroup";
import { FormError, SubmitButton } from "@/components/auth/DossierCard";

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

  function setProficiency(subjectId: number, value: string) {
    setRows((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
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
        improvement_priority: value,
        proficiency: prev[subjectId]?.proficiency ?? null,
      },
    }));
  }

  const doneCount = subjects.filter(
    (s) => rows[s.id]?.proficiency && rows[s.id]?.improvement_priority,
  ).length;
  const allComplete = subjects.length > 0 && doneCount === subjects.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allComplete || !session?.student) {
      setError("Rate every subject and pick a priority before continuing.");
      return;
    }

    setLoading(true);
    try {
      await saveStudentSubjects(
        session.student.id,
        subjects.map((s) => ({
          subject_id: s.id,
          proficiency: rows[s.id].proficiency as 1 | 2 | 3 | 4 | 5,
          improvement_priority: rows[s.id].improvement_priority as ImprovementPriority,
        })),
      );
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
          For each subject in {group}, rate your current proficiency from 1 (just starting) to 5
          (could teach it), and how much you want to improve it. This is how we find people who
          balance out your squad — not just people who match your schedule.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <div className="progress-track flex-1">
            <div
              className="progress-fill progress-fill-emerald"
              style={{ width: `${subjects.length ? (doneCount / subjects.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-text-dim">
            {doneCount}/{subjects.length}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="card divide-y divide-border-soft overflow-hidden">
            {subjects.map((subject) => {
              const complete = rows[subject.id]?.proficiency && rows[subject.id]?.improvement_priority;
              return (
                <div
                  key={subject.id}
                  className={
                    "flex flex-col gap-3 px-5 py-5 transition-colors sm:flex-row sm:items-center sm:justify-between " +
                    (complete ? "bg-emerald/[0.03]" : "")
                  }
                >
                  <span className="flex items-center gap-2 font-display text-lg font-bold text-text">
                    {subject.name}
                    {complete && <span className="text-emerald">●</span>}
                  </span>

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
              <p className="text-center text-sm text-text-faint">Rate every subject to continue.</p>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
