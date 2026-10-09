"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getMySquad,
  getSession,
  getSquad,
  getSquadExam,
  needsProfiler,
  StoredSession,
} from "@/lib/api";
import type { SquadExam } from "@/lib/types";
import { FormError } from "@/components/auth/DossierCard";
import { UiIcon } from "@/components/layout/DockIcons";

type State =
  | { kind: "loading" }
  | { kind: "message"; text: string }
  | { kind: "ready"; exam: SquadExam | null }
  | { kind: "error"; message: string };

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mentorSquadId = searchParams.get("squadId");

  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of localStorage on mount
    setSession(s);
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (sessionChecked && !session) router.replace("/auth");
  }, [sessionChecked, session, router]);

  useEffect(() => {
    if (sessionChecked && needsProfiler(session)) router.replace("/profiler");
  }, [sessionChecked, session, router]);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      let squadId: number | null = null;
      if (session.role === "student" && session.student) {
        const result = await getMySquad(session.student.id);
        squadId = result.squad.id;
      } else if (session.role === "mentor") {
        if (!mentorSquadId) {
          setState({ kind: "message", text: "Exam links are sent to student squads." });
          return;
        }
        const result = await getSquad(Number(mentorSquadId));
        squadId = result.squad.id;
      }
      if (squadId === null) return;
      const { exam } = await getSquadExam(squadId);
      setState({ kind: "ready", exam });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setState({ kind: "message", text: "Join a squad to see your exams." });
        return;
      }
      setState({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Couldn't load your exam.",
      });
    }
  }, [session, mentorSquadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only after the request resolves
    if (session) load();
  }, [session, load]);

  return (
    <main className="flex-1 px-4 py-8 pb-28 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <p className="eyebrow text-cyan">Squad Exam</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text">
          Exam
        </h1>

        <div className="mt-6">
          {state.kind === "loading" && <div className="skeleton h-40 w-full" />}

          {state.kind === "error" && <FormError message={state.message} />}

          {state.kind === "message" && (
            <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
              <UiIcon name="inbox" className="h-7 w-7 text-text-faint" />
              <p className="text-sm text-text-dim">{state.text}</p>
              <Link href="/squad" className="btn btn-secondary mt-3 inline-flex">
                Back to Your Squad
              </Link>
            </div>
          )}

          {state.kind === "ready" && !state.exam && (
            <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
              <UiIcon name="inbox" className="h-7 w-7 text-text-faint" />
              <p className="text-sm text-text-dim">
                No exam has been sent to your squad yet. Check back soon.
              </p>
            </div>
          )}

          {state.kind === "ready" && state.exam && (
            <div className="card px-5 py-6 sm:px-6">
              {state.exam.message && (
                <p className="whitespace-pre-wrap text-sm leading-6 text-text-dim">
                  {state.exam.message}
                </p>
              )}
              <a
                href={state.exam.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary mt-5 inline-flex w-full justify-center sm:w-auto"
              >
                Open Exam
              </a>
              <p className="mt-3 text-xs text-text-faint">
                Sent {new Date(state.exam.updated_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SquadExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamContent />
    </Suspense>
  );
}
