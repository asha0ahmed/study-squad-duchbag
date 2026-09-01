"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, logout, StoredSession } from "@/lib/api";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on route change
    setSession(getSession());
  }, [pathname]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes the drawer whenever the route changes, not a synchronous render-time write
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isStudent = session?.role === "student";
  const isMentor = session?.role === "mentor";
  const name = session?.student?.name ?? session?.mentor?.name ?? "";

  const links = isStudent
    ? [
        { href: "/desk", label: "Dashboard" },
        { href: "/squad", label: "My Squad" },
        { href: "/squad/find", label: "Find Squad" },
        { href: "/squad/notes", label: "Notes" },
        { href: "/profiler", label: "Profiler" },
      ]
    : isMentor
      ? [
          { href: "/desk", label: "Dashboard" },
          { href: "/squad/notes", label: "Notes" },
        ]
      : [];

  function handleLogout() {
    logout();
    setSession(null);
    router.replace("/auth");
  }

  return (
    <>
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

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors " +
                    (active
                      ? "bg-surface-2 text-text"
                      : "text-text-dim hover:bg-surface-2/60 hover:text-text")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {session ? (
              <>
                <span className="avatar h-8 w-8 text-xs">{initials(name)}</span>
                <button onClick={handleLogout} className="btn btn-ghost !px-3 !py-2 text-sm">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/student/login" className="btn btn-ghost !px-3.5 !py-2 text-sm">
                  Sign in
                </Link>
                <Link href="/auth" className="btn btn-primary !px-4 !py-2 text-sm">
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Hamburger button — mobile only */}
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-text md:hidden"
          >
            <span className="relative block h-4 w-4">
              <span
                className={
                  "absolute left-0 top-0 h-[1.5px] w-4 bg-current transition-transform duration-200 " +
                  (open ? "translate-y-[7px] rotate-45" : "")
                }
              />
              <span
                className={
                  "absolute left-0 top-[7px] h-[1.5px] w-4 bg-current transition-opacity duration-200 " +
                  (open ? "opacity-0" : "opacity-100")
                }
              />
              <span
                className={
                  "absolute left-0 top-[14px] h-[1.5px] w-4 bg-current transition-transform duration-200 " +
                  (open ? "-translate-y-[7px] -rotate-45" : "")
                }
              />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="animate-drawer-in absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col border-l border-border bg-bg-raised px-5 py-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold text-text">Menu</span>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-text"
              >
                ✕
              </button>
            </div>

            {session && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
                <span className="avatar h-10 w-10 text-sm">{initials(name)}</span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-text">{name}</p>
                  <p className="text-xs text-text-dim">{isStudent ? "Scholar" : "Mentor"}</p>
                </div>
              </div>
            )}

            <nav className="mt-6 flex flex-1 flex-col gap-1">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={
                      "min-h-[48px] rounded-xl px-4 py-3 text-[15px] font-medium transition-colors " +
                      (active
                        ? "bg-gradient-to-r from-indigo/20 to-violet/20 text-text"
                        : "text-text-dim hover:bg-surface-2 hover:text-text")
                    }
                  >
                    {l.label}
                  </Link>
                );
              })}
              {!session && (
                <>
                  <Link
                    href="/auth/student/login"
                    className="min-h-[48px] rounded-xl px-4 py-3 text-[15px] font-medium text-text-dim hover:bg-surface-2 hover:text-text"
                  >
                    I&apos;m a Scholar
                  </Link>
                  <Link
                    href="/auth/mentor/login"
                    className="min-h-[48px] rounded-xl px-4 py-3 text-[15px] font-medium text-text-dim hover:bg-surface-2 hover:text-text"
                  >
                    I&apos;m a Mentor
                  </Link>
                </>
              )}
            </nav>

            {session ? (
              <button onClick={handleLogout} className="btn btn-secondary btn-block mt-4 min-h-[48px]">
                Sign out
              </button>
            ) : (
              <Link href="/auth" className="btn btn-primary btn-block mt-4 min-h-[48px]">
                Get started
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
