/**
 * Types mirroring the real backend response shapes exactly
 * (verified against backend/server.js — not guessed).
 */

export type AcademicGroup = "Science" | "Arts" | "Commerce";
export type ImprovementPriority = "Low" | "Medium" | "High";
export type MatchingStatus = "not_started" | "suggested" | "confirmed";
export type SquadStatus = "suggested" | "locked";
export type MemberStatus = "pending" | "confirmed";
export type JoinType = "auto" | "invite";
export type SenderType = "student" | "mentor";

// ---- Students ----

export interface Student {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  institution: string | null;
  year: string | null;
  academic_group: AcademicGroup | null;
  aspirant_type: string | null;
  matching_status: MatchingStatus;
  created_at: string;
  /** Only present if signup included a valid inviteCode that had an open slot. */
  joinedSquad?: number;
}

/** The trimmed student object returned by POST /login. */
export interface StudentSession {
  id: number;
  name: string;
  email: string | null;
  academic_group: AcademicGroup | null;
  /**
   * Whether this student has ever saved subject ratings via
   * saveStudentSubjects (see backend POST /students/:id/subjects). Backed
   * by an EXISTS check on student_subjects, not a stored column -- there is
   * no separate "profile" concept in the backend today. Sessions cached in
   * localStorage from before this field existed won't have it; treat a
   * missing value as `false` (safer to send someone to the Profiler again
   * than to wrongly let a first-timer skip it).
   */
  profile_completed?: boolean;
}

// ---- Mentors ----

export interface Mentor {
  id: number;
  name: string;
  email: string;
  institution: string;
  created_at: string;
  groups: AcademicGroup[];
}

/** The trimmed mentor object returned by POST /mentors/login. */
export interface MentorSession {
  id: number;
  name: string;
  email: string;
  institution: string;
}

/** Public mentor info attached to a squad view (no auth fields). */
export interface MentorPublic {
  id: number;
  name: string;
  email: string;
  institution: string;
}

// ---- Subjects ----

export interface SubjectAssessmentInput {
  subject_id: number;
  proficiency: 1 | 2 | 3 | 4 | 5;
  improvement_priority: ImprovementPriority;
}

export interface SavedStudentSubject {
  id: number;
  student_id: number;
  subject_id: number;
  proficiency: number;
  improvement_priority: ImprovementPriority;
}

// ---- Squads ----

export interface Squad {
  id: number;
  academic_group: AcademicGroup;
  year: string;
  aspirant_type: string;
  status: SquadStatus;
  invite_code: string | null;
  mentor_id: number | null;
  created_at: string;
}

/** Member shape returned right after matching (POST /students/:id/match). */
export interface MatchedMember {
  id: number;
  squad_id: number;
  student_id: number;
  slot: number;
  join_type: JoinType;
  status: MemberStatus;
  joined_at: string;
  name: string;
  /** Subject IDs this student covers — not yet resolved to names. */
  contributes: number[];
}

export interface MatchResult {
  squad: Squad;
  members: MatchedMember[];
}

/** Plain roster member shape (no coverage) — used by /squads/:id/confirm. */
export interface RosterMember {
  slot: number;
  student_id: number;
  name: string;
  join_type: JoinType;
  status: MemberStatus;
}

/** Roster member with persisted Coverage Matrix data (Task 36). */
export interface CoverageMember extends RosterMember {
  /** Subject names this student covers in this squad. */
  covers: string[];
}

export interface StudentSquadView {
  squad: Squad;
  myStatus: MemberStatus;
  members: CoverageMember[];
  mentor: MentorPublic | null;
}

export interface SquadDetailView {
  squad: Squad;
  members: CoverageMember[];
  mentor: MentorPublic | null;
}

export interface MentorSquad extends Squad {
  members: CoverageMember[];
}

export interface InviteResult {
  inviteCode: string;
  inviteLink: string;
}

export interface JoinedMember {
  id: number;
  squad_id: number;
  student_id: number;
  slot: number;
  join_type: JoinType;
  status: MemberStatus;
  joined_at: string;
}

