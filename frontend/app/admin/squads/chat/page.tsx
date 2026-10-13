"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { FormError } from "@/components/auth/DossierCard";
import { SquadIdBadge } from "@/components/squad/SquadIdBadge";
import { adminGetSquadMessages, ApiError, getAdminSecret } from "@/lib/api";
import type { AdminSquadChatPage, SquadMessage } from "@/lib/types";

const PAGE_SIZE = 60;
const POLL_MS = 5000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function mergeById(current: SquadMessage[], incoming: SquadMessage[]) {
  const map = new Map<number, SquadMessage>();
  for (const m of current) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.id - b.id);
}

function AdminSquadChatContent() {
  const searchParams = useSearchParams();
  const squadId = Number(searchParams.get("squadId"));
  const secret = getAdminSecret();

  const [squad, setSquad] = useState<AdminSquadChatPage["squad"] | null>(null);
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const latestIdRef = useRef(0);

  useEffect(() => {
    latestIdRef.current = messages.length ? messages[messages.length - 1].id : 0;
  }, [messages]);

  // Initial load.
  useEffect(() => {
    if (!secret || !Number.isFinite(squadId)) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await adminGetSquadMessages(secret, squadId, { limit: PAGE_SIZE });
        if (cancelled) return;
        setSquad(page.squad);
        setMessages(page.messages);
        setHasMoreOlder(page.hasMore);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load this chat.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [secret, squadId]);

  // Live updates: poll for messages newer than the last one we have.
  useEffect(() => {
    if (!secret || !Number.isFinite(squadId) || loading) return;
    const timer = window.setInterval(async () => {
      try {
        const page = await adminGetSquadMessages(secret, squadId, { after: latestIdRef.current });
        if (page.messages.length > 0) setMessages((cur) => mergeById(cur, page.messages));
      } catch {
        /* transient: next tick retries */
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [secret, squadId, loading]);

  // Keep the newest message in view unless the admin scrolled up to read history.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  const loadOlder = useCallback(async () => {
    if (!secret || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const page = await adminGetSquadMessages(secret, squadId, {
        before: messages[0].id,
        limit: PAGE_SIZE,
      });
      stickToBottom.current = false;
      setMessages((cur) => mergeById(cur, page.messages));
      setHasMoreOlder(page.hasMore);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }, [secret, squadId, loadingOlder, messages]);

  if (!Number.isFinite(squadId) || squadId <= 0) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card w-full max-w-md px-6 py-8 text-center">
          <p className="text-sm text-text-dim">Pick a squad from the Squads list to open its chat.</p>
          <Link href="/admin/squads" className="btn btn-secondary mt-5 inline-flex">
            Back to Squads
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <Link href="/admin/squads" className="text-sm font-semibold text-cyan underline underline-offset-4">
          ← Back to Squads
        </Link>

        <div className="mt-3">
          <p className="eyebrow text-cyan">
            Squad Chats (admin view)
            {squad && (
              <>
                {" · "}
                <SquadIdBadge code={squad.public_code} prefix="ID" />
              </>
            )}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
            {squad ? `${squad.academic_group} · ${squad.year}` : "Loading…"}
          </h1>
          {squad && (
            <p className="mt-1 text-xs text-text-faint">
              {squad.aspirant_type} · {squad.status} · Mentor: {squad.mentor_name ?? "none yet"} ·
              read-only
            </p>
          )}
        </div>

        <div className="mt-3">
          <FormError message={error} />
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="card mt-3 flex h-[65vh] flex-col gap-3 overflow-y-auto px-4 py-4"
        >
          {loading ? (
            <p className="m-auto text-sm text-text-dim">Opening chat…</p>
          ) : (
            <>
              {hasMoreOlder && (
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="btn btn-secondary mx-auto !py-1.5 text-xs"
                >
                  {loadingOlder ? "Loading…" : "Load older messages"}
                </button>
              )}
              {messages.length === 0 && (
                <p className="m-auto text-sm text-text-faint">No messages in this squad yet.</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="card-flat px-3 py-2.5">
                  <p className="text-xs">
                    <span className="font-semibold text-text">{m.sender_name ?? "Unknown"}</span>
                    <span className="ml-2 rounded-full border border-border-soft px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-faint">
                      {m.sender_type}
                    </span>
                    <span className="ml-2 text-text-faint">{formatTime(m.created_at)}</span>
                  </p>
                  {m.message_type === "image" && m.attachment_url && (
                    <a href={m.attachment_url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, size unknown */}
                      <img
                        src={m.attachment_url}
                        alt="Shared in squad chat"
                        className="mt-2 max-h-72 max-w-full rounded-lg"
                      />
                    </a>
                  )}
                  {m.message_type === "voice" && m.attachment_url && (
                    <audio controls src={m.attachment_url} className="mt-2 w-full" />
                  )}
                  {m.message && (
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-text">{m.message}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AdminSquadChatPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-dim">Opening chat…</p>
        </main>
      }
    >
      <AdminSquadChatContent />
    </Suspense>
  );
}
