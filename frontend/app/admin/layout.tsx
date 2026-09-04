"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAdminSecret } from "@/lib/api";
import { AdminNavbar } from "@/components/admin/AdminNavbar";

/**
 * Centralized admin auth guard. Previously each admin page (e.g.
 * /admin/payments) re-implemented its own "check secret, redirect if
 * missing" effect. Doing it once here means every new admin page is
 * automatically protected and automatically gets the dedicated
 * AdminNavbar, instead of silently falling back to the public
 * Navbar/BottomNav the way earlier admin pages did.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read on route change, mirrors the pattern used by every other guard in this app
      setChecked(true);
      return;
    }
    const secret = getAdminSecret();
    setAuthed(Boolean(secret));
    setChecked(true);
  }, [isLoginPage, pathname]);

  useEffect(() => {
    if (checked && !isLoginPage && !authed) {
      router.replace("/admin/login");
    }
  }, [checked, isLoginPage, authed, router]);

  if (isLoginPage) {
    return <main className="flex flex-1 flex-col">{children}</main>;
  }

  if (!checked || !authed) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-dim">Checking admin access…</p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminNavbar />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
