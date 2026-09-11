import type { AcademicGroup } from "./types";

/**
 * Subject master list, hardcoded to match the seed data in
 * backend/schema.sql exactly (there is no GET /subjects endpoint yet --
 * see API contract Section 4). IDs are inferred from insertion order into
 * a SERIAL primary key on a fresh database:
 *
 *   1 Physics (Science)      7  History (Arts)
 *   2 Chemistry (Science)    8  Economics (Arts)
 *   3 Higher Math (Science)  9  English (Arts)
 *   4 Biology (Science)      10 Civics (Arts)
 *   5 English (Science)      11 Sociology (Arts)
 *   6 ICT (Science)          12 Bangla (Arts)
 *
 *   13 Accounting (Commerce)             17 Statistics (Commerce)
 *   14 Finance and Banking (Commerce)    18 Economics (Commerce)
 *   15 Marketing (Commerce)              19 English (Commerce)
 *   16 Management Studies (Commerce)     20 ICT (Commerce)
 *
 * IMPORTANT: this assumes the subjects table was seeded exactly once, from
 * this exact schema.sql, on an empty database. If the real database's
 * subject IDs differ (re-seeded, reordered, or edited by hand), this map
 * will be wrong and student_subjects will save against the wrong subject.
 * Worth a quick manual check against the real DB (`SELECT * FROM subjects
 * ORDER BY id;`) before this goes live.
 *
 * The Commerce IDs (13-20) above are PROVISIONAL -- confirm them against
 * the real database after running migrations/007_add_commerce_subjects.sql
 * (see that file's header for the exact query to run) before deploying.
 */
export const SUBJECTS_BY_GROUP: Record<AcademicGroup, { id: number; name: string }[]> = {
  Science: [
    { id: 1, name: "Physics" },
    { id: 2, name: "Chemistry" },
    { id: 3, name: "Higher Math" },
    { id: 4, name: "Biology" },
    { id: 5, name: "English" },
    { id: 6, name: "ICT" },
  ],
  Arts: [
    { id: 7, name: "History" },
    { id: 8, name: "Economics" },
    { id: 9, name: "English" },
    { id: 10, name: "Civics" },
    { id: 11, name: "Sociology" },
    { id: 12, name: "Bangla" },
  ],
  // Students pick any 6 of these 8 in the Profiler -- see
  // REQUIRED_SUBJECT_COUNT in app/profiler/page.tsx.
  Commerce: [
    { id: 13, name: "Accounting" },
    { id: 14, name: "Finance and Banking" },
    { id: 15, name: "Marketing" },
    { id: 16, name: "Management Studies" },
    { id: 17, name: "Statistics" },
    { id: 18, name: "Economics" },
    { id: 19, name: "English" },
    { id: 20, name: "ICT" },
  ],
};
