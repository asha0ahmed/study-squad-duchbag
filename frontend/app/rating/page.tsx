"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSession, StoredSession } from "@/lib/api";
import { MentorRating } from "@/components/tasks/MentorRating";

function RatingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get("taskId");
  const taskId = taskIdParam ? Number(taskIdParam) : undefined;

  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount
    setSession(s);
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!checked) return;
    // Rating is mentor-only -- students and logged-out visitors are sent
    // to their own desk/login rather than seeing an empty/broken page.
    if (!session) {
      router.replace("/auth");
    } else if (session.role !== "mentor") {
      router.replace("/desk");
    }
  }, [checked, session, router]);

  if (!checked || !session || session.role !== "mentor") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Loading ratings…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center">
      <MentorRating taskId={taskId} />
    </main>
  );
}

export default function RatingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-dim">Loading ratings…</p>
        </main>
      }
    >
      <RatingContent />
    </Suspense>
  );
}
