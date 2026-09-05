"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import {
  CloseIcon,
  DashboardIcon,
  MoreIcon,
  NoteIcon,
  SquadIcon,
  StarIcon,
  TaskIcon,
} from "./DockIcons";

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

type PrimaryItem = {
  key: string;
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  match: (pathname: string) => boolean;
};

type SecondaryItem = {
  href: string;
  label: string;
  desc: string;
  icon: string;
  dot?: boolean;
  badge?: { label: string; tone: string } | null;
};

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Same curated drawer-data pattern the old mobile drawer used: fetched
  // lazily, only for a logged-in student, only once per session, and only
  // once the More sheet is actually opened.
  const [studentSquad, setStudentSquad] = useState<StudentSquadView | null | undefined>(undefined);
  const [payment, setPayment] = useState<Payment | null | undefined>(undefined);
  const [notesUnread, setNotesUnread] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on route change
    setSession(getSession());
  }, [pathname]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes the sheet whenever the route changes, not a synchronous render-time write
    setMoreOpen(false);
  }, [pathname]);

  // Admin has its own dedicated chrome (see app/admin/layout.tsx); this
  // dock only ever knows about the student/mentor session, so it must not
  // render at all on /admin routes -- otherwise it'd show generic,
  // role-blind items (or nothing useful) over the admin's real nav.
  const isAdminRoute = pathname.startsWith("/admin");

  const isStudent = session?.role === "student";
  const isMentor = session?.role === "mentor";
  const name = session?.student?.name ?? session?.mentor?.name ?? "";
  const studentId = session?.student?.id;
  const profileIncomplete = needsProfiler(session);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets local UI state when the identity of the logged-in student changes, not a synchronous render-time write
    setStudentSquad(undefined);
    setPayment(undefined);
    setNotesUnread(false);
  }, [studentId]);

  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  // The dock reserves bottom page-space app-wide, but only while there's an
  // authenticated session -- on the public marketing/auth pages there's no
  // dock, so nothing should reserve space for it.
  useEffect(() => {
    const hasDock = Boolean(session);
    document.body.classList.toggle("has-bottom-dock", hasDock);
    return () => {
      document.body.classList.remove("has-bottom-dock");
    };
  }, [session]);

  // Notes are relevant to both roles as soon as the squad chat exists, so
  // fetch that (and, for students, the curated Subscribe/Find data) lazily
  // once the sheet opens -- not on every page load site-wide.
  useEffect(() => {
    if (!moreOpen || !isStudent || profileIncomplete || !studentId) return;
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
  }, [moreOpen, isStudent, profileIncomplete, studentId, studentSquad]);

  function handleLogout() {
    logout();
    setSession(null);
    setMoreOpen(false);
    router.replace("/auth");
  }

  const squadHref = isStudent ? "/squad" : "/desk?tab=mine";

  // Both roles get a role-appropriate second/third dock slot instead of a
  // hardcoded student-shaped nav:
  //   - Home -> Tasks (students see "Today's Given Tasks" + submit answers;
  //     mentors see task management/upload for their squads). Mentors
  //     never had a meaningful Home destination anyway (it silently
  //     duplicated Dashboard), so this is a pure improvement for them too.
  //   - My Squad -> Rating for mentors only (students keep My Squad as-is).
  //     A mentor rating a squad's task submissions is a more frequent
  //     action than re-viewing their own squad roster, which is already
  //     one tap away via Dashboard -> My Squads.
  const ratingOrSquadHref = isMentor ? "/rating" : squadHref;

  const primaryItems: PrimaryItem[] = useMemo(
    () => [
      {
        key: "tasks",
        href: "/tasks",
        label: "Tasks",
        icon: TaskIcon,
        match: (p) => p === "/tasks",
      },
      {
        key: "dashboard",
        href: "/desk",
        label: "Dashboard",
        icon: DashboardIcon,
        match: (p) => p === "/desk",
      },
      {
        key: "squad",
        href: ratingOrSquadHref,
        label: isMentor ? "Rating" : "My Squad",
        icon: isMentor ? StarIcon : SquadIcon,
        match: (p) => (isMentor ? p === "/rating" : p === "/squad"),
      },
      {
        key: "note",
        href: "/squad/notes",
        label: "Note",
        icon: NoteIcon,
        match: (p) => p === "/squad/notes",
      },
      {
        key: "more",
        href: "#more",
        label: "More",
        icon: MoreIcon,
        match: (p) => ["/profiler", "/squad/find", "/squad/subscribe"].includes(p),
      },
    ],
    [ratingOrSquadHref, isMentor]
  );

  const activeIndex = useMemo(() => {
    if (moreOpen) return 4;
    const idx = primaryItems.findIndex((item) => item.match(pathname));
    return idx;
  }, [primaryItems, pathname, moreOpen]);

  // ---- Secondary destinations, shown inside the More sheet ----
  // These are the app's existing secondary routes -- not duplicates of the
  // five primary dock items, and not invented destinations.

  const extrasLoading = isStudent && !profileIncomplete && studentSquad === undefined;
  const badge = paymentBadge(payment);

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

  const studentSecondary: SecondaryItem[] = profileIncomplete
    ? []
    : [
        { href: "/squad/find", label: "Find Squad", desc: "See a fresh squad suggestion", icon: "🎯" },
        { href: "/profiler", label: "My Profile", desc: "Edit your subject ratings", icon: "👤" },
        {
          href: "/squad/subscribe",
          label: "Subscribe",
          desc: "Mentor-fee payment status",
          icon: "💳",
          badge,
        },
      ];

  const mentorSecondary: SecondaryItem[] = [
    { href: "/desk?tab=browse", label: "Browse Open Squads", desc: "Claim a squad to mentor", icon: "🔍" },
  ];

  const secondaryItems = isStudent ? studentSecondary : isMentor ? mentorSecondary : [];
  const notesReady = studentSquad ? studentSquad.squad.status === "locked" : false;

  if (!session || isAdminRoute) return null;

  return (
    <>
      {moreOpen && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="dock-sheet-backdrop"
          />
          <div className="dock-sheet-shell">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="More navigation"
              className="dock-sheet mx-auto sm:max-w-md"
            >
              <div className="flex items-center justify-between px-1.5 pb-2 pt-0.5">
                <span className="font-display text-[15px] font-bold text-text">More</span>
                <button
                  aria-label="Close menu"
                  onClick={() => setMoreOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2/70 text-text-dim transition-colors hover:text-text"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border-soft bg-white/[0.03] px-3.5 py-3">
                <span className="avatar h-10 w-10 text-sm">{initials(name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-text">{name}</p>
                  <p className="text-xs text-text-dim">{isStudent ? "Scholar" : "Mentor"}</p>
                </div>
                <button onClick={handleLogout} className="btn btn-ghost !px-3 !py-1.5 text-xs shrink-0">
                  Sign out
                </button>
              </div>

              {primaryCta && (
                <Link
                  href={primaryCta.href}
                  onClick={() => setMoreOpen(false)}
                  className="mt-3 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo to-violet px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(99,102,241,0.8)] transition-transform active:scale-[0.98]"
                >
                  <span className="text-lg">{primaryCta.icon}</span>
                  {primaryCta.label}
                </Link>
              )}

              {profileIncomplete && (
                <p className="mt-2 text-center text-xs text-text-faint">
                  Finish this to unlock your squad, notes, and subscription.
                </p>
              )}

              {secondaryItems.length > 0 && (
                <nav className="mt-3 flex flex-col gap-1.5">
                  {secondaryItems.map((item) => {
                    const active = pathname === item.href.split("?")[0];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
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

              {/* Kept in sync with the Note dock item's own unread dot --
                  surfaced again here since Squad Notes' readiness state is
                  useful context next to the rest of the squad's status. */}
              {isStudent && !profileIncomplete && studentSquad && !notesReady && (
                <p className="mt-3 px-1.5 text-center text-xs text-text-faint">
                  Squad Notes unlock once your squad is active.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="dock-shell">
        <nav
          aria-label="Primary"
          className="dock w-full max-w-[26rem] sm:max-w-[28rem] lg:max-w-[30rem]"
        >
          <span
            aria-hidden="true"
            className="dock-indicator"
            style={{
              transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
              opacity: activeIndex === -1 ? 0 : 1,
            }}
          />

          {primaryItems.map((item, idx) => {
            const active = idx === activeIndex;
            const Icon = item.icon;
            const isMore = item.key === "more";
            const showNoteDot = item.key === "note" && notesUnread;

            if (isMore) {
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={moreOpen}
                  aria-label="More navigation"
                  data-active={active}
                  onClick={() => setMoreOpen((v) => !v)}
                  className="dock-item"
                >
                  <Icon className="h-5 w-5" />
                  <span className="dock-item-label">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-active={active}
                className="dock-item"
              >
                <Icon className="h-5 w-5" />
                {showNoteDot && <span className="dock-item-dot" aria-hidden="true" />}
                <span className="dock-item-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
