# Gate / background images

Two separate features share this folder — do not conflate them:

## 1. Public landing page hero slider (existing, unrelated to the change below)
Used by `components/landing/HeroImageSlider.tsx`, keyed by **academic_group**:
- `science-buet.webp`
- `arts-jahangirnagar.webp`
- `collage-hero.webp`

## 2. Logged-in student background, keyed by `aspirant_type` (new)
Used by `components/layout/AspirantBackground.tsx` via `lib/aspirantBackgrounds.ts`.
Shown behind the app for a logged-in student, fixed to their account based on
the Aspirant Type they chose at signup.

| aspirant_type                       | file                    | status |
|--------------------------------------|-------------------------|--------|
| Engineering Admission                 | `science-buet.webp`     | ✅ real (reused from #1 above) |
| Medical Admission                     | `medical-dmc.webp`      | ⚠️ **placeholder** — replace with a real DMC Gate photo |
| University Admission (General)        | `university-du.webp`    | ⚠️ **placeholder** — replace with a real DU Gate photo |
| HSC Board Exam                        | `board-exam.webp`       | ⚠️ **placeholder** — replace with a generic board-exam themed image |

The three placeholder files are plain abstract graphics (gradient + simple
gate silhouette), generated locally — not photos of any real place. To swap
in the real images, drop a `.webp` file with the **exact same filename**
into this folder. No code changes are needed; `lib/aspirantBackgrounds.ts`
already points at these filenames.
