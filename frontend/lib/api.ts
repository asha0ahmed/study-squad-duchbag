/**
 * Study Squad API client.
 *
 * Single place that knows how to talk to the backend. Every screen should
 * import from here rather than calling `fetch` directly, so the base URL,
 * auth header, and error handling only exist once.
 *
 * Contract: this file must match backend/server.js exactly. Do not invent
 * endpoints or fields — if the frontend needs something the backend doesn't
 * provide, that's a signal to go back to the backend, not to guess here.
 */

import type {
  AdminMentorRecord,
  AdminPayment,
  AdminStudentRecord,
  ApiErrorBody,
  InviteResult,
  JoinResult,
  MatchResult,
  Mentor,
  MentorSession,
  MentorSquad,
  MentorTask,
  Payment,
  PaymentMethod,
  PaymentPlan,
  SavedStudentSubject,
  Squad,
  SquadDetailView,
  SquadMessage,
  SquadSuggestion,
  Student,
  StudentSession,
  StudentSquadView,
  StudentTaskView,
  SubjectAssessmentInput,
  Task,
  TaskSubmission,
  TaskSubmissionsResponse,
} from "./types";

// In dev this is the backend's local port. Overridable via env for later
// (staging/prod) without touching call sites.
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

const TOKEN_KEY = "study-squad:token";
const SESSION_KEY = "study-squad:session"; // { role: 'student' | 'mentor', ...session }

export type SessionRole = "student" | "mentor";

export interface StoredSession {
  role: SessionRole;
  student?: StudentSession;
  mentor?: MentorSession;
}

/** Thrown for any non-2xx response. Carries the backend's `error` message. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ---- Token / session storage ----
// Plain localStorage, matching what the backend actually supports today
// (no refresh-token flow exists yet).

function isBrowser() {
  return typeof window !== "undefined";
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getSession(): StoredSession | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function setSession(token: string, session: StoredSession) {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}

/**
 * True when a logged-in student hasn't saved subject ratings yet (see
 * StudentSession.profile_completed). Shared by every student-only route so
 * "which routes are gated" lives in one place instead of being re-derived
 * per page. Non-students are never gated by this.
 */
export function needsProfiler(session: StoredSession | null): boolean {
  return !!session && session.role === "student" && !session.student?.profile_completed;
}

/**
 * Locally patches the stored session right after the Profiler successfully
 * saves subjects, so profile_completed flips to `true` immediately without
 * requiring the student to log out and back in for the redirect/guards to
 * notice. Safe no-op if there's no student session on file.
 */
export function markStudentProfileComplete() {
  if (!isBrowser()) return;
  const current = getSession();
  const token = getToken();
  if (!current || current.role !== "student" || !current.student || !token) return;
  setSession(token, {
    ...current,
    student: { ...current.student, profile_completed: true },
  });
}

// ---- Admin secret storage ----
// Deliberately separate from the student/mentor session above (different
// auth mechanism entirely -- a shared secret header, not a JWT) and kept
// in sessionStorage rather than localStorage so it doesn't linger longer
// than the admin's current browser tab.

const ADMIN_SECRET_KEY = "study-squad:admin-secret";

export function getAdminSecret(): string | null {
  if (!isBrowser()) return null;
  return window.sessionStorage.getItem(ADMIN_SECRET_KEY);
}

export function setAdminSecret(secret: string) {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(ADMIN_SECRET_KEY, secret);
}

export function clearAdminSecret() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(ADMIN_SECRET_KEY);
}

// ---- Squad Notes "seen" tracking (client-only, best-effort) ----
// The backend has no read-receipt concept. This just remembers, per squad,
// the timestamp of the newest message the student has actually opened
// Squad Notes to see, so the mobile drawer can show a lightweight unread
// dot. Nothing here syncs across devices -- it's a UX nicety, not truth.

function notesSeenKey(squadId: number) {
  return `study-squad:notes-seen:${squadId}`;
}

export function getNotesLastSeen(squadId: number): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(notesSeenKey(squadId));
}

export function markNotesSeen(squadId: number, latestMessageAt: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(notesSeenKey(squadId), latestMessageAt);
}

// ---- Multipart request helper (Task file uploads) ----
// Separate from `request` above because file uploads must send a
// multipart/form-data body (a FormData object) rather than JSON — the
// browser sets the correct Content-Type (including the multipart
// boundary) automatically as long as we don't set it ourselves.

async function requestForm<T>(
  path: string,
  formData: FormData,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { method, headers, body: formData });
  } catch {
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const body = data as ApiErrorBody | null;
    throw new ApiError(response.status, body?.error ?? "Something went wrong.");
  }

  return data as T;
}

