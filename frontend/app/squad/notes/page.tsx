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
import type { SquadMessage, SquadMessageType } from "@/lib/types";
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

// ---- Optimistic ("Messenger-style") sending ----

/** Give up on one send attempt after this long so a hung request can't block the queue. */
const TEXT_SEND_TIMEOUT_MS = 20_000;
const ATTACHMENT_SEND_TIMEOUT_MS = 120_000;
/** How long the "Sent" tick stays visible under a just-confirmed message. */
const SENT_LABEL_MS = 2500;

type OutboxStatus = "sending" | "failed";

/** A message the user sent that the server hasn't confirmed yet. */
interface OutboxItem {
  clientId: string;
  squadId: number;
  type: SquadMessageType;
  /** Trimmed text, or null for attachment-only messages (mirrors what the server stores). */
  text: string | null;
  file?: Blob;
  durationSeconds?: number;
  status: OutboxStatus;
  error?: string;
  /** Local object URL for image/voice preview; revoked once the message is confirmed. */
  previewUrl: string | null;
  /** What the bubble renders while pending. */
  display: SquadMessage;
}

function makeClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Adds rows to the message list without duplicates (by server id) and keeps
 * the list in ascending id order, so a broadcast, a poll and a POST response
 * for the same message can arrive in any order and still yield one bubble.
 */
function mergeMessages(prev: SquadMessage[], rows: SquadMessage[]): SquadMessage[] {
  const ids = new Set(prev.map((m) => m.id));
  const added: SquadMessage[] = [];
  for (const row of rows) {
    if (ids.has(row.id)) continue;
    ids.add(row.id);
    added.push(row);
  }
  if (added.length === 0) return prev;
  const next = [...prev, ...added];
  for (let i = 1; i < next.length; i += 1) {
    if (next[i - 1].id > next[i].id) {
      next.sort((a, b) => a.id - b.id);
      break;
    }
  }
  return next;
}

