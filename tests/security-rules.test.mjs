import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canReadProfile,
  checkRegistrationDeadline,
  hasPdfSignature,
  authorizationFailure,
  isDuplicateApplication,
  isOwnedResumePath,
  isValidRecoveryPath,
  ownsApplication,
  roleLandingPath,
  routeDecision,
  validateNewPassword,
  validateResumeMetadata,
} from "../lib/auth/rules.mjs";
import {
  canManageCompanies,
  canManageDrives,
  canTransitionDriveStatus,
  canViewDrive,
  validateDriveEligibility,
  validateDriveForStatus,
} from "../lib/placement/drive-rules.mjs";
import {
  PHASE_3B_APPLICATION_STATUSES,
  applicationTransitions,
  canReviewApplications,
  canTransitionApplication,
  evaluateDriveEligibility,
  isApplicationForDrive,
  isApplicationResumeScope,
  isStudentAccountForUser,
  PHASE_3C_APPLICATION_STATUSES,
  validateApplicationSubmission,
} from "../lib/applications/application-rules.mjs";
import {
  canMakeFinalApplicationDecision,
  canScheduleApplicationInterview,
  canTransitionInterview,
  canTransitionInterviewForApplication,
  canTransitionOffer,
  isOfferForStudent,
  isPlacementForAcceptedOffer,
  validateInterviewEvaluation,
  validateInterviewInput,
} from "../lib/placement/lifecycle-rules.mjs";

test("unauthenticated protected routes redirect while public pages stay public", () => {
  assert.equal(routeDecision("/admin/dashboard", null, false), "login");
  assert.equal(routeDecision("/profile", null, false), "login");
  assert.equal(routeDecision("/", null, false), "allow");
});

test("each database role resolves to its expected landing page", () => {
  assert.equal(roleLandingPath("student"), "/opportunities");
  assert.equal(roleLandingPath("coordinator"), "/admin/dashboard");
  assert.equal(roleLandingPath("tpo"), "/admin/dashboard");
  assert.equal(roleLandingPath("admin"), "/admin/dashboard");
  assert.equal(roleLandingPath("unknown"), null);
});

test("role routes deny student admin access and keep staff out of student routes", () => {
  assert.equal(routeDecision("/admin/dashboard", "student", true), "student-home");
  assert.equal(routeDecision("/profile", "tpo", true), "staff-home");
  assert.equal(routeDecision("/admin/dashboard", "coordinator", true), "allow");
});

test("missing or unsupported profile role fails closed", () => {
  assert.equal(routeDecision("/admin/dashboard", null, true), "forbidden");
  assert.equal(routeDecision("/profile", "root", true), "forbidden");
});

test("Server Action staff authorization rejects missing sessions and non-staff roles", () => {
  const staffRoles = ["admin", "tpo", "coordinator"];
  assert.equal(authorizationFailure(null, null, staffRoles), "unauthenticated");
  assert.equal(authorizationFailure({ id: "user-1" }, null, staffRoles), "unverified");
  assert.equal(authorizationFailure({ id: "user-1" }, { role: "student" }, staffRoles), "forbidden");
  assert.equal(authorizationFailure({ id: "user-1" }, { role: "tpo" }, staffRoles), null);
});

test("company and drive management is restricted to existing staff roles", () => {
  for (const role of ["student", "unknown", null]) {
    assert.equal(canManageCompanies(role), false);
    assert.equal(canManageDrives(role), false);
  }
  for (const role of ["admin", "tpo", "coordinator"]) {
    assert.equal(canManageCompanies(role), true);
    assert.equal(canManageDrives(role), true);
  }
});

test("students can view only published drives and cannot manage drives", () => {
  assert.equal(canViewDrive("student", "published"), true);
  assert.equal(canViewDrive("student", "draft"), false);
  assert.equal(canViewDrive("student", "cancelled"), false);
  assert.equal(canManageDrives("student"), false);
});

test("drive transitions enforce the allowed lifecycle and unpublish path", () => {
  assert.equal(canTransitionDriveStatus("draft", "published"), true);
  assert.equal(canTransitionDriveStatus("published", "draft"), true);
  assert.equal(canTransitionDriveStatus("published", "in_progress"), true);
  assert.equal(canTransitionDriveStatus("in_progress", "completed"), true);
  assert.equal(canTransitionDriveStatus("draft", "completed"), false);
  assert.equal(canTransitionDriveStatus("completed", "published"), false);
  assert.equal(canTransitionDriveStatus("cancelled", "draft"), false);
});

