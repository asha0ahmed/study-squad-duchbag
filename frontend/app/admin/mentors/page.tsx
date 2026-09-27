"use client";

import { UiIcon } from "@/components/layout/DockIcons";
import { useCallback, useEffect, useState } from "react";
import { ApiError, adminApproveMentorGroup, adminListMentors, getAdminSecret } from "@/lib/api";
import type { AdminMentorRecord } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { dateStyle: "medium" });
}

export default function AdminMentorsPage() {
  const [mentors, setMentors] = useState<AdminMentorRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  // Which mentor cards are expanded to show their working groups + squads.
  // A Set rather than a single id so more than one can be open at once.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const secret = getAdminSecret();
    if (!secret) return;
    try {
      const result = await adminListMentors(secret);
      setMentors(result);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load mentor records.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after the request resolves
    load();
  }, [load]);

  function toggleExpanded(mentorId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(mentorId)) next.delete(mentorId);
      else next.add(mentorId);
      return next;
    });
  }

  async function handleApprove(mentorId: number, groupName: string) {
    const secret = getAdminSecret();
    if (!secret) return;
    const key = `${mentorId}:${groupName}`;
    setApprovingKey(key);
    try {
      await adminApproveMentorGroup(secret, mentorId, groupName);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't approve that group.");
    } finally {
      setApprovingKey(null);
    }
  }

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow text-cyan">Admin</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          Mentor Records
        </h1>
        <p className="mt-2 max-w-lg text-sm text-text-dim">
          Every mentor who has registered. Click one to see their working groups and assigned squads.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3.5 text-sm text-coral">
            {error}
          </div>
        )}

        {mentors === null ? (
          <div className="mt-8 flex flex-col gap-3">
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-20 w-full" />
          </div>
        ) : mentors.length === 0 ? (
          <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
            <UiIcon name="inbox" className="h-7 w-7 text-text-faint" />
            <p className="text-sm text-text-dim">No mentors have registered yet.</p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {mentors.map((mentor) => {
              const isOpen = expanded.has(mentor.id);
              const activeSquadCount = mentor.squads.filter((s) => s.status === "locked").length;
              const pendingGroupCount = mentor.groups.filter((g) => g.approval_status === "pending").length;

              return (
                <div key={mentor.id} className="card overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(mentor.id)}
                    aria-expanded={isOpen}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2/60"
                  >
                    <div>
                      <p className="font-display text-lg font-bold text-text">{mentor.name}</p>
                      <p className="text-sm text-text-dim">{mentor.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-text-faint">Joined {formatDate(mentor.created_at)}</span>
                      <span className="badge badge-emerald">{activeSquadCount} active squad{activeSquadCount === 1 ? "" : "s"}</span>
                      {pendingGroupCount > 0 && (
                        <span className="badge badge-amber">{pendingGroupCount} pending</span>
                      )}
                      <UiIcon
                        name="chevron"
                        className={"h-4 w-4 shrink-0 text-text-faint transition-transform " + (isOpen ? "rotate-90" : "")}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border-soft px-5 py-5">
                      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-text-faint">Institution</p>
                          <p className="mt-0.5 font-medium text-text">{mentor.institution}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-faint">Phone</p>
                          <p className="mt-0.5 font-medium text-text">{mentor.phone ?? "—"}</p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-border-soft pt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">
                          Working groups
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {mentor.groups.map((g) => (
                            <span
                              key={g.group_name}
                              className={
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold " +
                                (g.approval_status === "approved"
                                  ? "border-emerald/30 bg-emerald/10 text-emerald"
                                  : "border-border bg-surface-2 text-text-dim")
                              }
                            >
                              {g.group_name} · {g.approval_status}
                              {g.approval_status === "pending" && (
                                <button
                                  onClick={() => handleApprove(mentor.id, g.group_name)}
                                  disabled={approvingKey === `${mentor.id}:${g.group_name}`}
                                  className="rounded-full bg-emerald/90 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-emerald"
                                >
                                  {approvingKey === `${mentor.id}:${g.group_name}` ? "Approving…" : "Approve"}
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 border-t border-border-soft pt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">
                          Assigned squad(s)
                        </p>
                        {mentor.squads.length === 0 ? (
                          <p className="mt-1.5 text-sm text-text-faint">Not currently mentoring any squad.</p>
                        ) : (
                          <ul className="mt-1.5 flex flex-col gap-1">
                            {mentor.squads.map((squad) => (
                              <li key={squad.id} className="text-sm text-text">
                                {squad.academic_group} · {squad.year} · {squad.aspirant_type}{" "}
                                <span
                                  className={
                                    "ml-1 text-xs font-semibold " +
                                    (squad.status === "locked" ? "text-emerald" : "text-text-faint")
                                  }
                                >
                                  {squad.status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
