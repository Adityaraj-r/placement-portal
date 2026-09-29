export const DRIVE_STATUSES = ["draft", "published", "in_progress", "completed", "cancelled"];
export const STAFF_ROLES = ["admin", "tpo", "coordinator"];

export function canManageCompanies(role) {
  return STAFF_ROLES.includes(role);
}

export function canManageDrives(role) {
  return STAFF_ROLES.includes(role);
}

export function canViewDrive(role, status) {
  return canManageDrives(role) || (role === "student" && status === "published");
}

const ALLOWED_TRANSITIONS = {
  draft: ["draft", "published", "cancelled"],
  published: ["published", "draft", "in_progress", "cancelled"],
  in_progress: ["in_progress", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

export function canTransitionDriveStatus(currentStatus, nextStatus) {
  return Boolean(ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus));
}

export function validateDriveForStatus(values, status, now = Date.now()) {
  if (!DRIVE_STATUSES.includes(status)) return "Choose a valid placement drive status";
  if (status !== "published") return null;
  if (!values?.company_id) return "Select a company before publishing";
  if (!values?.title?.trim()) return "A drive title is required before publishing";
  if (!values?.registration_deadline) return "Enter a valid registration deadline";
  const deadline = Date.parse(values.registration_deadline);
  if (!Number.isFinite(deadline)) return "Enter a valid registration deadline";
  if (deadline <= now) return "The registration deadline must be in the future to publish";
  return null;
}

export function validateDriveEligibility(minCgpa, maxBacklogs) {
  if (minCgpa != null && (!Number.isFinite(minCgpa) || minCgpa < 0 || minCgpa > 10)) {
    return "Minimum CGPA must be between 0 and 10";
  }
  if (!Number.isInteger(maxBacklogs) || maxBacklogs < 0) {
    return "Maximum backlogs must be a non-negative whole number";
  }
  return null;
}