test("publishing rejects missing, invalid, and expired deadlines and incomplete drives", () => {
  const now = Date.parse("2026-01-02T00:00:00.000Z");
  assert.match(validateDriveForStatus({}, "published", now), /company/);
  assert.match(validateDriveForStatus({ company_id: "c", title: "Role" }, "published", now), /deadline/);
  assert.match(validateDriveForStatus({ company_id: "c", title: "Role", registration_deadline: "invalid" }, "published", now), /deadline/);
  assert.match(validateDriveForStatus({ company_id: "c", title: "Role", registration_deadline: "2026-01-01T00:00:00Z" }, "published", now), /future/);
  assert.equal(validateDriveForStatus({ company_id: "c", title: "Role", registration_deadline: "2026-01-03T00:00:00Z" }, "published", now), null);
  assert.match(validateDriveForStatus({}, "unknown", now), /valid placement drive status/);
});

test("drive eligibility validation rejects impossible CGPA and backlog values", () => {
  assert.match(validateDriveEligibility(-0.1, 0), /CGPA/);
  assert.match(validateDriveEligibility(10.1, 0), /CGPA/);
  assert.match(validateDriveEligibility(8, -1), /backlogs/);
  assert.match(validateDriveEligibility(8, 1.5), /backlogs/);
  assert.equal(validateDriveEligibility(8, 1), null);
});

test("Phase 3A RLS migration scopes drive mutations to staff and separates public company fields", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202609300003_phase3a_company_drive_rls.sql", import.meta.url), "utf8");
  assert.match(migration, /ALTER TABLE public\.companies ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /ALTER TABLE public\.placement_drives ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /AS RESTRICTIVE ON public\.placement_drives FOR UPDATE/i);
  assert.match(migration, /AS RESTRICTIVE ON public\.placement_drives FOR ALL TO anon[\s\S]*USING \(false\) WITH CHECK \(false\)/i);
  assert.match(migration, /AS RESTRICTIVE ON public\.companies FOR ALL TO anon[\s\S]*USING \(false\) WITH CHECK \(false\)/i);
  assert.match(migration, /public\.get_my_role\(\) = ANY \(ARRAY\['admin', 'tpo', 'coordinator'\]/i);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public\.published_drive_companies FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT SELECT ON public\.published_drive_companies TO authenticated/i);
  assert.match(migration, /published_drive_companies[\s\S]*company\.id, company\.name, company\.website,[\s\S]*company\.industry, company\.description, company\.location/i);
  assert.doesNotMatch(migration, /hr_contact_(?:name|email)/i);
});

test("student identity is accepted only from the authenticated account profile", () => {
  assert.equal(isStudentAccountForUser("auth-user-1", { id: "profile-1", user_id: "auth-user-1", role: "student" }), true);
  assert.equal(isStudentAccountForUser("auth-user-1", { id: "profile-1", user_id: "auth-user-2", role: "student" }), false);
  assert.equal(isStudentAccountForUser("auth-user-1", { id: "profile-1", user_id: "auth-user-1", role: "admin" }), false);
});

test("application submission rejects non-students and missing drive/profile context", () => {
  assert.match(validateApplicationSubmission({ role: null }), /Only students/);
  assert.match(validateApplicationSubmission({ role: "tpo" }), /Only students/);
  assert.match(validateApplicationSubmission({ role: "student", studentProfile: null }), /Complete your student profile/);
  assert.match(validateApplicationSubmission({ role: "student", studentProfile: {}, drive: null }), /Placement drive/);
});

test("application submission requires a published drive and valid future deadline", () => {
  const studentProfile = { cgpa: 8, department: "Computer Science", backlogs: 0, resume_path: "user/resume.pdf" };
  const drive = { company_id: "company-1", status: "draft", registration_deadline: "2026-01-03T00:00:00Z", allowed_departments: [], max_backlogs: 0 };
  assert.match(validateApplicationSubmission({ role: "student", studentProfile, drive }), /not open/);
  assert.match(validateApplicationSubmission({ role: "student", studentProfile, drive: { ...drive, status: "published", registration_deadline: "2026-01-01T00:00:00Z" }, now: Date.parse("2026-01-02T00:00:00Z") }), /passed/);
  assert.match(validateApplicationSubmission({ role: "student", studentProfile, drive: { ...drive, company_id: null, status: "published" } }), /company association/);
});

