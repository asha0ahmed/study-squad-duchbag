"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getMySquad,
  getSession,
  runMatch,
  StoredSession,
} from "@/lib/api";
import { SUBJECTS_BY_GROUP } from "@/lib/subjects";
import type { AcademicGroup } from "@/lib/types";
import { CoverageMatrix, CoverageMatrixMember } from "@/components/squad/CoverageMatrix";
import { FormError } from "@/components/auth/DossierCard";

type ScreenState =
  | { phase: "loading" }
  | { phase: "no-squad" }
  | { phase: "matching" }
  | { phase: "has-squad"; group: AcademicGroup; members: CoverageMatrixMember[] }
  | { phase: "error"; message: string };

export default function FindMySquadPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [state, setState] = useState<ScreenState>({ phase: "loading" });
  const [matchError, setMatchError] = useState<string | null>(null);

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

  const loadExistingSquad = useCallback(async () => {
    if (!session?.student) return;
    try {
      const result = await getMySquad(session.student.id);
      setState({
        phase: "has-squad",
        group: result.squad.academic_group,
        members: result.members.map((m) => ({
          slot: m.slot,
          name: m.name,
          covers: m.covers,
          status: m.status,
        })),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setState({ phase: "no-squad" });
      } else {
        setState({
          phase: "error",
          message: err instanceof ApiError ? err.message : "Couldn't check your squad status.",
        });
      }
    }
  }, [session]);

  useEffect(() => {
    // loadExistingSquad is async and only calls setState after its network
    // request resolves -- that's the standard data-fetch-on-mount pattern,
    // not the synchronous-setState case this rule is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session?.student) loadExistingSquad();
  }, [session, loadExistingSquad]);

  async function handleFindSquad() {
    if (!session?.student) return;
    setMatchError(null);
    setState({ phase: "matching" });
    try {
      const result = await runMatch(session.student.id);
      const group = session.student.academic_group as AcademicGroup;
      const subjectsById = new Map(SUBJECTS_BY_GROUP[group].map((s) => [s.id, s.name]));
      setState({
        phase: "has-squad",
        group,
        members: result.members.map((m) => ({
          slot: m.slot,
          name: m.name,
          covers: m.contributes.map((id) => subjectsById.get(id) ?? `Subject #${id}`),
          status: m.status,
        })),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        router.push("/squad/subscribe");
        return;
      }
      setMatchError(err instanceof ApiError ? err.message : "Couldn't run matching. Try again.");
      setState({ phase: "no-squad" });
    }
  }

  if (!sessionChecked || !session?.student || state.phase === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Checking your squad status…</p>
      </main>
    );
  }

  if (state.phase === "error") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card w-full max-w-md px-6 py-8 text-center">
          <FormError message={state.message} />
          <button onClick={loadExistingSquad} className="btn btn-secondary mt-4">
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (state.phase === "no-squad" || state.phase === "matching") {
    return (
      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        <div className="glow-orb h-96 w-96 bg-indigo/20" style={{ top: "-2rem", left: "50%", transform: "translateX(-50%)" }} />
        <div className="card relative z-10 w-full max-w-md px-6 py-10 text-center">
          <p className="eyebrow text-cyan">Find My Squad</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-text">No squad yet</h1>
          <p className="mt-3 text-sm text-text-dim">
            We&apos;ll match you with up to 5 other {session.student.academic_group} students at your
            level, chosen so your strengths and gaps balance each other out — not just by schedule.
          </p>
          <div className="mt-4">
            <FormError message={matchError} />
          </div>
          <button
            onClick={handleFindSquad}
            disabled={state.phase === "matching"}
            className="btn btn-primary mt-6 min-h-[48px]"
          >
            {state.phase === "matching" ? (
              <>
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-white" />
                Matching…
              </>
            ) : (
              "Find My Squad"
            )}
          </button>
        </div>
      </main>
    );
  }

  // state.phase === "has-squad"
  const subjects = SUBJECTS_BY_GROUP[state.group];
  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow text-emerald">Squad found</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text">
          The Coverage Matrix
        </h1>
        <p className="mt-3 max-w-2xl text-text-dim">
          Each filled dot shows who&apos;s covering that subject for the squad. Open columns are
          still-empty slots, waiting on an invite.
        </p>

        <div className="mt-8">
          <CoverageMatrix subjects={subjects} members={state.members} />
        </div>

        <div className="card mt-8 px-5 py-5">
          <p className="text-sm text-text-dim">
            Your squad starts chatting the moment it reaches 4 members — more scholars are being
            matched in automatically.
          </p>
          <Link href="/squad" className="mt-3 inline-block text-sm font-semibold text-cyan underline">
            View Your Squad
          </Link>
        </div>
      </div>
    </main>
  );
}
