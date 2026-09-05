"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  createTask,
  getMentorTasks,
  getMyMentorSquads,
} from "@/lib/api";
import type { MentorSession, MentorSquad, MentorTask } from "@/lib/types";
import { FormError, SubmitButton } from "@/components/auth/DossierCard";
import { TextField } from "@/components/auth/FormFields";

const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,.webp";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MentorTasks({
  initialSquadId,
}: {
  mentor: MentorSession;
  /** Lets the "Upload Task" button on a specific squad card (Mentor Desk) land here with that squad pre-selected. */
  initialSquadId?: number;
}) {
  const [squads, setSquads] = useState<MentorSquad[]>([]);
  const [tasks, setTasks] = useState<MentorTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(Boolean(initialSquadId));

  const load = useCallback(async () => {
    try {
      const [mySquads, myTasks] = await Promise.all([getMyMentorSquads(), getMentorTasks()]);
      setSquads(mySquads);
      setTasks(myTasks);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your tasks.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only happens after the request resolves
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <div className="animate-fade-in-up flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-emerald">Task Management</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Tasks
          </h1>
          <p className="mt-1.5 text-sm text-text-dim">
            Upload a task to one of your squads — every member sees it instantly.
          </p>
        </div>
        {!formOpen && (
          <button onClick={() => setFormOpen(true)} className="btn btn-primary !py-2.5 text-sm">
            Upload Task
          </button>
        )}
      </div>

      {!loaded ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="skeleton h-24 w-full" />
        </div>
      ) : (
        <>
          {formOpen && (
            <UploadTaskForm
              squads={squads}
              defaultSquadId={initialSquadId}
              onClose={() => setFormOpen(false)}
              onCreated={() => {
                setFormOpen(false);
                load();
              }}
            />
          )}

          <div className="mt-4">
            <FormError message={error} />
          </div>

          {squads.length === 0 ? (
            <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
              <span className="text-2xl">🧭</span>
              <p className="max-w-md text-sm text-text-dim">
                You don&apos;t have any claimed squads yet. Claim one from Browse Open Squads
                before uploading a task.
              </p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
              <span className="text-2xl">📭</span>
              <p className="text-sm text-text-dim">
                No tasks uploaded yet. Use &quot;Upload Task&quot; above to give your first one.
              </p>
            </div>
          ) : (
            <div className="mt-6 card divide-y divide-border-soft overflow-hidden">
              {tasks.map((task) => (
                <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-text">{task.title}</p>
                    <p className="mt-0.5 text-xs text-text-faint">
                      Given {formatDate(task.created_at)} · {task.submission_count}/{task.member_count}{" "}
                      submitted
                    </p>
                  </div>
                  <Link href={`/rating?taskId=${task.id}`} className="btn btn-secondary !py-2 text-sm">
                    View Submissions & Rate
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UploadTaskForm({
  squads,
  defaultSquadId,
  onClose,
  onCreated,
}: {
  squads: MentorSquad[];
  defaultSquadId?: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [squadId, setSquadId] = useState<string>(
    defaultSquadId ? String(defaultSquadId) : squads[0] ? String(squads[0].id) : ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!squadId) {
      setError("Select a squad to assign this task to.");
      return;
    }
    if (!file) {
      setError("Choose a task file (PDF, JPG, or PNG).");
      return;
    }

    setSubmitting(true);
    try {
      await createTask({ title, description, squadId: Number(squadId), file });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload the task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card animate-fade-in-up mt-6 flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-bold text-text">Upload Task</p>
        <button type="button" onClick={onClose} className="text-sm text-text-dim hover:text-text">
          Cancel
        </button>
      </div>

      <FormError message={error} />

      <TextField
        label="Task title"
        htmlFor="task-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Algebra Homework 1"
        required
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-description" className="field-label">
          Description / instructions (optional)
        </label>
        <textarea
          id="task-description"
          className="input min-h-[88px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What should students do with this task?"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-squad" className="field-label">
          Assign to squad
        </label>
        <select
          id="task-squad"
          className="input"
          value={squadId}
          onChange={(e) => setSquadId(e.target.value)}
          required
        >
          {squads.map((s) => (
            <option key={s.id} value={s.id}>
              {s.academic_group} · {s.year}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="field-label">Task file</span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-secondary !py-2.5 self-start text-sm"
        >
          {file ? `📎 ${file.name}` : "Choose PDF, JPG, or PNG"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <SubmitButton loading={submitting}>Create Task</SubmitButton>
    </form>
  );
}
