"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearSession, getSession, getToken, isPublicPath } from "@/lib/api";

/**
 * After logging out, pressing the browser's Back button can bring back a
 * protected page (chat, dashboard, ...) exactly as it was -- the browser
 * keeps the old page alive in its back/forward cache, or Next.js shows its
 * cached copy -- but now there is no login behind it, which is how the chat
 * ended up showing "No token provided." instead of asking the user to sign
 * in again.
 *
 * This guard re-checks the session whenever a page is shown, comes back
 * into view, is restored from the back/forward cache, or the login is
 * removed from another tab. If a protected page has no session, the user is
 * sent to the login entry with `replace`, so Back doesn't loop either.
 */
export function AuthGuard() {
  const pathname = usePathname();

  useEffect(() => {
    function signedIn() {
      return !!getToken() && !!getSession();
    }

    function guard() {
      if (isPublicPath(window.location.pathname)) return;
      if (signedIn()) return;
      clearSession();
      window.location.replace("/auth");
    }

    function onPageShow(event: PageTransitionEvent) {
      // `persisted` = restored from the back/forward cache with stale state.
      if (event.persisted) guard();
    }
    function onVisible() {
      if (document.visibilityState === "visible") guard();
    }
    function onStorage(event: StorageEvent) {
      // Logout in another tab clears the keys (event.key null = storage cleared).
      if (event.key === null || event.key === "study-squad:token" || event.key === "study-squad:session") guard();
    }

    guard();
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname]);

  return null;
}