test("drive eligibility checks CGPA, department, and backlog criteria", () => {
  const drive = { min_cgpa: 7.5, allowed_departments: ["Computer Science"], max_backlogs: 1 };
  assert.equal(evaluateDriveEligibility({ cgpa: 8, department: "computer science", backlogs: 1 }, drive), null);
  assert.match(evaluateDriveEligibility({ cgpa: 7, department: "Computer Science", backlogs: 0 }, drive), /CGPA/);
  assert.match(evaluateDriveEligibility({ cgpa: 8, department: "Electrical", backlogs: 0 }, drive), /department/);
  assert.match(evaluateDriveEligibility({ cgpa: 8, department: "Computer Science", backlogs: 2 }, drive), /backlog/);
});

test("invalid or missing student academic data fails eligibility closed", () => {
  const drive = { min_cgpa: 7, allowed_departments: ["CS"], max_backlogs: 0 };
  assert.match(evaluateDriveEligibility({ cgpa: 11, department: "CS", backlogs: 0 }, drive), /CGPA/);
  assert.match(evaluateDriveEligibility({ cgpa: 8, department: "CS", backlogs: -1 }, drive), /backlog/);
  assert.match(evaluateDriveEligibility({ cgpa: 8, department: "CS", backlogs: 0 }, { ...drive, max_backlogs: -1 }), /eligibility requirements/);
});

test("application submission requires a resume and rejects duplicates", () => {
  const base = {
    role: "student",
    studentProfile: { cgpa: 8, department: "CS", backlogs: 0, resume_path: "student/resume.pdf" },
    drive: { company_id: "company-1", status: "published", registration_deadline: "2099-01-01T00:00:00Z", min_cgpa: 7, allowed_departments: ["CS"], max_backlogs: 0 },
  };
  assert.match(validateApplicationSubmission({ ...base, hasResume: false }), /Upload a resume/);
  assert.match(validateApplicationSubmission({ ...base, hasResume: true, existingApplication: { id: "application-1" } }), /already applied/);
  assert.equal(validateApplicationSubmission({ ...base, hasResume: true, existingApplication: null }), null);
});

test("application review is staff-only and follows the Phase 3B status graph", () => {
  assert.equal(canReviewApplications("student"), false);
  assert.equal(canReviewApplications("admin"), true);
  assert.deepEqual(applicationTransitions("applied"), ["eligible", "ineligible"]);
  assert.deepEqual(applicationTransitions("eligible"), ["shortlisted", "rejected"]);
  assert.deepEqual(applicationTransitions("ineligible"), []);
  assert.equal(canTransitionApplication("applied", "eligible"), true);
  assert.equal(canTransitionApplication("eligible", "shortlisted"), true);
  assert.equal(canTransitionApplication("applied", "shortlisted"), false);
  assert.equal(canTransitionApplication("ineligible", "shortlisted"), false);
  assert.equal(canTransitionApplication("rejected", "eligible"), false);
  assert.equal(PHASE_3B_APPLICATION_STATUSES.includes("selected"), false);
});

test("staff application status changes are bound to the reviewed drive", () => {
  const applicationFromDriveA = { id: "application-a", drive_id: "drive-a", status: "applied" };
  const applicationFromDriveB = { id: "application-b", drive_id: "drive-b", status: "applied" };

  assert.equal(isApplicationForDrive(applicationFromDriveB, "drive-a"), false);
  assert.equal(isApplicationForDrive(applicationFromDriveA, "drive-a"), true);
  assert.equal(canTransitionApplication(applicationFromDriveA.status, "eligible"), true);
});

test("applicant resume access must match both the drive and student profile", () => {
  const application = { drive_id: "drive-a", student_id: "student-profile-a" };
  assert.equal(isApplicationResumeScope(application, "drive-a", "student-profile-a"), true);
  assert.equal(isApplicationResumeScope(application, "drive-b", "student-profile-a"), false);
  assert.equal(isApplicationResumeScope(application, "drive-a", "student-profile-b"), false);
  assert.equal(isApplicationResumeScope(null, "drive-a", "student-profile-a"), false);
});

