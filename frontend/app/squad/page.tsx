"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createInvite,
  getMySquad,
  getSession,
  getSuggestedSquad,
  StoredSession,
} from "@/lib/api";
import type { StudentSquadView, SquadSuggestion } from "@/lib/types";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { BetterSquadBanner } from "@/components/squad/BetterSquadBanner";
import { FormError } from "@/components/auth/DossierCard";
import { Avatar } from "@/components/ui/Avatar";

const MEMBERS_NEEDED_TO_ACTIVATE = 4;

export default function SquadPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [squad, setSquad] = useState<StudentSquadView | null | "not-found">(null);
  const [suggestion, setSuggestion] = useState<SquadSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ inviteCode: string; inviteLink: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount
    setSession(s);
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (sessionChecked && (!session || session.role !== "student")) {
      router.replace("/auth");
    }
  }, [sessionChecked, session, router]);

  const load = useCallback(async () => {
    if (!session?.student) return;
    try {
      const result = await getMySquad(session.student.id);
      setSquad(result);
      setInvite(null);
      // A better-fit squad, if one exists, is purely optional information --
      // failing to load it shouldn't block anything else on this page.
      try {
        const s = await getSuggestedSquad(session.student.id);
        setSuggestion(s.suggestion);
      } catch {
        setSuggestion(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSquad("not-found");
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't load your squad.");
      }
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only happens after the request resolves
    if (session?.student) load();
  }, [session, load]);

  async function handleInvite() {
    if (!squad || squad === "not-found") return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      const result = await createInvite(squad.squad.id);
      // The backend returns a placeholder domain (yourapp.com/join/...) that
      // isn't wherever this app actually runs. Build the real, clickable
      // link from wherever we're actually running -- localhost during dev,
      // the real domain once one exists -- instead of trusting that field.
      const realLink =
        typeof window !== "undefined"
          ? `${window.location.origin}/invite/${result.inviteCode}`
          : result.inviteLink;
      setInvite({ inviteCode: result.inviteCode, inviteLink: realLink });
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Couldn't generate an invite link.");
    } finally {
      setInviteLoading(false);
    }
  }

  if (!sessionChecked || !session?.student || squad === null) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Opening your squad…</p>
      </main>
    );
  }

  if (squad === "not-found") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card w-full max-w-md px-6 py-10 text-center">
          <span className="text-3xl">🧭</span>
          <p className="mt-3 font-display text-xl font-bold text-text">No squad yet</p>
          <p className="mt-1.5 text-sm text-text-dim">Head over to find your six-person squad.</p>
          <Link href="/squad/find" className="btn btn-primary mt-5 inline-flex">
            Find My Squad
          </Link>
        </div>
      </main>
    );
  }

  const { squad: squadData, members, mentor } = squad;
  const isActive = squadData.status === "locked";
  const openSlots = 6 - members.length;

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="animate-fade-in-up flex flex-wrap items-center gap-3">
          <p className="eyebrow text-cyan">Your Squad</p>
          <StatusBadge label={isActive ? "Active" : "Filling Up"} tone={isActive ? "locked" : "pending"} />
        </div>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          {squadData.academic_group} · {squadData.year}
        </h1>

        <FormError message={error} />

        {session.student && suggestion && (
          <BetterSquadBanner studentId={session.student.id} suggestion={suggestion} onSwitched={load} />
        )}

        {!isActive && (
          <div className="card mt-6 px-5 py-5">
            <p className="text-sm font-semibold text-text">
              {members.length} of {MEMBERS_NEEDED_TO_ACTIVATE} joined — your squad starts chatting
              once it reaches {MEMBERS_NEEDED_TO_ACTIVATE}
            </p>
            <div className="progress-track mt-3">
              <div
                className="progress-fill progress-fill-emerald"
                style={{ width: `${Math.min(100, (members.length / MEMBERS_NEEDED_TO_ACTIVATE) * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-text-faint">
              More scholars are being matched in automatically. You&apos;ll be notified the moment
              your squad is ready.
            </p>
          </div>
        )}

        <div className="card mt-8 overflow-hidden">
          <div className="border-b border-border-soft px-5 py-4">
            <span className="eyebrow">Your Roster</span>
          </div>
          <div className="divide-y divide-border-soft">
            {members.map((m) => (
              <div
                key={m.student_id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" />
                  <div>
                    <span className="font-display text-[15px] font-semibold text-text">{m.name}</span>
                    <span className="ml-2 text-xs text-text-faint">Slot {m.slot}</span>
                    {m.student_id === session.student?.id && (
                      <span className="ml-2 text-xs font-semibold text-cyan">(you)</span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-text-dim sm:ml-3">
                  {m.covers.length > 0 ? m.covers.join(", ") : "No subjects yet"}
                </span>
              </div>
            ))}
          </div>
          {openSlots > 0 && (
            <div className="px-5 py-4">
              <span className="text-sm italic text-text-faint">
                {openSlots} slot{openSlots > 1 ? "s" : ""} still open
              </span>
            </div>
          )}
        </div>

        <div className="card mt-6 px-5 py-5">
          <span className="eyebrow">Mentor</span>
          {mentor ? (
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={mentor.name} size="sm" />
              <p className="font-display text-lg font-semibold text-text">{mentor.name}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-cyan">Mentor pending</p>
          )}
        </div>

        <div className="card mt-6 px-5 py-5">
          <span className="eyebrow">Invite Someone</span>
          {openSlots === 0 ? (
            <p className="mt-2 text-sm text-text-faint">Your squad is full.</p>
          ) : (
            <div className="mt-3">
              {invite ? (
                <div className="card-flat px-4 py-4">
                  <p className="text-sm text-text">
                    Code: <span className="font-semibold text-text">{invite.inviteCode}</span>
                  </p>
                  <a href={invite.inviteLink} className="mt-1 block break-all text-sm text-cyan underline">
                    {invite.inviteLink}
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(invite.inviteLink)}
                    className="btn btn-secondary mt-3 !py-2 text-sm"
                  >
                    Copy Link
                  </button>
                </div>
              ) : (
                <button onClick={handleInvite} disabled={inviteLoading} className="btn btn-success">
                  {inviteLoading ? "Generating…" : "Generate Invite Link"}
                </button>
              )}
              <div className="mt-3">
                <FormError message={inviteError} />
              </div>
            </div>
          )}
        </div>

        {isActive && (
          <Link href="/squad/notes" className="btn btn-primary mt-8 inline-flex">
            Open Squad Notes
          </Link>
        )}
      </div>
    </main>
  );
}
