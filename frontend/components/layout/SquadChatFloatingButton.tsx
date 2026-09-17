"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, StoredSession } from "@/lib/api";
import { UiIcon } from "./DockIcons";

export function SquadChatFloatingButton() {
  const pathname = usePathname();
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system on route change
    setSession(getSession());
  }, [pathname]);

  if (!session || pathname.startsWith("/admin") || pathname === "/squad/notes") return null;

  return (
    <Link
      href="/squad/notes"
      aria-label="Open Squad Chat"
      title="Squad Chat"
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-violet text-white shadow-[0_12px_28px_-10px_rgba(99,102,241,0.9)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-95 sm:bottom-24 sm:right-6 sm:h-14 sm:w-14 lg:bottom-8 lg:right-8"
    >
      <UiIcon name="message" className="h-6 w-6 sm:h-7 sm:w-7" />
      <span className="sr-only">Squad Chat</span>
    </Link>
  );
}
