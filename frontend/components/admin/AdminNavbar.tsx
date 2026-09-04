"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminSecret } from "@/lib/api";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/students", label: "Student Records", icon: "🎓" },
  { href: "/admin/mentors", label: "Mentor Records", icon: "🧭" },
  { href: "/admin/payments", label: "Payments", icon: "💳" },
  { href: "/admin/squads", label: "Squad Monitoring", icon: "📡" },
  { href: "/admin/reports", label: "Reports & Analytics", icon: "📊" },
];

/**
 * The Admin Panel's own dedicated navigation -- entirely separate from
 * the student/mentor Navbar + BottomNav. This is the direct fix for
 * "Admin navbar behaves like the Student navbar": admin auth is a
 * shared-secret header, not a student/mentor session, so it never
 * belongs in the shared components. Every /admin/* route renders this
 * instead (see app/admin/layout.tsx), and the global Navbar/BottomNav
 * are told to render nothing at all on /admin routes.
 */
export function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleSignOut() {
    clearAdminSecret();
    router.replace("/admin/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft/80 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo to-violet font-display text-base font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(99,102,241,0.7)]">
            S
          </span>
          <span className="hidden font-display text-lg font-bold tracking-tight text-text sm:inline">
            Study<span className="text-gradient-brand">Squad</span>
            <span className="ml-1.5 align-middle text-xs font-semibold uppercase tracking-[0.08em] text-text-faint">
              Admin
            </span>
          </span>
        </Link>

        <nav aria-label="Admin" className="flex flex-1 items-center gap-1 overflow-x-auto">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors " +
                  (active ? "bg-surface-2 text-text" : "text-text-dim hover:text-text")
                }
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={handleSignOut} className="btn btn-ghost !px-3.5 !py-2 text-sm shrink-0">
          Sign out
        </button>
      </div>
    </header>
  );
}
