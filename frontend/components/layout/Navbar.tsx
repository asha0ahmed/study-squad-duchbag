"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getLatestPayment,
  getMySquad,
  getNotesLastSeen,
  getSession,
  getSquadMessages,
  logout,
  needsProfiler,
  StoredSession,
} from "@/lib/api";
import type { Payment, StudentSquadView } from "@/lib/types";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function paymentBadge(payment: Payment | null | undefined): { label: string; tone: string } | null {
  if (payment === undefined) return null;
  if (payment === null) return { label: "Not subscribed", tone: "text-text-faint" };
  if (payment.status === "approved") return { label: "Active", tone: "text-emerald" };
  if (payment.status === "pending") return { label: "Pending review", tone: "text-cyan" };
  return { label: "Rejected — resubmit", tone: "text-coral" };
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [open, setOpen] = useState(false);

  // Mobile-drawer-only data: what a student needs to see curated, high-value
  // actions (squad state, unread notes, payment status). `undefined` means
  // "not fetched yet" (as opposed to `null`, which means "fetched, and
  // there's genuinely none") so the drawer can tell a real answer apart
  // from a loading state.
  const [studentSquad, setStudentSquad] = useState<StudentSquadView | null | undefined>(undefined);
  const [payment, setPayment] = useState<Payment | null | undefined>(undefined);
  const [notesUnread, setNotesUnread] = useState(false);

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
  const studentId = session?.student?.id;
  const profileIncomplete = needsProfiler(session);

  // Drop stale drawer-only data whenever the logged-in student changes
  // (including logging out) so it never leaks across accounts/sessions.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets local UI state when the identity of the logged-in student changes, not a synchronous render-time write
    setStudentSquad(undefined);
    setPayment(undefined);
    setNotesUnread(false);
  }, [studentId]);

  // Fetch the drawer's curated data lazily -- only once the drawer is
  // actually opened, and only once per student session -- rather than on
  // every page load site-wide.
  useEffect(() => {
    if (!open || !isStudent || profileIncomplete || !studentId) return;
    if (studentSquad !== undefined) return;

    let cancelled = false;
    (async () => {
      const [squadResult, paymentResult] = await Promise.allSettled([
        getMySquad(studentId),
        getLatestPayment(studentId),
      ]);
      if (cancelled) return;

      if (squadResult.status === "fulfilled") {
        setStudentSquad(squadResult.value);
        if (squadResult.value.squad.status === "locked") {
          try {
            const messages = await getSquadMessages(squadResult.value.squad.id);
            if (cancelled) return;
            const latest = messages[messages.length - 1];
            if (latest) {
              const seen = getNotesLastSeen(squadResult.value.squad.id);
              setNotesUnread(!seen || new Date(latest.created_at) > new Date(seen));
            }
          } catch {
            // Unread indicator is a nicety -- fail silently.
          }
        }
      } else {
        setStudentSquad(null);
      }

      setPayment(paymentResult.status === "fulfilled" ? paymentResult.value : null);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isStudent, profileIncomplete, studentId, studentSquad]);

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

  // ---- Curated mobile-drawer content ----
  // Deliberately not a mirror of `links` above -- chosen for what a student
  // (or mentor) needs fast, one-handed, on a phone.

  const extrasLoading = isStudent && !profileIncomplete && studentSquad === undefined;

  let primaryCta: { href: string; label: string; icon: string } | null = null;
  if (isStudent) {
    if (profileIncomplete) {
      primaryCta = { href: "/profiler", label: "Complete Your Profile", icon: "📊" };
    } else if (studentSquad) {
      primaryCta = { href: "/squad", label: "My Squad", icon: "🧭" };
    } else {
      primaryCta = { href: "/squad/find", label: "Find My Squad", icon: "🎯" };
    }
  } else if (isMentor) {
    primaryCta = { href: "/desk?tab=browse", label: "Browse Open Squads", icon: "🧭" };
  }

  const notesReady = studentSquad ? studentSquad.squad.status === "locked" : false;
  const badge = paymentBadge(payment);

  type DrawerItem = {
    href: string;
    label: string;
    desc: string;
    icon: string;
    dot?: boolean;
    badge?: { label: string; tone: string } | null;
  };

  const studentItems: DrawerItem[] = profileIncomplete
    ? []
    : [
        { href: "/desk", label: "Dashboard", desc: "Your squad at a glance", icon: "🏠" },
        { href: "/profiler", label: "My Profile", desc: "Edit your subject ratings", icon: "👤" },
        {
          href: "/squad/notes",
          label: "Squad Notes",
          desc: notesReady ? "Chat with your squad" : "Unlocks once your squad is active",
          icon: "💬",
          dot: notesUnread,
        },
        {
          href: "/squad/subscribe",
          label: "Subscribe",
          desc: "Mentor-fee payment status",
          icon: "💳",
          badge,
        },
      ];

  const mentorItems: DrawerItem[] = [
    { href: "/desk?tab=mine", label: "My Squads", desc: "Squads you're guiding", icon: "🧑‍🏫" },
    { href: "/desk?tab=browse", label: "Browse Open Squads", desc: "Claim a squad to mentor", icon: "🔍" },
    { href: "/squad/notes", label: "Squad Notes", desc: "Open from one of your squads", icon: "💬" },
  ];

  const drawerItems = isStudent ? studentItems : isMentor ? mentorItems : [];

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
          <div className="animate-drawer-in absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col overflow-y-auto border-l border-border bg-bg-raised px-5 py-5 shadow-2xl">
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

            {/* Primary action -- the single most important thing this
                person can do right now, styled as a filled gradient
                button so it's unmistakable and easy to hit one-handed. */}
            {session && primaryCta && (
              <Link
                href={primaryCta.href}
                className="mt-5 flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo to-violet px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(99,102,241,0.8)] transition-transform active:scale-[0.98]"
              >
                <span className="text-lg">{primaryCta.icon}</span>
                {primaryCta.label}
              </Link>
            )}

            {session && profileIncomplete && (
              <p className="mt-3 text-center text-xs text-text-faint">
                Finish this to unlock your squad, notes, and subscription.
              </p>
            )}

            {/* Curated quick-action list -- larger touch targets and icons,
                not a straight copy of the desktop nav. */}
            {session && drawerItems.length > 0 && (
              <nav className="mt-5 flex flex-col gap-1.5">
                {drawerItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        "flex min-h-[56px] items-center gap-3.5 rounded-xl px-3.5 py-3 transition-colors " +
                        (active ? "bg-surface-2" : "hover:bg-surface-2/60")
                      }
                    >
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-lg">
                        {item.icon}
                        {item.dot && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-raised bg-coral" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-text">{item.label}</span>
                        <span className="mt-0.5 block truncate text-xs text-text-dim">{item.desc}</span>
                      </div>
                      {item.badge && (
                        <span className={"shrink-0 text-xs font-semibold " + item.badge.tone}>
                          {item.badge.label}
                        </span>
                      )}
                      {item.href === "/squad/subscribe" && extrasLoading && !item.badge && (
                        <span className="skeleton h-3 w-14 shrink-0 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}

            {!session && (
              <nav className="mt-6 flex flex-1 flex-col gap-1">
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
              </nav>
            )}

            <div className="mt-auto pt-5">
              {session ? (
                <button onClick={handleLogout} className="btn btn-secondary btn-block min-h-[48px]">
                  Sign out
                </button>
              ) : (
                <Link href="/auth" className="btn btn-primary btn-block min-h-[48px]">
                  Get started
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