/** Desktop "Camera": live webcam preview with a capture button. */
function CameraCapture({
  onCapture,
  onClose,
  onUnavailable,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onUnavailable: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) onUnavailable();
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [onUnavailable]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="chat-camera-backdrop" role="dialog" aria-modal="true" aria-label="Take a photo">
      <div className="chat-camera-panel">
        <video
          ref={videoRef}
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className="chat-camera-video"
        />
        <div className="flex items-center justify-center gap-3 pt-3">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={takePhoto} disabled={!ready} className="btn btn-primary">
            Take photo
          </button>
        </div>
      </div>
    </div>
  );
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
  clientId,
  status,
  sent,
  onRetry,
  onDiscard,
}: {
  message: SquadMessage;
  mine: boolean;
  /** Set only for not-yet-confirmed messages from the outbox. */
  clientId?: string;
  status?: OutboxStatus;
  /** Briefly true right after a message is confirmed by the server. */
  sent?: boolean;
  onRetry?: (clientId: string) => void;
  onDiscard?: (clientId: string) => void;
}) {
  return (
    <div className={`flex items-start gap-3 py-3 ${status === "sending" ? "opacity-70" : ""}`}>
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
        {status === "sending" && (
          <p className="mt-0.5 text-xs italic text-text-faint" aria-live="polite">
            Sending…
          </p>
        )}
        {status === "failed" && clientId && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold text-coral">Failed to send</span>
            <button
              type="button"
              onClick={() => onRetry?.(clientId)}
              className="font-semibold text-cyan underline underline-offset-2"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => onDiscard?.(clientId)}
              className="text-text-faint underline underline-offset-2"
            >
              Remove
            </button>
          </p>
        )}
        {sent && !status && <p className="mt-0.5 text-xs text-emerald">✓ Sent</p>}
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
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const attachWrapRef = useRef<HTMLDivElement>(null);

  // Attachment menu (Camera / Gallery / Cancel) + desktop webcam dialog.
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Optimistic outbox: messages shown immediately, each with its own
  // Sending / Failed state, until the server confirms them.
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [sentIds, setSentIds] = useState<Set<number>>(() => new Set());
  const outboxRef = useRef<OutboxItem[]>([]);
  const sendQueueRef = useRef<string[]>([]);
  const queueRunningRef = useRef(false);
  const sentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const identityRef = useRef<{ role: string; id: number; name: string } | null>(null);

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
  }, [messages, outbox]);

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount
    setSession(s);
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!session) {
      identityRef.current = null;
      return;
    }
    const person = session.role === "student" ? session.student : session.mentor;
    identityRef.current = person ? { role: session.role, id: person.id, name: person.name } : null;
  }, [session]);

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

  // ---- Outbox helpers (kept in a ref AND state so async code sees current data) ----
  const updateOutbox = useCallback((fn: (prev: OutboxItem[]) => OutboxItem[]) => {
    outboxRef.current = fn(outboxRef.current);
    setOutbox(outboxRef.current);
  }, []);

  const dropOutboxItem = useCallback(
    (clientId: string) => {
      const item = outboxRef.current.find((i) => i.clientId === clientId);
      if (!item) return null;
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      updateOutbox((prev) => prev.filter((i) => i.clientId !== clientId));
      return item;
    },
    [updateOutbox],
  );

  const flashSent = useCallback((id: number) => {
    setSentIds((prev) => new Set(prev).add(id));
    const timer = setTimeout(() => {
      setSentIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, SENT_LABEL_MS);
    sentTimersRef.current.push(timer);
  }, []);

  /**
   * Single entry point for rows that arrive from the server by ANY route
   * (socket broadcast, reconnect catch-up / fallback poll, or the POST
   * response). Rows are deduped by id; a row that corresponds to one of this
   * user's pending messages replaces that pending bubble instead of showing
   * up next to it. Broadcasts carry the sender's client_id for an exact
   * match; poll rows don't, so those fall back to (sender, type, text).
   */
  const applyIncoming = useCallback(
    (rows: SquadMessage[], squadId: number, fromOwnResponse?: { clientId: string }) => {
      if (rows.length === 0) return;
      const me = identityRef.current;
      let confirmedOwn = false;

      for (const row of rows) {
        let pending: OutboxItem | undefined;
        if (fromOwnResponse) {
          pending = outboxRef.current.find((i) => i.clientId === fromOwnResponse.clientId);
        } else if (row.client_id) {
          pending = outboxRef.current.find((i) => i.clientId === row.client_id);
        } else if (me && row.sender_type === me.role && row.sender_id === me.id) {
          pending = outboxRef.current.find(
            (i) => i.squadId === squadId && i.type === row.message_type && (i.text ?? null) === (row.message ?? null),
          );
        }
        if (pending) {
          dropOutboxItem(pending.clientId);
          flashSent(row.id);
          confirmedOwn = true;
        }
      }

      if (confirmedOwn) {
        pendingScrollActionRef.current = { type: "bottom" };
        isNearBottomRef.current = true;
      } else if (isNearBottomRef.current) {
        pendingScrollActionRef.current = { type: "bottom" };
      }
      setMessages((prev) => mergeMessages(prev, rows));

      const newest = rows[rows.length - 1];
      markNotesSeen(squadId, newest.created_at);
    },
    [dropOutboxItem, flashSent],
  );

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

      // Dedup (by id, against the list as it is when the update runs) and
      // reconciliation with this user's pending messages both live in
      // applyIncoming -- see its comment.
      applyIncoming(page.messages, squadId);
    } catch {
      // Silent on poll failures -- don't interrupt an otherwise-working
      // chat over one flaky request; the next poll will retry.
    } finally {
      pollInFlightRef.current = false;
    }
  }, [applyIncoming]);

  useEffect(() => {
    if (access.state !== "ready") return;
    const squadId = access.squadId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitialMessages(squadId);

    const socket = getSocket();

    function handleNewMessage(row: SquadMessage) {
      applyIncoming([row], squadId);
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

    // Belt-and-suspenders fallback: new messages should arrive instantly
    // over the socket above, but some hosting setups silently block or
    // downgrade WebSocket upgrades (a proxy stripping the Upgrade header,
    // a platform that only supports short-lived connections, etc) --
    // when that happens the socket looks "connected" but never actually
    // delivers `new_message` events, and without this, other members
    // would only ever see a new message after a manual page reload. This
    // guarantees messages still show up within a few seconds regardless,
    // and is a no-op (deduped, no visible change) whenever the socket is
    // already doing its job.
    const fallbackPoll = setInterval(() => {
      pollNewMessages(squadId);
    }, 4000);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new_message", handleNewMessage);
      socket.disconnect();
      clearInterval(fallbackPoll);
    };
  }, [access, loadInitialMessages, pollNewMessages, applyIncoming]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;

    if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasMoreOlder && !loadingOlder) {
      loadOlderMessages();
    }
  }

  // ---- Sending: optimistic, one independent state per message ----

  /**
   * Sends queued messages one at a time (so the server stores them in the
   * order the user sent them -- parallel uploads could otherwise overtake
   * each other on a slow network) but never blocks the UI: the composer stays
   * usable, every message shows immediately, and a message that fails or
   * times out is marked Failed and skipped so it can't hold up the ones
   * behind it.
   */
  const pumpQueue = useCallback(async () => {
    if (queueRunningRef.current) return;
    queueRunningRef.current = true;
    try {
      while (sendQueueRef.current.length > 0) {
        const clientId = sendQueueRef.current.shift() as string;
        const item = outboxRef.current.find((i) => i.clientId === clientId);
        // Already confirmed via broadcast/poll, or removed by the user.
        if (!item || item.status !== "sending") continue;

        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          item.file ? ATTACHMENT_SEND_TIMEOUT_MS : TEXT_SEND_TIMEOUT_MS,
        );
        try {
          const created = await sendSquadMessage(
            item.squadId,
            item.text ?? undefined,
            item.file ? { file: item.file, durationSeconds: item.durationSeconds } : undefined,
            { clientId, signal: controller.signal },
          );
          const name = identityRef.current?.name ?? "You";
          applyIncoming([{ ...created, sender_name: name }], item.squadId, { clientId });
        } catch (err) {
          const aborted = err instanceof DOMException && err.name === "AbortError";
          const message = aborted
            ? "Timed out. Check your connection and retry."
            : err instanceof ApiError
              ? err.message
              : "Couldn't send that message.";
          // If a broadcast already confirmed it, the item is gone -- nothing to mark.
          updateOutbox((prev) =>
            prev.map((i) => (i.clientId === clientId ? { ...i, status: "failed", error: message } : i)),
          );
        } finally {
          clearTimeout(timeout);
        }
      }
    } finally {
      queueRunningRef.current = false;
    }
  }, [applyIncoming, updateOutbox]);

  function enqueueMessage(payload: {
    type: SquadMessageType;
    text?: string;
    file?: Blob;
    durationSeconds?: number;
  }) {
    if (access.state !== "ready") return;
    const me = identityRef.current;
    const clientId = makeClientId();
    const previewUrl = payload.file ? URL.createObjectURL(payload.file) : null;
    const item: OutboxItem = {
      clientId,
      squadId: access.squadId,
      type: payload.type,
      text: payload.text ?? null,
      file: payload.file,
      durationSeconds: payload.durationSeconds,
      status: "sending",
      previewUrl,
      display: {
        id: -1,
        sender_type: (me?.role ?? "student") as SquadMessage["sender_type"],
        sender_id: me?.id ?? 0,
        message: payload.text ?? null,
        message_type: payload.type,
        attachment_url: previewUrl,
        attachment_format: null,
        attachment_bytes: payload.file?.size ?? null,
        attachment_duration_seconds: payload.durationSeconds ?? null,
        created_at: new Date().toISOString(),
        sender_name: me?.name ?? "You",
      },
    };
    pendingScrollActionRef.current = { type: "bottom" };
    isNearBottomRef.current = true;
    updateOutbox((prev) => [...prev, item]);
    sendQueueRef.current.push(clientId);
    void pumpQueue();
  }

  const retryMessage = useCallback(
    (clientId: string) => {
      updateOutbox((prev) =>
        prev.map((i) => (i.clientId === clientId ? { ...i, status: "sending", error: undefined } : i)),
      );
      if (!sendQueueRef.current.includes(clientId)) sendQueueRef.current.push(clientId);
      void pumpQueue();
    },
    [pumpQueue, updateOutbox],
  );

  const discardMessage = useCallback(
    (clientId: string) => {
      dropOutboxItem(clientId);
    },
    [dropOutboxItem],
  );

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (access.state !== "ready" || !text) return;
    setError(null);
    setDraft("");
    enqueueMessage({ type: "text", text });
    // Keep the keyboard open (Messenger-style): hold focus on the typing box.
    textInputRef.current?.focus();
  }

  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    setAttachMenuOpen(false);
    if (!file || access.state !== "ready") return;
    setError(null);
    enqueueMessage({ type: "image", file });
  }

  // ---- Attachment menu: Camera / Gallery / Cancel ----
  function chooseGallery() {
    setAttachMenuOpen(false);
    galleryInputRef.current?.click();
  }

  function chooseCamera() {
    setAttachMenuOpen(false);
    const coarsePointer =
      typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    const canUseWebcam =
      typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
    if (!coarsePointer && canUseWebcam) {
      // Desktop: a file input's `capture` hint is ignored, so open the webcam directly.
      setCameraOpen(true);
    } else {
      // Phones/tablets: the `capture` input launches the native camera app.
      cameraInputRef.current?.click();
    }
  }

  const handleCameraUnavailable = useCallback(() => {
    setCameraOpen(false);
    setError("Couldn't access your camera. Check your browser's camera permission, or pick from Gallery.");
  }, []);

  function handleCameraCaptured(file: File) {
    setCameraOpen(false);
    if (access.state !== "ready") return;
    setError(null);
    enqueueMessage({ type: "image", file });
  }

  useEffect(() => {
    if (!attachMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!attachWrapRef.current?.contains(event.target as Node)) setAttachMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAttachMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [attachMenuOpen]);

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
    enqueueMessage({ type: "voice", file: blob, durationSeconds });
  }

  useEffect(() => {
    const timers = sentTimersRef;
    const pending = outboxRef;
    return () => {
      timers.current.forEach(clearTimeout);
      pending.current.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
    };
  }, []);

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
    <main className="chat-page flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="chat-shell mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <div className="chat-header shrink-0">
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
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="chat-message-pane card mt-4 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4"
        >
          {messages.length === 0 && outbox.length === 0 ? (
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
                return <MessageRow key={m.id} message={m} mine={mine} sent={sentIds.has(m.id)} />;
              })}
              {outbox.map((o) => (
                <MessageRow
                  key={o.clientId}
                  clientId={o.clientId}
                  message={o.display}
                  mine
                  status={o.status}
                  onRetry={retryMessage}
                  onDiscard={discardMessage}
                />
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="chat-composer mt-3 flex shrink-0 items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={galleryInputRef}
            onChange={handleImageSelected}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={handleImageSelected}
            className="hidden"
          />
          {/* 1. Image: opens the Camera / Gallery / Cancel menu */}
          <div ref={attachWrapRef} className="chat-attach-wrap">
            <button
              type="button"
              onClick={() => setAttachMenuOpen((open) => !open)}
              disabled={isRecording}
              className="chat-icon-btn"
              aria-label="Send an image"
              aria-haspopup="menu"
              aria-expanded={attachMenuOpen}
              title="Send an image"
            >
              <UiIcon name="image" className="h-5 w-5" />
            </button>
            {attachMenuOpen && (
              <div className="chat-attach-menu" role="menu">
                <button type="button" role="menuitem" onClick={chooseCamera} className="chat-attach-item">
                  <span aria-hidden="true">📷</span> Camera
                </button>
                <button type="button" role="menuitem" onClick={chooseGallery} className="chat-attach-item">
                  <span aria-hidden="true">🖼️</span> Gallery
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setAttachMenuOpen(false)}
                  className="chat-attach-item chat-attach-cancel"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isRecording ? (
            <>
              {/* Recording state: timer pill + cancel + round send */}
              <div className="chat-recording flex min-w-0 flex-1 items-center gap-2">
                <span className="h-2 w-2 flex-none animate-pulse rounded-full bg-red-500" aria-hidden="true" />
                <span className="truncate text-sm text-text-dim">Recording… {formatDuration(recordingSeconds)}</span>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="ml-auto flex-none text-xs font-semibold text-text-faint underline"
                >
                  Cancel
                </button>
              </div>
              <button
                type="button"
                onClick={stopRecordingAndSend}
                className="chat-send-btn"
                aria-label="Send voice message"
                title="Send voice message"
              >
                <UiIcon name="send" className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              {/* 2. Voice message */}
              <button
                type="button"
                onClick={startRecording}
                className="chat-icon-btn"
                aria-label="Record a voice message"
                title="Record a voice message"
              >
                <UiIcon name="mic" className="h-5 w-5" />
              </button>
              {/* 3. Typing box */}
              <input
                ref={textInputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a note…"
                className="chat-input"
                enterKeyHint="send"
                autoComplete="off"
              />
              {/* 4. Send */}
              <button
                type="submit"
                disabled={!draft.trim()}
                // Stops the tap from stealing focus off the typing box, so the
                // keyboard stays up after sending (like Messenger/WhatsApp).
                onMouseDown={(e) => e.preventDefault()}
                className="chat-send-btn"
                aria-label="Send message"
                title="Send message"
              >
                <UiIcon name="send" className="h-5 w-5" />
              </button>
            </>
          )}
        </form>
        <div className="chat-error mt-2 shrink-0">
          <FormError message={error} />
        </div>
      </div>
      {cameraOpen && (
        <CameraCapture
          onCapture={handleCameraCaptured}
          onClose={() => setCameraOpen(false)}
          onUnavailable={handleCameraUnavailable}
        />
      )}
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
