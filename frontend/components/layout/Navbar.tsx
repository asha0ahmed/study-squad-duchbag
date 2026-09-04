"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, StoredSession } from "@/lib/api";

/**
 * Slim top bar -- branding + auth entry points only.
 *
 * Primary in-app navigation (Home / Dashboard / My Squad / Note / More)
 * now lives entirely in the floating bottom dock (see BottomNav), which
 * replaces the old desktop link row and mobile hamburger drawer. Once a
 * session exists, everything account-related (avatar, name, sign out)
 * moved into the dock's More sheet, so this bar only needs to carry the
 * logo and, for logged-out visitors, the sign-in/get-started actions.
 *
 * Admin uses a completely separate auth mechanism (a secret header, not
 * a student/mentor session -- see getAdminSecret in lib/api.ts) and its
 * own dedicated chrome (see app/admin/layout.tsx + AdminNavbar). Without
 * this check, an authenticated admin would fall through the `!session`
 * branch below and see the public "Sign in / Get started" scholar CTAs,
 * which is exactly the "admin navbar behaves like the student navbar"
 * bug -- so this bar renders nothing at all on /admin routes.
 */
export function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on route change
    setSession(getSession());
  }, [pathname]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft/80 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={session ? "/desk" : "/"} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo to-violet font-display text-base font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(99,102,241,0.7)]">
            S
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-text">
            Study<span className="text-gradient-brand">Squad</span>
          </span>
        </Link>

        {!session && (
          <div className="flex items-center gap-3">
            <Link href="/auth/student/login" className="btn btn-ghost !px-3.5 !py-2 text-sm">
              Sign in
            </Link>
            <Link href="/auth" className="btn btn-primary !px-4 !py-2 text-sm">
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
