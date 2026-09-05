"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getMentorTasks,
  getTaskSubmissions,
  rateSubmission,
} from "@/lib/api";
import type { MentorSubmissionView, MentorTask, Task } from "@/lib/types";
import { FormError } from "@/components/auth/DossierCard";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MentorRating({ taskId }: { taskId?: number }) {
  if (taskId) {
    return <SubmissionsForTask taskId={taskId} />;
  }
  return <TaskPicker />;
}

function TaskPicker() {
  const [tasks, setTasks] = useState<MentorTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setTasks(await getMentorTasks());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't load your tasks.");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <div className="animate-fade-in-up">
        <p className="eyebrow text-violet">Rating</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          Rate Submissions
        </h1>
        <p className="mt-1.5 text-sm text-text-dim">
          Pick a task to review what your students turned in.
        </p>
      </div>

      <div className="mt-4">
        <FormError message={error} />
      </div>

      {!loaded ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="skeleton h-20 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="text-2xl">🗒️</span>
          <p className="max-w-md text-sm text-text-dim">
            You haven&apos;t uploaded any tasks yet. Create one from the Tasks tab first.
          </p>
          <Link href="/tasks" className="btn btn-primary mt-2 !py-2 text-sm">
            Go to Tasks
          </Link>
        </div>
      ) : (
        <div className="mt-6 card divide-y divide-border-soft overflow-hidden">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/rating?taskId=${task.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-2/60"
            >
              <div>
                <p className="font-display text-base font-bold text-text">{task.title}</p>
                <p className="mt-0.5 text-xs text-text-faint">
                  Given {formatDate(task.created_at)} · {task.submission_count}/{task.member_count} submitted
                </p>
              </div>
              <span className="text-sm text-indigo">Review →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionsForTask({ taskId }: { taskId: number }) {
  const [task, setTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<MentorSubmissionView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getTaskSubmissions(taskId);
      setTask(result.task);
      setSubmissions(result.submissions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load submissions.");
    } finally {
      setLoaded(true);
    }
  }, [taskId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only happens after the request resolves
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <div className="animate-fade-in-up">
        <Link href="/rating" className="text-sm text-text-dim hover:text-text">
          ← All tasks
        </Link>
        <p className="eyebrow mt-3 text-violet">Rating</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          {task ? task.title : "Submissions"}
        </h1>
      </div>

      <div className="mt-4">
        <FormError message={error} />
      </div>

      {!loaded ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="skeleton h-28 w-full" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="text-2xl">🕑</span>
          <p className="text-sm text-text-dim">No submissions yet for this task.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {submissions.map((s, i) => (
            <SubmissionRow key={s.id} submission={s} delay={i * 0.05} onRated={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionRow({
  submission,
  delay,
  onRated,
}: {
  submission: MentorSubmissionView;
  delay: number;
  onRated: () => void;
}) {
  const [rating, setRating] = useState(submission.rating ?? 0);
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (rating < 1) {
      setError("Pick a rating from 1 to 5 first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await rateSubmission(submission.id, rating, feedback);
      onRated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the rating.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in-up card p-5" style={{ animationDelay: `${delay}s` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-base font-bold text-text">{submission.student_name}</p>
          <p className="text-xs text-text-faint">{submission.student_email}</p>
        </div>
        <a
          href={submission.submission_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary !py-2 text-sm"
        >
          View submission
        </a>
      </div>

      <div className="mt-4 border-t border-border-soft pt-4">
        <FormError message={error} />
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`Rate ${n} out of 5`}
              className={"text-2xl transition-transform active:scale-90 " + (n <= rating ? "" : "opacity-25")}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          className="input mt-3 min-h-[64px]"
          placeholder="Optional feedback for this student…"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary !py-2 mt-3 text-sm"
        >
          {saving ? "Saving…" : submission.rating ? "Update Rating" : "Save Rating"}
        </button>
      </div>
    </div>
  );
}
