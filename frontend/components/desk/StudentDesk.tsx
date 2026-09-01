"use client";

import Link from "next/link";
import { ApiError, getMySquad } from "@/lib/api";
import type { StudentSession, StudentSquadView } from "@/lib/types";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { useCallback, useEffect, useState } from "react";

const MEMBERS_NEEDED_TO_ACTIVATE = 4;

function statusLabel(squad: StudentSquadView | null) {
  if (squad && squad.squad.status === "locked") return "Squad Locked";
  if (squad) return "Squad Forming";
  return "Not Matched Yet";
}

export function StudentDesk({ student }: { student: StudentSession }) {
  const [squad, setSquad] = useState<StudentSquadView | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getMySquad(student.id);
      setSquad(result);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        // Non-404 errors just mean "we don't know yet" -- the quick links
        // below still work regardless, so this fails soft.
      }
    } finally {
      setLoaded(true);
    }
  }, [student.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only happens after the request resolves
    load();
  }, [load]);

  const memberCount = squad?.members.length ?? 0;
  const isLocked = squad?.squad.status === "locked";
  const covered = squad?.members.filter((m) => m.covers.length > 0).length ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow text-cyan">Your Desk</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Welcome back, {student.name.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-sm text-text-dim">
            {student.academic_group ?? "—"} track · here&apos;s where your squad stands today.
          </p>
        </div>
        {loaded && (
          <StatusBadge
            label={statusLabel(squad)}
            tone={isLocked ? "locked" : squad ? "pending" : "neutral"}
          />
        )}
      </div>

      {/* Hero squad card */}
      <div
        className="animate-fade-in-up card relative mt-8 overflow-hidden p-6 sm:p-8"
        style={{ animationDelay: "0.05s" }}
      >
        <div className="glow-orb h-56 w-56 bg-indigo/25" style={{ top: "-3rem", right: "-2rem" }} />
        <div className="glow-orb h-40 w-40 bg-cyan/15" style={{ bottom: "-2rem", left: "10%" }} />

        {!loaded ? (
          <div className="relative z-10 flex flex-col gap-4">
            <div className="skeleton h-6 w-40" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : !squad ? (
          <div className="relative z-10 flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-3xl">🧭</span>
            <p className="font-display text-xl font-bold text-text">
              You haven&apos;t found your squad yet
            </p>
            <p className="max-w-sm text-sm text-text-dim">
              Rate your subjects in the Profiler, then let us match you with five
              students who balance out your strengths.
            </p>
            <Link href="/squad/find" className="btn btn-primary mt-2">
              Find My Squad
            </Link>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-indigo">
                  {squad.squad.academic_group} · {squad.squad.year}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-text">Your Squad</p>
              </div>
              <Link href="/squad" className="btn btn-secondary !py-2 text-sm">
                View full squad →
              </Link>
            </div>

            {/* Member avatar row */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {squad.members.map((m) => (
                <div key={m.student_id} className="flex flex-col items-center gap-1.5">
                  <span className="relative">
                    <Avatar name={m.name} size="lg" />
                    <span
                      className={
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface " +
                        (m.status === "confirmed" ? "bg-emerald" : "bg-cyan animate-pulse-dot")
                      }
                    />
                  </span>
                  <span className="max-w-[4.5rem] truncate text-xs font-medium text-text-dim">
                    {m.student_id === student.id ? "You" : m.name.split(" ")[0]}
                  </span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 6 - memberCount) }).map((_, i) => (
                <div key={`open-${i}`} className="flex flex-col items-center gap-1.5">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border text-text-faint">
                    +
                  </span>
                  <span className="text-xs text-text-faint">Open</span>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="card-flat px-4 py-3.5">
                <p className="text-xs text-text-dim">Squad fill</p>
                <p className="mt-1 font-display text-lg font-bold text-text">
                  {memberCount} / 6 members
                </p>
                <div className="progress-track mt-2">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, (memberCount / 6) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="card-flat px-4 py-3.5">
                <p className="text-xs text-text-dim">Subject coverage</p>
                <p className="mt-1 font-display text-lg font-bold text-text">
                  {covered} / {memberCount || 6} contributing
                </p>
                <div className="progress-track mt-2">
                  <div
                    className="progress-fill progress-fill-emerald"
                    style={{ width: `${memberCount ? (covered / memberCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="card-flat px-4 py-3.5">
                <p className="text-xs text-text-dim">Mentor</p>
                <p className="mt-1 font-display text-lg font-bold text-text">
                  {squad.mentor ? squad.mentor.name.split(" ")[0] : "Pending"}
                </p>
                <p className="mt-2 text-xs text-text-faint">
                  {squad.mentor ? "Assigned & ready" : "Being assigned"}
                </p>
              </div>
            </div>

            {!isLocked && (
              <p className="mt-5 text-sm text-text-dim">
                Squad Notes unlocks once you reach {MEMBERS_NEEDED_TO_ACTIVATE} members —
                more scholars are being matched in automatically.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DeskLink
          href="/profiler"
          label="The Profiler"
          desc="Rate your subjects"
          icon="📊"
          accent="from-indigo to-violet"
        />
        <DeskLink
          href="/squad/find"
          label="Find My Squad"
          desc={squad ? "View your match" : "Trigger matching"}
          icon="🎯"
          accent="from-cyan to-indigo"
        />
        <DeskLink
          href="/squad/notes"
          label="Squad Notes"
          desc="Talk to your squad"
          icon="💬"
          accent="from-emerald to-cyan"
        />
      </div>
    </div>
  );
}

function DeskLink({
  href,
  label,
  desc,
  icon,
  accent,
}: {
  href: string;
  label: string;
  desc: string;
  icon: string;
  accent: string;
}) {
  return (
    <Link href={href} className="card card-hover group flex items-center gap-4 px-5 py-5">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-lg shadow-[0_8px_18px_-8px_rgba(99,102,241,0.6)]`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <span className="block font-display text-base font-bold text-text">{label}</span>
        <span className="mt-0.5 block text-sm text-text-dim">{desc}</span>
      </div>
    </Link>
  );
}
