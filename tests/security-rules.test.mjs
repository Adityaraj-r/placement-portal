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
