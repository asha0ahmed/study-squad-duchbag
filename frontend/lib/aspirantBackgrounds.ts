/**
 * Maps a student's aspirant_type (chosen once at signup, stored on
 * students.aspirant_type, never changed after) to a fixed background image
 * shown throughout the logged-in app -- see components/layout/AspirantBackground.tsx.
 *
 * IMPORTANT -- this is a SEPARATE, unrelated feature from the academic_group
 * gate images used by the public landing page's hero slider
 * (components/landing/HeroImageSlider.tsx, keyed by "Science"/"Arts"/"Commerce").
 * This mapping is keyed by aspirant_type instead, and only ever applies
 * inside the logged-in app. Do not merge the two.
 *
 * "Engineering Admission" reuses the existing BUET gate photo already in the
 * repo (public/images/gates/science-buet.webp) since it's a real, already-
 * licensed-for-this-project asset. The other three are placeholder graphics
 * (not real building photos -- see public/images/gates/README.md) pending
 * the real DMC / DU / board-exam images being dropped in under the exact
 * filenames below. No code changes are needed when that happens.
 */
export const ASPIRANT_TYPE_BACKGROUNDS: Record<string, string> = {
  "Engineering Admission": "/images/gates/science-buet.webp",
  "Medical Admission": "/images/gates/medical-dmc.webp",
  "University Admission (General)": "/images/gates/university-du.webp",
  "HSC Board Exam": "/images/gates/board-exam.webp",
};

/** Returns the background image path for a student's aspirant_type, or null if unknown/unset. */
export function getAspirantBackground(aspirantType: string | null | undefined): string | null {
  if (!aspirantType) return null;
  return ASPIRANT_TYPE_BACKGROUNDS[aspirantType] ?? null;
}
