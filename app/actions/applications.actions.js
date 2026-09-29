"use server";

import { createClient } from "@/lib/supabase/supabaseServer";
import { authorizationFailure, ownsApplication } from "@/lib/auth/rules.mjs";
import {
  canReviewApplications,
  canTransitionApplication,
  evaluateDriveEligibility,
  isApplicationForDrive,
  isStudentAccountForUser,
  validateApplicationSubmission,
} from "@/lib/applications/application-rules.mjs";

const STAFF_ROLES = ["admin", "tpo", "coordinator"];

async function getCurrentStudent(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please log in to continue" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError || !isStudentAccountForUser(user.id, profile)) {
    return { error: "Student account not found" };
  }

  const { data: studentProfile, error: studentError } = await supabase
    .from("student_profiles")
    .select("id, profile_id, cgpa, department, backlogs, resume_path")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (studentError) return { error: "Could not load your student profile" };
  return { user, profile, studentProfile };
}

async function verifyStaff(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authorizationFailure(user, null, STAFF_ROLES, authError) === "unauthenticated") {
    return { error: "Please log in to continue" };
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const authorization = authorizationFailure(user, profile, STAFF_ROLES, null, error);
  if (authorization === "unverified") return { error: "Could not verify your account" };
  if (authorization === "forbidden" || !canReviewApplications(profile?.role)) return { error: "Not authorized" };
  return { user, profile };
}

export async function applyToOpportunity(driveId) {
  if (typeof driveId !== "string" || !driveId.trim()) return { success: false, error: "Placement drive is required" };

  try {
    const supabase = await createClient();
    const { profile, studentProfile, error: studentError } = await getCurrentStudent(supabase);
    if (studentError) return { success: false, error: studentError };

    const { data: drive, error: driveError } = await supabase
      .from("placement_drives")
      .select("id, company_id, status, registration_deadline, min_cgpa, allowed_departments, max_backlogs")
      .eq("id", driveId.trim())
      .maybeSingle();
    if (driveError) return { success: false, error: "Could not verify this placement drive" };

    let existingApplication = null;
    if (studentProfile && drive) {
      const { data, error } = await supabase
        .from("applications")
        .select("id")
        .eq("student_id", studentProfile.id)
        .eq("drive_id", drive.id)
        .maybeSingle();
      if (error) return { success: false, error: "Could not verify your application status" };
      existingApplication = data;
    }
    const validationError = validateApplicationSubmission({
      role: profile?.role,
      studentProfile,
      drive: driveError ? null : drive,
      hasResume: Boolean(studentProfile?.resume_path),
      existingApplication,
    });
    if (validationError) return { success: false, error: validationError };

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("applications")
      .insert({
        drive_id: drive.id,
        student_id: studentProfile.id,
        status: "applied",
        applied_at: now,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "You have already applied to this placement drive" };
      }
      return { success: false, error: "Could not submit your application" };
    }
    return { success: true, data };
  } catch {
    return { success: false, error: "Could not submit your application" };
  }
}

export async function getMyApplicationEligibility(driveId) {
  if (typeof driveId !== "string" || !driveId.trim()) {
    return { success: false, error: "Placement drive is required" };
  }

  try {
    const supabase = await createClient();
    const { profile, studentProfile, error: studentError } = await getCurrentStudent(supabase);
    if (studentError) return { success: false, error: studentError };

    const { data: drive, error: driveError } = await supabase
      .from("placement_drives")
      .select("id, company_id, status, registration_deadline, min_cgpa, allowed_departments, max_backlogs")
      .eq("id", driveId.trim())
      .maybeSingle();
    if (driveError) return { success: false, error: "Could not verify this placement drive" };

    let existingApplication = null;
    if (studentProfile && drive) {
      const { data, error } = await supabase
        .from("applications")
        .select("id, status")
        .eq("student_id", studentProfile.id)
        .eq("drive_id", drive.id)
        .maybeSingle();
      if (error) return { success: false, error: "Could not verify your application status" };
      existingApplication = data;
    }

    const validationError = validateApplicationSubmission({
      role: profile?.role,
      studentProfile,
      drive,
      hasResume: Boolean(studentProfile?.resume_path),
      existingApplication,
    });
    return {
      success: true,
      eligible: !validationError,
      error: validationError,
      applicationStatus: existingApplication?.status || null,
    };
  } catch {
    return { success: false, error: "Could not check your application eligibility" };
  }
}

