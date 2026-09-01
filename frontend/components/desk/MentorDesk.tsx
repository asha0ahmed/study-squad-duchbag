"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  assignMentorToSquad,
  getAvailableSquads,
  getMyMentorSquads,
} from "@/lib/api";
import { SUBJECTS_BY_GROUP } from "@/lib/subjects";
import type { MentorSession, MentorSquad, Squad } from "@/lib/types";
import { CoverageMatrix } from "@/components/squad/CoverageMatrix";
import { FormError } from "@/components/auth/DossierCard";

type Tab = "mine" | "browse";

export function MentorDesk({ mentor }: { mentor: MentorSession }) {
  const [tab, setTab] = useState<Tab>("mine");
  const [mySquads, setMySquads] = useState<MentorSquad[]>([]);
  const [available, setAvailable] = useState<Squad[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [mine, open] = await Promise.all([getMyMentorSquads(), getAvailableSquads()]);
      setMySquads(mine);
      setAvailable(open);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your squads.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only happens after the request resolves
    loadAll();
  }, [loadAll]);

  async function handleClaim(squadId: number) {
    setClaimingId(squadId);
    setError(null);
    try {
      await assignMentorToSquad(squadId);
      await loadAll();
      setTab("mine");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't claim this squad.");
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <div className="animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow text-emerald">Mentor Desk</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Welcome, {mentor.name.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-sm text-text-dim">{mentor.institution}</p>
        </div>
        <div className="card-flat flex items-center gap-4 px-5 py-3">
          <div>
            <p className="text-xs text-text-dim">Squads guided</p>
            <p className="font-display text-xl font-bold text-text">{mySquads.length}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-xs text-text-dim">Open to claim</p>
            <p className="font-display text-xl font-bold text-text">{available.length}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-2 rounded-full border border-border bg-surface p-1">
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
          My Squads
        </TabButton>
        <TabButton active={tab === "browse"} onClick={() => setTab("browse")}>
          Browse Open Squads
        </TabButton>
      </div>

      <div className="mt-4">
        <FormError message={error} />
      </div>

      {!loaded ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : tab === "mine" ? (
        <MySquadsTab squads={mySquads} />
      ) : (
        <BrowseTab squads={available} onClaim={handleClaim} claimingId={claimingId} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-1 rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] transition-all " +
        (active
          ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_6px_16px_-6px_rgba(99,102,241,0.7)]"
          : "text-text-dim hover:text-text")
      }
    >
      {children}
    </button>
  );
}

function MySquadsTab({ squads }: { squads: MentorSquad[] }) {
  if (squads.length === 0) {
    return (
      <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
        <span className="text-2xl">📭</span>
        <p className="text-sm text-text-dim">
          You haven&apos;t claimed any squads yet. Check the Browse Open Squads tab.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      {squads.map((squad, i) => (
        <div
          key={squad.id}
          className="animate-fade-in-up card overflow-hidden"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
            <div>
              <p className="eyebrow text-indigo">{squad.academic_group}</p>
              <span className="font-display text-lg font-bold text-text">{squad.year}</span>
            </div>
            <Link href={`/squad/notes?squadId=${squad.id}`} className="btn btn-secondary !py-2 text-sm">
              Squad Notes
            </Link>
          </div>
          <div className="p-4">
            <CoverageMatrix subjects={SUBJECTS_BY_GROUP[squad.academic_group]} members={squad.members} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BrowseTab({
  squads,
  onClaim,
  claimingId,
}: {
  squads: Squad[];
  onClaim: (squadId: number) => void;
  claimingId: number | null;
}) {
  if (squads.length === 0) {
    return (
      <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center">
        <span className="text-2xl">🔍</span>
        <p className="max-w-md text-sm text-text-dim">
          No open squads right now. This is either because there aren&apos;t any locked,
          unassigned squads in your groups at the moment, or because a group you
          registered for is still awaiting admin approval — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="card mt-6 divide-y divide-border-soft overflow-hidden">
      {squads.map((squad) => (
        <div key={squad.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <span className="font-display text-base font-bold text-text">
              {squad.academic_group} · {squad.year}
            </span>
            <span className="ml-2 text-sm text-text-dim">{squad.aspirant_type}</span>
          </div>
          <button
            onClick={() => onClaim(squad.id)}
            disabled={claimingId === squad.id}
            className="btn btn-success !py-2 text-sm"
          >
            {claimingId === squad.id ? "Claiming…" : "Claim This Squad"}
          </button>
        </div>
      ))}
    </div>
  );
}
