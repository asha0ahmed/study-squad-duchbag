"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminSecret, getSession } from "@/lib/api";

/**
 * The public landing page ("/") is written for a logged-out visitor --
 * its only calls to action are "I'm a Scholar" / "I'm a Mentor", which
 * both link to login pages. If an already-authenticated student, mentor,
 * or admin ever lands here (e.g. by tapping "Home" in the dock, or a
 * stale bookmark), those buttons would send them straight back to a
 * login screen -- which is exactly the reported "Home tab logs me out"
 * bug for Admin/Mentor.
 *
 * This runs once on mount and, if a session is found, immediately
 * replaces the route with that role's real home. Logged-out visitors
 * see no redirect and the marketing page renders normally.
 */
export function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (getAdminSecret()) {
      router.replace("/admin");
      return;
    }
    const session = getSession();
    if (session?.role === "mentor") {
      router.replace("/desk");
    } else if (session?.role === "student") {
      router.replace("/desk");
    }
  }, [router]);

  return null;
}
