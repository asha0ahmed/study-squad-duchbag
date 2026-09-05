"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSession, needsProfiler, StoredSession } from "@/lib/api";
import { StudentTasks } from "@/components/tasks/StudentTasks";
import { MentorTasks } from "@/components/tasks/MentorTasks";

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const squadIdParam = searchParams.get("squadId");
  const initialSquadId = squadIdParam ? Number(squadIdParam) : undefined;

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
    if (checked && needsProfiler(session)) router.replace("/profiler");
  }, [checked, session, router]);

  if (!checked) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Loading tasks…</p>
      </main>
    );
  }

  if (!session || needsProfiler(session)) return null;

  return (
    <main className="flex flex-1 justify-center">
      {session.role === "student" && session.student ? (
        <StudentTasks student={session.student} />
      ) : session.mentor ? (
        <MentorTasks key={initialSquadId} mentor={session.mentor} initialSquadId={initialSquadId} />
      ) : null}
    </main>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-dim">Loading tasks…</p>
        </main>
      }
    >
      <TasksContent />
    </Suspense>
  );
}
