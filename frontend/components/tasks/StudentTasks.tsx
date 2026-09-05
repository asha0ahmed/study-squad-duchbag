"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getStudentTasks, submitTaskAnswer } from "@/lib/api";
import type { StudentSession, StudentTaskView } from "@/lib/types";
import { FormError } from "@/components/auth/DossierCard";

const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,.webp";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fileKindLabel(format: string | null) {
  if (!format) return "File";
  return format.toUpperCase();
}

export function StudentTasks({ student }: { student: StudentSession }) {
  const [tasks, setTasks] = useState<StudentTaskView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getStudentTasks(student.id);
      setTasks(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your tasks.");
    } finally {
      setLoaded(true);
    }
  }, [student.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only happens after the request resolves
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <div className="animate-fade-in-up">
        <p className="eyebrow text-cyan">Today&apos;s Given Tasks</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          Tasks
        </h1>
        <p className="mt-1.5 text-sm text-text-dim">
          Work assigned by your mentor, and where to hand in your answer.
        </p>
      </div>

      <div className="mt-4">
        <FormError message={error} />
      </div>

      {!loaded ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="skeleton h-32 w-full" />
          <div className="skeleton h-32 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="text-2xl">📭</span>
          <p className="text-sm text-text-dim">
            No tasks yet. Once your mentor assigns one to your squad, it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {tasks.map((task, i) => (
            <TaskCard key={task.id} task={task} delay={i * 0.05} onSubmitted={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  delay,
  onSubmitted,
}: {
  task: StudentTaskView;
  delay: number;
  onSubmitted: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChosen(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await submitTaskAnswer(task.id, file);
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload your answer.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const submitted = Boolean(task.submission);

  return (
    <div className="animate-fade-in-up card overflow-hidden" style={{ animationDelay: `${delay}s` }}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-soft px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow text-indigo">From {task.mentor_name}</p>
          <h3 className="mt-1 font-display text-lg font-bold text-text">{task.title}</h3>
          <p className="mt-0.5 text-xs text-text-faint">Given {formatDate(task.created_at)}</p>
        </div>
        <span
          className={
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold " +
            (submitted ? "bg-emerald/15 text-emerald" : "bg-cyan/15 text-cyan")
          }
        >
          {submitted ? "Submitted" : "Not submitted"}
        </span>
      </div>

      <div className="px-5 py-4">
        {task.description && <p className="text-sm text-text-dim">{task.description}</p>}

        <a
          href={task.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary !py-2 mt-3 inline-flex text-sm"
        >
          📎 View task file ({fileKindLabel(task.file_format)})
        </a>

        <div className="mt-5 border-t border-border-soft pt-4">
          <p className="field-label mb-2">Submit Answer</p>
          <FormError message={error} />

          {task.submission ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <a
                href={task.submission.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary !py-2 text-sm"
              >
                View your submission
              </a>
              {task.submission.rating ? (
                <span className="text-sm font-semibold text-emerald">
                  ★ Rated {task.submission.rating}/5
                  {task.submission.feedback ? ` — ${task.submission.feedback}` : ""}
                </span>
              ) : (
                <span className="text-xs text-text-faint">Awaiting mentor rating</span>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn btn-ghost !py-2 text-sm"
              >
                {uploading ? "Uploading…" : "Replace file"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-primary !py-2.5 text-sm"
            >
              {uploading ? "Uploading…" : "Upload Your Answer"}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => handleFileChosen(e.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}