// ---- Core request helper ----

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Set true for the one admin-only route that uses x-admin-secret instead of a JWT. */
  adminSecret?: string;
  /** Skip attaching the Authorization header (only needed pre-login). */
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!options.skipAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.adminSecret) {
    headers["x-admin-secret"] = options.adminSecret;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // Network failure — backend unreachable, offline, CORS, etc.
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }

  // Some routes (POST / and /db-test) return plain text; every real API
  // route we use returns JSON, including error bodies, so this is safe.
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const body = data as ApiErrorBody | null;
    throw new ApiError(response.status, body?.error ?? "Something went wrong.");
  }

  return data as T;
}

// ---- Auth & signup ----

export interface StudentSignupInput {
  name: string;
  /** Optional if `phone` is provided — one of the two is required. */
  email?: string;
  /** Optional if `email` is provided — one of the two is required. */
  phone?: string;
  password: string;
  institution: string;
  year: string;
  academic_group: "Science" | "Arts" | "Commerce";
  aspirant_type: string;
  /** Optional — joins a squad's open invite slot at signup time. */
  inviteCode?: string;
}

export function signupStudent(input: StudentSignupInput) {
  return request<Student>("/students", {
    method: "POST",
    body: input,
    skipAuth: true,
  });
}

export interface MentorSignupInput {
  name: string;
  email: string;
  password: string;
  institution: string;
  groups: ("Science" | "Arts" | "Commerce")[];
}

export function signupMentor(input: MentorSignupInput) {
  return request<Mentor>("/mentors", {
    method: "POST",
    body: input,
    skipAuth: true,
  });
}

/** `identifier` is whatever the student typed in — their email or their phone number. */
export async function loginStudent(identifier: string, password: string) {
  const result = await request<{ token: string; student: StudentSession }>(
    "/login",
    { method: "POST", body: { identifier, password }, skipAuth: true },
  );
  setSession(result.token, { role: "student", student: result.student });
  return result;
}

export async function loginMentor(email: string, password: string) {
  const result = await request<{ token: string; mentor: MentorSession }>(
    "/mentors/login",
    { method: "POST", body: { email, password }, skipAuth: true },
  );
  setSession(result.token, { role: "mentor", mentor: result.mentor });
  return result;
}

export function logout() {
  clearSession();
}

// ---- Subjects / self-assessment (the "Profiler") ----

export function saveStudentSubjects(studentId: number, subjects: SubjectAssessmentInput[]) {
  return request<SavedStudentSubject[]>(`/students/${studentId}/subjects`, {
    method: "POST",
    body: { subjects },
  });
}

// ---- Matching & squad lifecycle ----

export function runMatch(studentId: number) {
  return request<MatchResult>(`/students/${studentId}/match`, { method: "POST" });
}

export function createInvite(squadId: number) {
  return request<InviteResult>(`/squads/${squadId}/invite`, { method: "POST" });
}

export function joinViaInvite(inviteCode: string) {
  return request<JoinResult>(`/invites/${inviteCode}/join`, { method: "POST" });
}

export function getMySquad(studentId: number) {
  return request<StudentSquadView>(`/students/${studentId}/squad`);
}

export function getSquad(squadId: number) {
  return request<SquadDetailView>(`/squads/${squadId}`);
}

// ---- Mentor-fee subscription payments ----

export interface SubmitPaymentInput {
  plan: PaymentPlan;
  method: PaymentMethod;
  sender_phone: string;
  trx_id: string;
}

export function submitPayment(studentId: number, input: SubmitPaymentInput) {
  return request<Payment>(`/students/${studentId}/payments`, {
    method: "POST",
    body: input,
  });
}

export function getLatestPayment(studentId: number) {
  return request<Payment>(`/students/${studentId}/payments/latest`);
}

export function adminListPayments(secret: string, status?: "pending" | "approved" | "rejected") {
  const query = status ? `?status=${status}` : "";
  return request<AdminPayment[]>(`/admin/payments${query}`, {
    skipAuth: true,
    adminSecret: secret,
  });
}

export function adminApprovePayment(secret: string, paymentId: number) {
  return request<Payment>(`/admin/payments/${paymentId}/approve`, {
    method: "PATCH",
    skipAuth: true,
    adminSecret: secret,
  });
}

export function adminRejectPayment(secret: string, paymentId: number) {
  return request<Payment>(`/admin/payments/${paymentId}/reject`, {
    method: "PATCH",
    skipAuth: true,
    adminSecret: secret,
  });
}