export async function getMyApplications() {
  try {
    const supabase = await createClient();
    const { studentProfile, error: studentError } = await getCurrentStudent(supabase);
    if (studentError) return { success: false, error: studentError };
    if (!studentProfile) return { success: true, data: [] };

    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        student_id,
        drive_id,
        status,
        current_round,
        rejection_reason,
        applied_at,
        created_at,
        updated_at,
        placement_drives (
          id,
          title,
          job_description,
          job_location,
          package_lpa,
          min_cgpa,
          allowed_departments,
          max_backlogs,
          registration_deadline,
          status,
          company_id
        )
      `)
      .eq("student_id", studentProfile.id)
      .order("applied_at", { ascending: false });

    if (error) return { success: false, error: "Could not load your applications" };
    const companyIds = [...new Set((data || []).map((application) => application.placement_drives?.company_id).filter(Boolean))];
    const { data: companies, error: companyError } = companyIds.length
      ? await supabase.from("published_drive_companies").select("id, name, location, website").in("id", companyIds)
      : { data: [], error: null };
    if (companyError) return { success: false, error: "Could not load company information for your applications" };
    const companyById = new Map((companies || []).map((company) => [company.id, company]));
    return {
      success: true,
      data: (data || [])
        .filter((application) => ownsApplication(studentProfile.id, application))
        .map((application) => ({
          ...application,
          placement_drives: application.placement_drives
            ? { ...application.placement_drives, companies: companyById.get(application.placement_drives.company_id) || null }
            : null,
        })),
    };
  } catch {
    return { success: false, error: "Could not load your applications" };
  }
}

export async function getApplicantsByDrive(driveId) {
  if (!driveId) return { success: false, error: "Placement drive is required" };

  try {
    const supabase = await createClient();
    const { error: authError } = await verifyStaff(supabase);
    if (authError) return { success: false, error: authError };

    const { data: applications, error } = await supabase
      .from("applications")
      .select(`
        id,
        student_id,
        drive_id,
        status,
        current_round,
        rejection_reason,
        applied_at,
        student_profiles ( id, profile_id, college_id, department, degree, graduation_year, cgpa, backlogs, skills )
      `)
      .eq("drive_id", driveId)
      .order("applied_at", { ascending: false });
    if (error) return { success: false, error: "Could not load applicants" };

    const profileIds = [...new Set(
      (applications || [])
        .map((application) => application.student_profiles?.profile_id)
        .filter(Boolean),
    )];
    const { data: profiles, error: profileError } = profileIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", profileIds)
      : { data: [], error: null };
    if (profileError) return { success: false, error: "Could not load applicant details" };

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    return {
      success: true,
      data: (applications || []).map((application) => {
        const studentProfile = application.student_profiles;
        const accountProfile = profileById.get(studentProfile?.profile_id);
        return {
          ...application,
          profiles: {
            name: accountProfile?.full_name || "",
            email: accountProfile?.email || "",
            college: studentProfile?.college_id || "",
            branch: studentProfile?.department || "",
            skills: studentProfile?.skills || [],
          },
        };
      }),
    };
  } catch {
    return { success: false, error: "Could not load applicants" };
  }
}

export async function updateApplicationStatus(applicationId, driveId, statusValue) {
  if (!applicationId || typeof driveId !== "string" || !driveId.trim()) {
    return { success: false, error: "Application and placement drive are required" };
  }
  if (typeof statusValue !== "string") {
    return { success: false, error: "Choose a valid application status" };
  }

  try {
    const supabase = await createClient();
    const { error: authError } = await verifyStaff(supabase);
    if (authError) return { success: false, error: authError };

    const { data: existingApplication, error: lookupError } = await supabase
      .from("applications")
      .select("id, status, drive_id, student_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (lookupError) return { success: false, error: "Could not verify the application" };
    if (!isApplicationForDrive(existingApplication, driveId.trim())) {
      return { success: false, error: "Application not found for this placement drive" };
    }
    if (!canTransitionApplication(existingApplication.status, statusValue)) {
      return { success: false, error: `Cannot change an application from ${existingApplication.status} to ${statusValue}` };
    }

    if (statusValue === "eligible") {
      const [{ data: studentProfile, error: studentError }, { data: drive, error: driveError }] = await Promise.all([
        supabase.from("student_profiles").select("cgpa, department, backlogs").eq("id", existingApplication.student_id).maybeSingle(),
        supabase.from("placement_drives").select("min_cgpa, allowed_departments, max_backlogs").eq("id", existingApplication.drive_id).maybeSingle(),
      ]);
      if (studentError || driveError || !studentProfile || !drive) {
        return { success: false, error: "Could not verify applicant eligibility" };
      }
      const eligibilityError = evaluateDriveEligibility(studentProfile, drive);
      if (eligibilityError) return { success: false, error: eligibilityError };
    }

    const { data, error } = await supabase
      .from("applications")
      .update({ status: statusValue, updated_at: new Date().toISOString() })
      .eq("id", applicationId)
      .eq("status", existingApplication.status)
      .select()
      .maybeSingle();
    if (error || !data) return { success: false, error: "Could not update application status" };
    return { success: true, data };
  } catch {
    return { success: false, error: "Could not update application status" };
  }
}

export async function getAllApplications() {
  try {
    const supabase = await createClient();
    const { error: authError } = await verifyStaff(supabase);
    if (authError) return { success: false, error: authError };

    const { data, error } = await supabase
      .from("applications")
      .select("id, drive_id, student_id, status, applied_at, current_round")
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: "Could not load applications" };
    return { success: true, data: data || [] };
  } catch {
    return { success: false, error: "Could not load applications" };
  }
}
