"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  getMySquad,
  getSession,
  getSquad,
  getSquadMessages,
  sendSquadMessage,
  StoredSession,
} from "@/lib/api";
import type { SquadMessage } from "@/lib/types";
import { FormError } from "@/components/auth/DossierCard";
import { Avatar } from "@/components/ui/Avatar";

const POLL_INTERVAL_MS = 7000;

type Access =
  | { state: "loading" }
  | { state: "blocked"; reason: string }
  | { state: "ready"; squadId: number }
  | { state: "error"; message: string };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function SquadNotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mentorSquadId = searchParams.get("squadId");

  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [access, setAccess] = useState<Access>({ state: "loading" });
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount
    setSession(s);
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (sessionChecked && !session) router.replace("/auth");
  }, [sessionChecked, session, router]);

  const resolveAccess = useCallback(async () => {
    if (!session) return;
    try {
      if (session.role === "student" && session.student) {
        const result = await getMySquad(session.student.id);
        if (result.squad.status !== "locked") {
          setAccess({
            state: "blocked",
            reason: "Squad Notes unlocks once your squad reaches 4 members.",
          });
        } else {
          setAccess({ state: "ready", squadId: result.squad.id });
        }
      } else if (session.role === "mentor") {
        if (!mentorSquadId) {
          setAccess({
            state: "blocked",
            reason: "Open Squad Notes from one of your assigned squads.",
          });
          return;
        }
        const result = await getSquad(Number(mentorSquadId));
        if (result.squad.status !== "locked") {
          setAccess({ state: "blocked", reason: "This squad isn't locked yet." });
        } else {
          setAccess({ state: "ready", squadId: result.squad.id });
        }
      }
    } catch (err) {
      setAccess({
        state: "error",
        message: err instanceof ApiError ? err.message : "Couldn't load Squad Notes.",
      });
    }
  }, [session, mentorSquadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState only happens after the request resolves
    if (session) resolveAccess();
  }, [session, resolveAccess]);

  const loadMessages = useCallback(async (squadId: number) => {
    try {
      const result = await getSquadMessages(squadId);
      setMessages(result);
    } catch {
      // Silent on poll failures -- don't interrupt an otherwise-working chat
      // over one flaky request; the next poll will retry.
    }
  }, []);

  useEffect(() => {
    if (access.state !== "ready") return;
    // loadMessages is async and only calls setState after the network
    // request resolves -- this starts the poll loop, not a synchronous
    // render-time state write.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMessages(access.squadId);
    const interval = setInterval(() => loadMessages(access.squadId), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [access, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (access.state !== "ready" || !draft.trim()) return;
    setError(null);
    setSending(true);
    try {
      await sendSquadMessage(access.squadId, draft.trim());
      setDraft("");
      await loadMessages(access.squadId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  if (!sessionChecked || !session || access.state === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Opening Squad Notes…</p>
      </main>
    );
  }

  if (access.state === "blocked" || access.state === "error") {
    const message = access.state === "blocked" ? access.reason : access.message;
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card w-full max-w-md px-6 py-8 text-center">
          <p className="eyebrow text-cyan">Squad Notes</p>
          <p className="mt-3 text-sm text-text-dim">{message}</p>
          <Link href="/squad" className="btn btn-secondary mt-5 inline-flex">
            Back to Your Squad
          </Link>
        </div>
      </main>
    );
  }

  const currentSenderId = session.role === "student" ? session.student?.id : session.mentor?.id;

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <p className="eyebrow text-cyan">Squad Notes</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text">
          The Ledger
        </h1>

        <div
          ref={scrollRef}
          className="card mt-6 flex-1 overflow-y-auto px-5 py-4"
          style={{ maxHeight: "55vh", minHeight: "40vh" }}
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="text-2xl">👋</span>
              <p className="text-sm text-text-faint">No notes yet. Say hello.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-soft">
              {messages.map((m) => {
                const mine = m.sender_type === session.role && m.sender_id === currentSenderId;
                return (
                  <div key={m.id} className="flex items-start gap-3 py-3">
                    <Avatar name={m.sender_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.04em] text-text">
                          {m.sender_name}
                          {mine && <span className="ml-1 font-normal text-text-faint">(you)</span>}
                          {m.sender_type === "mentor" && (
                            <span className="ml-1 font-semibold normal-case text-emerald">· Mentor</span>
                          )}
                        </span>
                        <span className="text-xs text-text-faint">{formatTime(m.created_at)}</span>
                      </div>
                      <p className="mt-0.5 break-words text-[15px] text-text">{m.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a note to your squad…"
            className="input flex-1"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="btn btn-primary !px-5">
            Send
          </button>
        </form>
        <div className="mt-2">
          <FormError message={error} />
        </div>
      </div>
    </main>
  );
}

export default function SquadNotesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-dim">Opening Squad Notes…</p>
        </main>
      }
    >
      <SquadNotesContent />
    </Suspense>
  );
}