// ---- Admin: Student & Mentor records ----

export function adminSearchStudents(secret: string, query: string) {
  return request<AdminStudentRecord[]>(
    `/admin/students/search?query=${encodeURIComponent(query)}`,
    { skipAuth: true, adminSecret: secret }
  );
}

export function adminListMentors(secret: string) {
  return request<AdminMentorRecord[]>("/admin/mentors", {
    skipAuth: true,
    adminSecret: secret,
  });
}

export function adminApproveMentorGroup(secret: string, mentorId: number, groupName: string) {
  return request<{ mentor_id: number; group_name: string; approval_status: string }>(
    `/mentors/${mentorId}/groups/${groupName}/approve`,
    { method: "PATCH", skipAuth: true, adminSecret: secret }
  );
}

// ---- Better-squad suggestion ----

export function getSuggestedSquad(studentId: number) {
  return request<{ suggestion: SquadSuggestion | null }>(`/students/${studentId}/suggested-squad`);
}

export function switchSquad(studentId: number, targetSquadId: number) {
  return request<{ squad: Squad }>(`/students/${studentId}/switch-squad`, {
    method: "POST",
    body: { targetSquadId },
  });
}

// ---- Mentor-side ----

export function getAvailableSquads() {
  return request<Squad[]>("/mentors/available-squads");
}

export function assignMentorToSquad(squadId: number) {
  return request<Squad>(`/squads/${squadId}/assign-mentor`, { method: "POST" });
}

export function getMyMentorSquads() {
  return request<MentorSquad[]>("/mentors/my-squads");
}

// ---- Chat ("Squad Notes") ----

export interface SendSquadMessageAttachment {
  file: File | Blob;
  /** Required for voice clips so the bubble can show a duration immediately. */
  durationSeconds?: number;
}

/**
 * Sends a Squad Notes message. `message` may be omitted if `attachment`
 * is provided (an image or voice-only message), and vice versa.
 */
export function sendSquadMessage(
  squadId: number,
  message?: string,
  attachment?: SendSquadMessageAttachment,
) {
  if (!attachment) {
    return request<SquadMessage>(`/squads/${squadId}/messages`, {
      method: "POST",
      body: { message },
    });
  }

  const formData = new FormData();
  if (message) formData.append("message", message);
  if (attachment.durationSeconds) {
    formData.append("duration", String(Math.round(attachment.durationSeconds)));
  }
  formData.append("file", attachment.file, attachment.file instanceof File ? attachment.file.name : "voice-message");
  return requestForm<SquadMessage>(`/squads/${squadId}/messages`, formData, "POST");
}

export function getSquadMessages(squadId: number) {
  return request<SquadMessage[]>(`/squads/${squadId}/messages`);
}

// ---- Task Management ----
// Mentors create a task against one of their own squads (with a file);
// every current member of that squad sees it under "Today's Given Tasks"
// and can upload an answer, which the mentor then rates.

export interface CreateTaskInput {
  title: string;
  description?: string;
  squadId: number;
  file: File;
}

export function createTask(input: CreateTaskInput) {
  const formData = new FormData();
  formData.append("title", input.title);
  if (input.description) formData.append("description", input.description);
  formData.append("squadId", String(input.squadId));
  formData.append("file", input.file);
  return requestForm<Task>("/tasks", formData, "POST");
}

/** The logged-in mentor's own tasks, optionally narrowed to one squad. */
export function getMentorTasks(squadId?: number) {
  const query = squadId ? `?squadId=${squadId}` : "";
  return request<MentorTask[]>(`/mentors/tasks${query}`);
}

/** A student's "Today's Given Tasks" — everything assigned to their squad. */
export function getStudentTasks(studentId: number) {
  return request<StudentTaskView[]>(`/students/${studentId}/tasks`);
}

/** Upload (or replace) the logged-in student's answer for one task. */
export function submitTaskAnswer(taskId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return requestForm<TaskSubmission>(`/tasks/${taskId}/submit`, formData, "POST");
}

/** Every submission for one of the mentor's own tasks — the Rating screen's data source. */
export function getTaskSubmissions(taskId: number) {
  return request<TaskSubmissionsResponse>(`/tasks/${taskId}/submissions`);
}

export function rateSubmission(submissionId: number, rating: number, feedback?: string) {
  return request<TaskSubmission>(`/submissions/${submissionId}/rate`, {
    method: "PATCH",
    body: { rating, feedback: feedback || undefined },
  });
}
