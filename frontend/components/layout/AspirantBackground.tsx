"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/api";
import { getAspirantBackground } from "@/lib/aspirantBackgrounds";

/**
 * Renders the logged-in student's permanent, aspirant_type-based background
 * image (see lib/aspirantBackgrounds.ts) behind the app's normal content.
 * Mounted once in the root layout -- renders nothing when there's no student
 * session, so it never shows on the public landing page or for mentors.
 *
 * Re-checks the session on every route change (not just once on mount)
 * because the root layout stays mounted across client-side navigation --
 * without this, the background wouldn't appear until a hard refresh right
 * after logging in.
 */
export function AspirantBackground() {
  const pathname = usePathname();
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    const nextBackground =
      session?.role === "student" ? getAspirantBackground(session.student?.aspirant_type) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external system (localStorage) on mount/route-change, same as app/desk/page.tsx
    setBackgroundImage(nextBackground);
  }, [pathname]);

  if (!backgroundImage) return null;

  return (
    <div
      aria-hidden="true"
      className="aspirant-bg-layer"
      style={{
        // backgroundImage MUST be quoted: several of the image filenames in
        // lib/aspirantBackgrounds.ts contain literal spaces (e.g. "aspirant
        // type buet.webp"), and an unquoted CSS url() cannot contain
        // whitespace -- the browser treats the whole declaration as invalid
        // and silently drops it, which is why only "HSC Board Exam" (the one
        // filename without a space) ever showed before this fix.
        backgroundImage: `linear-gradient(rgba(11, 16, 32, 0.15), rgba(11, 16, 32, 0.12)), url("${backgroundImage}")`,
      }}
    />
  );
}
