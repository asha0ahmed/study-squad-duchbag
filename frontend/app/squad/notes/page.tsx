"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ApiError,
  getMySquad,
  getSession,
  getSquad,
  getSquadMessages,
  markNotesSeen,
  needsProfiler,
  sendSquadMessage,
  StoredSession,
} from "@/lib/api";
import type { SquadMessage } from "@/lib/types";
import { getSocket } from "@/lib/socket";
import { FormError } from "@/components/auth/DossierCard";
import { Avatar } from "@/components/ui/Avatar";
import { UiIcon } from "@/components/layout/DockIcons";

const MAX_RECORDING_SECONDS = 120;

// How many messages to request on the initial load and on each
// scroll-up ("load older") page. Kept well under the backend's hard cap
// (100) so a single request stays fast even on a cold connection.
const INITIAL_PAGE_SIZE = 60;
const OLDER_PAGE_SIZE = 40;

// Trigger "load older messages" once the user has scrolled within this
// many pixels of the top of the chat pane.
const LOAD_OLDER_THRESHOLD_PX = 60;

// Only auto-scroll to a newly arrived message if the user was already
// within this many pixels of the bottom -- otherwise someone reading
// older history would get yanked back down every poll cycle.
const NEAR_BOTTOM_THRESHOLD_PX = 120;

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function pickSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
}

type Access =
  | { state: "loading" }
  | { state: "blocked"; reason: string }
  | { state: "ready"; squadId: number }
  | { state: "error"; message: string };

/** What the scroll container should do right after the next commit. */
type ScrollAction =
  | { type: "none" }
  | { type: "bottom" }
  | { type: "preserve"; previousScrollHeight: number; previousScrollTop: number };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * One chat bubble. Memoized so that appending new messages (poll) or
 * prepending older ones (scroll-up) doesn't re-render every bubble
 * already on screen -- only the ones that are actually new re-render,
 * since `message` and `mine` keep the same reference/value for anything
 * that hasn't changed.
 */
const MessageRow = memo(function MessageRow({
  message,
  mine,
}: {
  message: SquadMessage;
  mine: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Avatar name={message.sender_name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.04em] text-text">
            {message.sender_name}
            {mine && <span className="ml-1 font-normal text-text-faint">(you)</span>}
            {message.sender_type === "mentor" && (
              <span className="ml-1 font-semibold normal-case text-emerald">· Mentor</span>
            )}
          </span>
          <span className="text-xs text-text-faint">{formatTime(message.created_at)}</span>
        </div>
        {message.message_type === "image" && message.attachment_url && (
          <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-1 block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.attachment_url}
              alt="Shared image"
              className="max-h-56 max-w-full rounded-lg border border-border-soft object-cover"
            />
          </a>
        )}
        {message.message_type === "voice" && message.attachment_url && (
          <div className="mt-1 flex items-center gap-2">
            <audio controls src={message.attachment_url} className="h-9 max-w-[240px]" />
            {message.attachment_duration_seconds ? (
              <span className="text-xs text-text-faint">
                {formatDuration(message.attachment_duration_seconds)}
              </span>
            ) : null}
          </div>
        )}
        {message.message && <p className="mt-0.5 break-words text-[15px] text-text">{message.message}</p>}
      </div>
    </div>
  );
});

function SquadNotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mentorSquadId = searchParams.get("squadId");

  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [access, setAccess] = useState<Access>({ state: "loading" });
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mirrors of state that async callbacks (poll interval, scroll handler)
  // need to read without becoming stale closures or forcing the effect
  // that owns the poll interval to restart on every message.
  const messagesRef = useRef<SquadMessage[]>([]);
  const hasMoreOlderRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const pendingScrollActionRef = useRef<ScrollAction>({ type: "none" });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    hasMoreOlderRef.current = hasMoreOlder;
  }, [hasMoreOlder]);

  useEffect(() => {
    loadingOlderRef.current = loadingOlder;
  }, [loadingOlder]);

  // Applies whatever the last state update queued up in
  // pendingScrollActionRef -- either "jump to bottom" (initial load, a
  // new message arriving while already at the bottom, or sending your
  // own message) or "preserve exact position" (older messages were just
  // prepended above what's on screen). Runs before paint so there's no
  // visible flicker/jump.
  useLayoutEffect(() => {
    const action = pendingScrollActionRef.current;
    const el = scrollRef.current;
    pendingScrollActionRef.current = { type: "none" };
    if (!el || action.type === "none") return;
    if (action.type === "bottom") {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTop = el.scrollHeight - action.previousScrollHeight + action.previousScrollTop;
    }
  }, [messages]);

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount
    setSession(s);
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (sessionChecked && !session) router.replace("/auth");
  }, [sessionChecked, session, router]);

  useEffect(() => {
    if (sessionChecked && needsProfiler(session)) router.replace("/profiler");
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

  // ---- Initial load: latest page only, never the full history ----
  const loadInitialMessages = useCallback(async (squadId: number) => {
    try {
      const page = await getSquadMessages(squadId, { limit: INITIAL_PAGE_SIZE });
      pendingScrollActionRef.current = { type: "bottom" };
      setMessages(page.messages);
      setHasMoreOlder(page.hasMore);
      const latest = page.messages[page.messages.length - 1];
      // Opening this page while it's the active view is "seeing" it --
      // clears the mobile drawer's unread dot for this squad.
      if (latest) markNotesSeen(squadId, latest.created_at);
    } catch {
      // Silent -- consistent with this screen's existing soft-fail
      // network handling; reopening the page retries.
    }
  }, []);

  // ---- Scroll-up pagination: fetch one older page, preserve position ----
  const loadOlderMessages = useCallback(async () => {
    if (access.state !== "ready") return;
    const oldest = messagesRef.current[0];
    if (!oldest || !hasMoreOlderRef.current || loadingOlderRef.current) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const container = scrollRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    try {
      const page = await getSquadMessages(access.squadId, {
        before: oldest.id,
        limit: OLDER_PAGE_SIZE,
      });
      if (page.messages.length > 0) {
        pendingScrollActionRef.current = {
          type: "preserve",
          previousScrollHeight,
          previousScrollTop,
        };
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const olderUnique = page.messages.filter((m) => !existingIds.has(m.id));
          return [...olderUnique, ...prev];
        });
      }
      setHasMoreOlder(page.hasMore);
    } catch {
      // Silent -- a failed "load older" attempt just means scrolling up
      // again retries it; it shouldn't interrupt the live chat.
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
    // access is intentionally the only dependency: the rest is read from
    // refs so this callback identity (and therefore the scroll handler
    // that closes over it) stays stable across message updates.
  }, [access]);

  // ---- Reconnect catch-up: fetch only messages newer than the last one we have ----
  // New messages normally arrive over the socket connection below in
  // real time. This is called once whenever that connection is (re)established
  // -- including the very first connect -- to fetch anything sent during
  // the gap: between this page loading and the socket finishing its
  // handshake, or during any dropped-connection/reconnect in between.
  const pollNewMessages = useCallback(async (squadId: number) => {
    if (pollInFlightRef.current) return;
    const current = messagesRef.current;
    const latest = current[current.length - 1];
    if (!latest) return;

    pollInFlightRef.current = true;
    try {
      const page = await getSquadMessages(squadId, { after: latest.id });
      if (page.messages.length === 0) return;

      // Dedup against `prev` (the array as it actually is when this
      // updater runs), not the `current` snapshot taken before the
      // await -- if the user sent a message of their own while this
      // poll was in flight, `prev` already includes it and this avoids
      // appending it a second time.
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = page.messages.filter((m) => !existingIds.has(m.id));
        if (fresh.length === 0) return prev;
        if (isNearBottomRef.current) {
          pendingScrollActionRef.current = { type: "bottom" };
        }
        return [...prev, ...fresh];
      });

      // The "seen" marker only needs the newest id/timestamp the server
      // told us about, which `page.messages` already gives us directly --
      // no need to know exactly which of them ended up newly appended.
      const newest = page.messages[page.messages.length - 1];
      markNotesSeen(squadId, newest.created_at);
    } catch {
      // Silent on poll failures -- don't interrupt an otherwise-working
      // chat over one flaky request; the next poll will retry.
    } finally {
      pollInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (access.state !== "ready") return;
    const squadId = access.squadId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitialMessages(squadId);

    const socket = getSocket();

    function handleNewMessage(row: SquadMessage) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev;
        if (isNearBottomRef.current) {
          pendingScrollActionRef.current = { type: "bottom" };
        }
        return [...prev, row];
      });
      markNotesSeen(squadId, row.created_at);
    }

    function handleConnect() {
      socket.emit("join_squad", squadId, (ack: { ok?: boolean; error?: string } | undefined) => {
        if (ack?.error) {
          // Silent, consistent with this screen's other soft-fail network
          // handling -- the REST fallback below still covers this squad
          // until the next reconnect attempt succeeds in joining the room.
          console.error("Couldn't join squad chat room:", ack.error);
          return;
        }
        // Covers the gap between page load and this connection finishing
        // (and any reconnect gap) -- see pollNewMessages's comment above.
        pollNewMessages(squadId);
      });
    }

    socket.on("connect", handleConnect);
    socket.on("new_message", handleNewMessage);
    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new_message", handleNewMessage);
      socket.disconnect();
    };
  }, [access, loadInitialMessages, pollNewMessages]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;

    if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasMoreOlder && !loadingOlder) {
      loadOlderMessages();
    }
  }

  /** Appends a message this user just sent, without refetching anything. */
  function appendOwnMessage(squadId: number, row: SquadMessage) {
    pendingScrollActionRef.current = { type: "bottom" };
    isNearBottomRef.current = true;
    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    markNotesSeen(squadId, row.created_at);
  }

  function myDisplayName() {
    if (!session) return "You";
    return (session.role === "student" ? session.student?.name : session.mentor?.name) ?? "You";
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (access.state !== "ready" || !draft.trim()) return;
    setError(null);
    setSending(true);
    try {
      const created = await sendSquadMessage(access.squadId, draft.trim());
      appendOwnMessage(access.squadId, { ...created, sender_name: myDisplayName() });
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file || access.state !== "ready") return;
    setError(null);
    setSending(true);
    try {
      const created = await sendSquadMessage(access.squadId, undefined, { file });
      appendOwnMessage(access.squadId, { ...created, sender_name: myDisplayName() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that image.");
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    if (access.state !== "ready" || isRecording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      audioChunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        stream.getTracks().forEach((track) => track.stop());
      });

      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - recordingStartRef.current) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) stopRecordingAndSend();
      }, 250);
    } catch {
      setError("Couldn't access your microphone. Check your browser's mic permission and try again.");
    }
  }

  function cancelRecording() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    audioChunksRef.current = [];
    setIsRecording(false);
  }

  async function stopRecordingAndSend() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || access.state !== "ready") return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const durationSeconds = Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000));

    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
    });
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    setIsRecording(false);

    const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
    audioChunksRef.current = [];
    if (blob.size === 0) return; // stopped almost instantly -- nothing worth sending

    setError(null);
    setSending(true);
    try {
      const created = await sendSquadMessage(access.squadId, undefined, { file: blob, durationSeconds });
      appendOwnMessage(access.squadId, { ...created, sender_name: myDisplayName() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that voice message.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!sessionChecked || !session || needsProfiler(session) || access.state === "loading") {
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
        <a
          href="https://noteviewe.netlify.app"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex w-fit text-sm font-semibold text-cyan underline decoration-cyan/40 underline-offset-4 transition-colors hover:text-text"
        >
          Open Note Viewer
        </a>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="card mt-6 flex-1 overflow-y-auto px-5 py-4"
          style={{ maxHeight: "55vh", minHeight: "40vh" }}
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <UiIcon name="message" className="h-7 w-7 text-text-faint" />
              <p className="text-sm text-text-faint">No notes yet. Say hello.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-soft">
              {loadingOlder && (
                <p className="py-2 text-center text-xs text-text-faint">Loading older notes…</p>
              )}
              {!hasMoreOlder && (
                <p className="py-2 text-center text-xs text-text-faint">
                  You&apos;ve reached the start of this squad&apos;s notes.
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender_type === session.role && m.sender_id === currentSenderId;
                return <MessageRow key={m.id} message={m} mine={mine} />;
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="mt-4 flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={imageInputRef}
            onChange={handleImageSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={sending || isRecording}
            className="btn btn-secondary !px-3"
            aria-label="Send an image"
            title="Send an image"
          >
            <UiIcon name="image" className="h-5 w-5" />
          </button>

          {isRecording ? (
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border-soft bg-surface-2 px-3 py-2">
              <span className="h-2 w-2 flex-none animate-pulse rounded-full bg-red-500" aria-hidden="true" />
              <span className="text-sm text-text-dim">Recording… {formatDuration(recordingSeconds)}</span>
              <button
                type="button"
                onClick={cancelRecording}
                className="ml-auto text-xs font-semibold text-text-faint underline"
              >
                Cancel
              </button>
              <button type="button" onClick={stopRecordingAndSend} className="btn btn-primary !px-4 !py-1.5 text-xs">
                Send
              </button>
            </div>
          ) : (
            <>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a note to your squad…"
                className="input flex-1"
                disabled={sending}
              />
              <button
                type="button"
                onClick={startRecording}
                disabled={sending}
                className="btn btn-secondary !px-3"
                aria-label="Record a voice message"
                title="Record a voice message"
              >
                <UiIcon name="mic" className="h-5 w-5" />
              </button>
              <button type="submit" disabled={sending || !draft.trim()} className="btn btn-primary !px-5">
                Send
              </button>
            </>
          )}
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
