"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, StoredSession } from "@/lib/api";
import { StudentDesk } from "@/components/desk/StudentDesk";
import { MentorDesk } from "@/components/desk/MentorDesk";

export default function DeskPage() {
  const router = useRouter();
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

  if (!checked) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Opening your desk…</p>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="flex flex-1 justify-center">
      {session.role === "student" && session.student ? (
        <StudentDesk student={session.student} />
      ) : session.mentor ? (
        <MentorDesk mentor={session.mentor} />
      ) : null}
    </main>
  );
}