test("Phase 3B RLS migration constrains application ownership, insertion, updates, and transitions", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202609300004_phase3b_application_security.sql", import.meta.url), "utf8");
  assert.match(migration, /ALTER TABLE public\.applications ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /account\.user_id = auth\.uid\(\)/i);
  assert.match(migration, /status::text = 'applied'/i);
  assert.match(migration, /drive\.status = 'published'[\s\S]*drive\.registration_deadline > now\(\)/i);
  assert.match(migration, /student\.resume_path IS NOT NULL/i);
  assert.match(migration, /USING \(public\.get_my_role\(\) = ANY \(ARRAY\['admin', 'tpo', 'coordinator'\]/i);
  assert.match(migration, /CREATE TRIGGER "Phase 3B application status transition"/i);
  assert.match(migration, /OLD\.status::text = 'applied'[\s\S]*NEW\.status::text IN \('eligible', 'ineligible'\)/i);
  assert.match(migration, /OLD\.status::text = 'eligible'[\s\S]*NEW\.status::text IN \('shortlisted', 'rejected'\)/i);
  assert.match(migration, /REVOKE UPDATE ON TABLE public\.applications FROM authenticated, anon/i);
});

test("Phase 3C interview lifecycle requires shortlisted applications and valid schedule states", () => {
  assert.equal(canScheduleApplicationInterview("shortlisted"), true);
  assert.equal(canScheduleApplicationInterview("eligible"), false);
  assert.equal(canTransitionInterviewForApplication("shortlisted", "scheduled", "completed"), true);
  assert.equal(canTransitionInterviewForApplication("selected", "scheduled", "completed"), false);
  assert.equal(canTransitionInterview("completed", "cancelled"), false);
  const future = new Date(Date.now() + 60_000).toISOString();
  assert.equal(validateInterviewInput({ scheduledAt: future, mode: "online", location: "", details: "" }), null);
  assert.match(validateInterviewInput({ scheduledAt: "invalid", mode: "online", location: "", details: "" }), /future interview/);
});

test("Phase 3C evaluations and final decisions require a completed review", () => {
  assert.equal(validateInterviewEvaluation({ score: "5", feedback: "Strong communication", recommendation: "select" }), null);
  assert.match(validateInterviewEvaluation({ score: 6, feedback: "Feedback", recommendation: "select" }), /1 to 5/);
  assert.match(validateInterviewEvaluation({ score: 4, feedback: " ", recommendation: "select" }), /feedback is required/);
  assert.equal(canMakeFinalApplicationDecision("shortlisted", "selected", true), true);
  assert.equal(canMakeFinalApplicationDecision("shortlisted", "selected", false), false);
  assert.equal(canMakeFinalApplicationDecision("eligible", "selected", true), false);
  assert.equal(PHASE_3C_APPLICATION_STATUSES.includes("selected"), true);
});

test("Phase 3C offers and placements preserve ownership and accepted-offer invariants", () => {
  assert.equal(canTransitionOffer(null, true), true);
  assert.equal(canTransitionOffer(null, false), true);
  assert.equal(canTransitionOffer(false, true), false);
  const offer = { id: "offer-1", application_id: "app-1", student_id: "profile-1", drive_id: "drive-1", is_accepted: true };
  const application = { id: "app-1", student_id: "student-1", profile_id: "profile-1", drive_id: "drive-1" };
  const placement = { id: "placement-1", application_id: "app-1", student_id: "student-1", drive_id: "drive-1" };
  assert.equal(isOfferForStudent(offer, "profile-1"), true);
  assert.equal(isOfferForStudent(offer, "profile-2"), false);
  assert.equal(isPlacementForAcceptedOffer(placement, offer, application, "profile-1"), true);
  assert.equal(isPlacementForAcceptedOffer(placement, { ...offer, is_accepted: false }, application, "profile-1"), false);
  assert.equal(isPlacementForAcceptedOffer({ ...placement, drive_id: "drive-2" }, offer, application, "profile-1"), false);
  assert.equal(isPlacementForAcceptedOffer(placement, offer, application, "profile-2"), false);
});

test("Phase 3C migration reuses offer and placement tables while applying row security", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202609300005_phase3c_interviews_offers_placements.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.application_interviews/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.interview_evaluations/i);
  assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS public\.(placement_offers|placements)/i);
  assert.match(migration, /ALTER TABLE public\.placement_offers ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /ALTER TABLE public\.placements ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /ON CONFLICT \(application_id\) DO NOTHING/i);
  assert.match(migration, /OLD\.status::text = 'shortlisted'[\s\S]*NEW\.status::text IN \('selected', 'rejected'\)/i);
});

