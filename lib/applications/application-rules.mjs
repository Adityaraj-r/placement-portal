import { STAFF_ROLES, checkRegistrationDeadline } from "../auth/rules.mjs";

export const PHASE_3B_APPLICATION_STATUSES = [
  "applied",
  "eligible",
  "ineligible",
  "shortlisted",
  "rejected",
];

const REVIEW_TRANSITIONS = {
  applied: ["eligible", "ineligible"],
  eligible: ["shortlisted", "rejected"],
  ineligible: [],
  shortlisted: [],
  rejected: [],
};

export function isStudentAccountForUser(userId, profile) {
  return Boolean(userId && profile?.role === "student" && profile.user_id === userId && profile.id);
}

export function canReviewApplications(role) {
  return STAFF_ROLES.includes(role);
}

export function applicationTransitions(status) {
  return REVIEW_TRANSITIONS[status] || [];
}

export function canTransitionApplication(currentStatus, nextStatus) {
  return applicationTransitions(currentStatus).includes(nextStatus);
}

export function isApplicationForDrive(application, driveId) {
  return Boolean(application?.id && driveId && application.drive_id === driveId);
}

export function evaluateDriveEligibility(studentProfile, drive) {
  if (!studentProfile || !drive) return "Could not verify this placement drive's eligibility requirements";

  if (drive.min_cgpa != null) {
    const minimumCgpa = Number(drive.min_cgpa);
    const cgpa = Number(studentProfile.cgpa);
    if (!Number.isFinite(minimumCgpa) || minimumCgpa < 0 || minimumCgpa > 10) {
      return "Could not verify this placement drive's eligibility requirements";
    }
    if (studentProfile.cgpa == null || studentProfile.cgpa === "" || !Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
      return "Add a valid CGPA to your student profile before applying";
    }
    if (cgpa < minimumCgpa) return "You do not meet this drive's CGPA requirement";
  }

  const allowedDepartments = Array.isArray(drive.allowed_departments)
    ? drive.allowed_departments.map((department) => String(department).trim().toLocaleLowerCase()).filter(Boolean)
    : [];
  if (allowedDepartments.length) {
    const department = typeof studentProfile.department === "string"
      ? studentProfile.department.trim().toLocaleLowerCase()
      : "";
    if (!department) return "Add your department to your student profile before applying";
    if (!allowedDepartments.includes(department)) return "Your department is not eligible for this placement drive";
  }

  const backlogs = Number(studentProfile.backlogs);
  const maximumBacklogs = drive.max_backlogs == null ? 0 : Number(drive.max_backlogs);
  if (studentProfile.backlogs == null || studentProfile.backlogs === "" || !Number.isInteger(backlogs) || backlogs < 0) {
    return "Add a valid backlog count to your student profile before applying";
  }
  if (!Number.isInteger(maximumBacklogs) || maximumBacklogs < 0) {
    return "Could not verify this placement drive's eligibility requirements";
  }
  if (backlogs > maximumBacklogs) return "You do not meet this drive's backlog requirement";
  return null;
}

export function validateApplicationSubmission({ role, studentProfile, drive, hasResume, existingApplication, now = Date.now() }) {
  if (role !== "student") return "Only students can apply to placement drives";
  if (!studentProfile) return "Complete your student profile before applying";
  if (!drive) return "Placement drive not found or unavailable";
  if (!drive.company_id) return "This placement drive has no valid company association";
  if (drive.status !== "published") return "Applications are not open for this placement drive";
  const deadlineError = checkRegistrationDeadline(drive.registration_deadline, now);
  if (deadlineError) return deadlineError;
  const eligibilityError = evaluateDriveEligibility(studentProfile, drive);
  if (eligibilityError) return eligibilityError;
  if (!hasResume) return "Upload a resume to your profile before applying";
  if (existingApplication) return "You have already applied to this placement drive";
  return null;
}

export function isApplicationResumeScope(application, driveId, studentProfileId) {
  return Boolean(
    application
    && application.drive_id === driveId
    && application.student_id === studentProfileId,
  );
}