export interface JoinResult {
  squad: Squad;
  member: JoinedMember;
}

// ---- Mentor-fee subscription payments ----

export type PaymentPlan = "1_month" | "6_month";
export type PaymentMethod = "nagad" | "bkash";
export type PaymentStatus = "pending" | "approved" | "rejected";

export interface Payment {
  id: number;
  student_id: number;
  plan: PaymentPlan;
  amount: number;
  method: PaymentMethod;
  sender_phone: string;
  trx_id: string;
  status: PaymentStatus;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminPayment extends Payment {
  student_name: string;
  student_email: string;
}

// ---- Better-squad suggestion ----

export interface SquadSuggestion {
  squadId: number;
  currentCoverage: number;
  suggestedCoverage: number;
}

// ---- Chat ("Squad Notes") ----

export type SquadMessageType = "text" | "image" | "voice";

export interface SquadMessage {
  id: number;
  sender_type: SenderType;
  sender_id: number;
  /** Null for attachment-only messages (image/voice with no caption). */
  message: string | null;
  message_type: SquadMessageType;
  attachment_url: string | null;
  attachment_format: string | null;
  attachment_bytes: number | null;
  /** Voice messages only. */
  attachment_duration_seconds: number | null;
  created_at: string;
  sender_name: string;
}

// ---- Admin: Student & Mentor records ----

/** Minimal squad context attached to an admin student-search result. */
export interface AdminStudentSquad {
  id: number;
  status: SquadStatus;
  academic_group: AcademicGroup;
  year: string;
}

/** Result row from GET /admin/students/search. */
export interface AdminStudentRecord {
  id: number;
  name: string;
  email: string;
  institution: string | null;
  year: string | null;
  academic_group: AcademicGroup | null;
  aspirant_type: string | null;
  matching_status: MatchingStatus;
  created_at: string;
  squad: AdminStudentSquad | null;
  latest_payment: Payment | null;
}

export interface AdminMentorGroup {
  group_name: AcademicGroup;
  approval_status: "pending" | "approved";
}

export interface AdminMentorSquad {
  id: number;
  status: SquadStatus;
  academic_group: AcademicGroup;
  year: string;
  aspirant_type: string;
}

/** Result row from GET /admin/mentors. */
export interface AdminMentorRecord {
  id: number;
  name: string;
  email: string;
  institution: string;
  phone: string | null;
  created_at: string;
  groups: AdminMentorGroup[];
  squads: AdminMentorSquad[];
}

// ---- Task Management ----

export interface Task {
  id: number;
  mentor_id: number;
  squad_id: number;
  title: string;
  description: string | null;
  file_url: string;
  file_public_id: string;
  file_resource_type: string;
  file_format: string | null;
  original_filename: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

/** Task row as returned to a mentor (GET /mentors/tasks) — includes rollup counts. */
export interface MentorTask extends Task {
  member_count: number;
  submission_count: number;
}

export interface TaskSubmission {
  id: number;
  task_id: number;
  student_id: number;
  squad_id: number;
  mentor_id: number;
  submission_url: string;
  submission_public_id: string;
  file_resource_type: string;
  file_format: string | null;
  original_filename: string | null;
  file_size: number | null;
  submitted_at: string;
  rating: number | null;
  feedback: string | null;
  rated_at: string | null;
}

/** Submission row as returned to a mentor for rating — adds student info. */
export interface MentorSubmissionView extends TaskSubmission {
  student_name: string;
  student_email: string;
}

/** Task row as returned to a student (GET /students/:id/tasks) — their own submission, if any, attached. */
export interface StudentTaskView extends Task {
  mentor_name: string;
  submission: TaskSubmission | null;
}

export interface TaskSubmissionsResponse {
  task: Task;
  submissions: MentorSubmissionView[];
}

// ---- Errors ----

/** Shape of every error response body from this backend: { error: string } */
export interface ApiErrorBody {
  error: string;
}
