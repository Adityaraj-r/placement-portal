export const AUTH_ROLES = ["student", "coordinator", "tpo", "admin"];
export const STAFF_ROLES = ["coordinator", "tpo", "admin"];

export function roleLandingPath(role) {
  if (STAFF_ROLES.includes(role)) return "/admin/dashboard";
  if (role === "student") return "/opportunities";
  return null;
}

export function routeDecision(path, role, authenticated) {
  const isAdmin = path.startsWith("/admin");
  const isStudent = ["/profile", "/opportunities", "/applications"].some(
    (prefix) => path.startsWith(prefix),
  );
  const isAuth = path.startsWith("/login") || path.startsWith("/signup");

  if (!isAdmin && !isStudent && !isAuth) return "allow";
  if (!authenticated) return isAuth ? "allow" : "login";
  if (!AUTH_ROLES.includes(role)) return "forbidden";
  if (isAuth) return roleLandingPath(role);
  if (isAdmin && !STAFF_ROLES.includes(role)) {
    return role === "student" ? "student-home" : "forbidden";
  }
  if (isStudent && role !== "student") return "staff-home";
  return "allow";
}

export function validateNewPassword(password, confirmation) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}

export function isValidRecoveryPath(value) {
  return value === "/reset-password";
}

export function canReadProfile(role, callerProfileId, targetProfileId) {
  return STAFF_ROLES.includes(role)
    || (role === "student" && callerProfileId === targetProfileId);
}

export function authorizationFailure(user, profile, allowedRoles, authError, profileError) {
  if (authError || !user) return "unauthenticated";
  if (profileError || !profile) return "unverified";
  if (!allowedRoles.includes(profile.role)) return "forbidden";
  return null;
}

export function ownsApplication(studentProfileId, application) {
  return Boolean(studentProfileId && application?.student_id === studentProfileId);
}

export function isDuplicateApplication(existingApplication) {
  return Boolean(existingApplication?.id);
}

export function checkRegistrationDeadline(value, now = Date.now()) {
  if (!value) return "This placement drive has no valid registration deadline";
  const deadline = new Date(value).getTime();
  if (!Number.isFinite(deadline)) return "This placement drive has no valid registration deadline";
  if (now > deadline) return "The registration deadline for this drive has passed.";
  return null;
}

export function validateResumeMetadata(file) {
  if (!file || typeof file !== "object") return "Choose a PDF resume to upload";
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 5 * 1024 * 1024) return "Resume must be a PDF no larger than 5 MB";
  if (file.type !== "application/pdf" || !file.name?.toLowerCase().endsWith(".pdf")) return "Only PDF resumes are allowed";
  return null;
}

export function hasPdfSignature(bytes) {
  return bytes?.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
}

export function isOwnedResumePath(path, userId) {
  if (typeof path !== "string" || !path || path.startsWith("/")) return false;
  const segments = path.split("/");
  return segments.length === 2 && segments[0] === userId && Boolean(segments[1])
    && !segments.some((segment) => segment === "." || segment === "..");
}
