"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormError } from "@/components/auth/DossierCard";
import { UiIcon } from "@/components/layout/DockIcons";
import {
  adminListSquads,
  adminRemoveSquadExam,
  adminSetSquadExam,
  ApiError,
  getAdminSecret,
} from "@/lib/api";
import type { AdminSquad } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function SquadExamCard({
  squad,
  secret,
  onChanged,
}: {
  squad: AdminSquad;
  secret: string;
  onChanged: (updated: Partial<AdminSquad>) => void;
}) {
  const [url, setUrl] = useState(squad.exam_url ?? "");
  const [message, setMessage] = useState(squad.exam_message ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hasExam = Boolean(squad.exam_url);

  async function handleSend() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await adminSetSquadExam(secret, squad.id, { url, message });
      setUrl(saved.url);
      setMessage(saved.message);
      onChanged({
        exam_url: saved.url,
        exam_message: saved.message,
        exam_updated_at: saved.updated_at,
      });
      setNotice("Sent to this squad.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the exam link.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminRemoveSquadExam(secret, squad.id);
      setUrl("");
      setMessage("");
      onChanged({ exam_url: null, exam_message: null, exam_updated_at: null });
      setNotice("Exam link removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove the exam link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-text">Squad #{squad.id}</h2>
          <p className="text-xs text-text-faint">
            {squad.academic_group} · {squad.year} · {squad.aspirant_type}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-dim">
          <span className="badge badge-neutral">{squad.status}</span>
          <span>{squad.member_count} members</span>
          <span>Mentor: {squad.mentor_name ?? "none yet"}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-text-dim">
          Exam link (Google Form)
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://forms.gle/..."
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-text-dim">
          Message shown above the link
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="e.g. Weekly exam is open. Finish it before Friday 8 PM."
            className="input"
          />
        </label>

        <FormError message={error} />
        {notice && <p className="text-xs font-semibold text-emerald">{notice}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={busy || !url.trim()}
            className="btn btn-primary"
          >
            {hasExam ? "Update exam link" : "Send to squad"}
          </button>
          {hasExam && (
            <button type="button" onClick={handleRemove} disabled={busy} className="btn btn-ghost">
              Remove
            </button>
          )}
          {squad.exam_updated_at && (
            <span className="text-xs text-text-faint">
              Last sent {formatDate(squad.exam_updated_at)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AdminSquadsPage() {
  const secret = getAdminSecret();
  const [squads, setSquads] = useState<AdminSquad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyLocked, setOnlyLocked] = useState(false);

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError(null);
    try {
      setSquads(await adminListSquads(secret));
    } catch {
      setError("Couldn't load squads. Your admin secret may be invalid.");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after the request resolves
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return squads.filter((s) => {
      if (onlyLocked && s.status !== "locked") return false;
      if (!q) return true;
      return (
        String(s.id) === q.replace("#", "") ||
        s.academic_group.toLowerCase().includes(q) ||
        s.year.toLowerCase().includes(q) ||
        s.aspirant_type.toLowerCase().includes(q) ||
        (s.mentor_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [squads, search, onlyLocked]);

  function patchSquad(id: number, updated: Partial<AdminSquad>) {
    setSquads((current) => current.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  }

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow text-cyan">Admin</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          Squads & Exams
        </h1>
        <p className="mt-3 max-w-xl text-text-dim">
          Send a Google Form exam link, with a short message, to a specific squad. Members see it
          on their Exam tab.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by squad #, group, year, or mentor"
            className="input sm:max-w-sm"
          />
          <label className="flex items-center gap-2 text-sm text-text-dim">
            <input
              type="checkbox"
              checked={onlyLocked}
              onChange={(e) => setOnlyLocked(e.target.checked)}
            />
            Locked squads only
          </label>
        </div>

        <div className="mt-6">
          <FormError message={error} />
        </div>

        {loading ? (
          <div className="mt-6 flex flex-col gap-3">
            <div className="skeleton h-48 w-full" />
            <div className="skeleton h-48 w-full" />
          </div>
        ) : visible.length === 0 ? (
          <div className="card mt-6 flex flex-col items-center gap-2 px-6 py-12 text-center">
            <UiIcon name="inbox" className="h-7 w-7 text-text-faint" />
            <p className="text-sm text-text-dim">No squads match.</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {secret &&
              visible.map((squad) => (
                <SquadExamCard
                  key={squad.id}
                  squad={squad}
                  secret={secret}
                  onChanged={(updated) => patchSquad(squad.id, updated)}
                />
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