test("password reset enforces minimum length and confirmation", () => {
  assert.match(validateNewPassword("short", "short"), /8 characters/);
  assert.match(validateNewPassword("long-enough", "different"), /do not match/);
  assert.equal(validateNewPassword("long-enough", "long-enough"), null);
});

test("reset callback accepts only the local reset page destination", () => {
  assert.equal(isValidRecoveryPath("/reset-password"), true);
  assert.equal(isValidRecoveryPath("https://evil.example"), false);
  assert.equal(isValidRecoveryPath("//evil.example"), false);
  assert.equal(isValidRecoveryPath("/admin"), false);
});

test("deadline rejects expired, missing, and invalid values", () => {
  const now = Date.parse("2026-01-02T00:00:00.000Z");
  assert.match(checkRegistrationDeadline("2026-01-01T00:00:00.000Z", now), /passed/);
  assert.match(checkRegistrationDeadline(null, now), /valid registration deadline/);
  assert.match(checkRegistrationDeadline("not-a-date", now), /valid registration deadline/);
  assert.equal(checkRegistrationDeadline("2026-01-03T00:00:00.000Z", now), null);
});

test("profile reads are limited to the owner or staff roles", () => {
  assert.equal(canReadProfile("student", "student-a", "student-a"), true);
  assert.equal(canReadProfile("student", "student-a", "student-b"), false);
  assert.equal(canReadProfile("tpo", "staff-a", "student-b"), true);
  assert.equal(canReadProfile("unknown", "staff-a", "student-b"), false);
});

test("application results are restricted to the active student's profile", () => {
  assert.equal(ownsApplication("student-profile-a", { student_id: "student-profile-a" }), true);
  assert.equal(ownsApplication("student-profile-a", { student_id: "student-profile-b" }), false);
  assert.equal(ownsApplication(null, { student_id: "student-profile-a" }), false);
});

test("an existing application is recognized as a duplicate", () => {
  assert.equal(isDuplicateApplication(null), false);
  assert.equal(isDuplicateApplication({}), false);
  assert.equal(isDuplicateApplication({ id: "application-1" }), true);
});

test("application update privilege regression keeps write access to allowed columns only", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202609300002_limit_application_update_columns.sql", import.meta.url), "utf8");
  assert.match(migration, /REVOKE\s+UPDATE\s+ON\s+TABLE\s+public\.applications\s+FROM\s+authenticated/i);
  assert.match(migration, /REVOKE\s+UPDATE\s+ON\s+TABLE\s+public\.applications\s+FROM\s+anon/i);
  assert.match(migration, /GRANT\s+UPDATE\s*\(\s*status\s*,\s*updated_at\s*\)\s+ON\s+TABLE\s+public\.applications\s+TO\s+authenticated/i);
});

test("resume validation rejects non-PDF, oversized, and bad signatures", () => {
  assert.match(validateResumeMetadata({ size: 20, type: "text/plain", name: "cv.txt" }), /Only PDF/);
  assert.match(validateResumeMetadata({ size: 5 * 1024 * 1024 + 1, type: "application/pdf", name: "cv.pdf" }), /5 MB/);
  assert.equal(validateResumeMetadata({ size: 100, type: "application/pdf", name: "cv.pdf" }), null);
  assert.equal(hasPdfSignature(Buffer.from("not a pdf")), false);
  assert.equal(hasPdfSignature(Buffer.from("%PDF-1.7")), true);
});

test("resume storage path is constrained to the authenticated user's folder", () => {
  assert.equal(isOwnedResumePath("student-1/resume.pdf", "student-1"), true);
  assert.equal(isOwnedResumePath("student-2/resume.pdf", "student-1"), false);
  assert.equal(isOwnedResumePath("student-1/../secret.pdf", "student-1"), false);
  assert.equal(isOwnedResumePath("/student-1/resume.pdf", "student-1"), false);
});
