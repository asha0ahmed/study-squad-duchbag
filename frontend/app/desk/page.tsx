"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSession, needsProfiler, StoredSession } from "@/lib/api";
import { StudentDesk } from "@/components/desk/StudentDesk";
import { MentorDesk } from "@/components/desk/MentorDesk";

function DeskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mentorTab = searchParams.get("tab") === "browse" ? "browse" : "mine";
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount
    setSession(s);
    setChecked(true);
  }, []);

  useEffect(() => {
    if (checked && !session) router.replace("/auth");
  }, [checked, session, router]);

  useEffect(() => {
    // First-time students (no subject ratings on file yet) go straight to
    // the Profiler instead of an empty desk -- see lib/api.ts's
    // needsProfiler for how "first-time" is detected.
    if (checked && needsProfiler(session)) router.replace("/profiler");
  }, [checked, session, router]);

  if (!checked) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Opening your desk…</p>
      </main>
    );
  }

  if (!session || needsProfiler(session)) return null;

  return (
    <main className="flex flex-1 justify-center">
      {session.role === "student" && session.student ? (
        <StudentDesk student={session.student} />
      ) : session.mentor ? (
        <MentorDesk key={mentorTab} mentor={session.mentor} initialTab={mentorTab} />
      ) : null}
    </main>
  );
}

export default function DeskPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-dim">Opening your desk…</p>
        </main>
      }
    >
      <DeskContent />
    </Suspense>
  );
}
