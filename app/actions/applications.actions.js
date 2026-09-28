"use server";

import { createClient } from "@/lib/supabase/supabaseServer";

const STAFF_ROLES = ["admin", "tpo", "coordinator"];

async function getCurrentStudent(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please log in to continue" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "student") {
    return { error: "Student account not found" };
  }

  const { data: studentProfile, error: studentError } = await supabase
    .from("student_profiles")
    .select("id, user_id, cgpa, department, backlogs")
    .eq("user_id", user.id)
    .maybeSingle();
  if (studentError) return { error: "Could not load your student profile" };
  return { user, studentProfile };
}

function checkDriveEligibility(studentProfile, drive) {
  const allowedDepartments = Array.isArray(drive.allowed_departments)
    ? drive.allowed_departments.map((department) => String(department).trim()).filter(Boolean)
    : [];

  if (drive.min_cgpa != null) {
    const minimumCgpa = Number(drive.min_cgpa);
    if (!Number.isFinite(minimumCgpa)) {
      return "Could not verify this placement drive's eligibility requirements";
    }
    const cgpa = studentProfile.cgpa;
    if (cgpa == null || cgpa === "" || !Number.isFinite(Number(cgpa))) {
      return "Add your CGPA to your student profile before applying";
    }
    if (Number(cgpa) < minimumCgpa) {
      return "You do not meet this drive's CGPA requirement";
    }
  }

  if (allowedDepartments.length > 0) {
    const department = typeof studentProfile.department === "string"
      ? studentProfile.department.trim()
      : "";
    if (!department) {
      return "Add your department to your student profile before applying";
    }
    const matchesDepartment = allowedDepartments.some(
      (allowedDepartment) => allowedDepartment.toLocaleLowerCase() === department.toLocaleLowerCase(),
    );
    if (!matchesDepartment) {
      return "Your department is not eligible for this placement drive";
    }
  }

  const backlogs = studentProfile.backlogs;
  if (backlogs == null || backlogs === "" || !Number.isFinite(Number(backlogs))) {
    return "Add your backlog count to your student profile before applying";
  }
  const maximumBacklogs = drive.max_backlogs == null ? 0 : Number(drive.max_backlogs);
  if (!Number.isFinite(maximumBacklogs) || maximumBacklogs < 0) {
    return "Could not verify this placement drive's eligibility requirements";
  }
  if (Number(backlogs) > maximumBacklogs) {
    return "You do not meet this drive's backlog requirement";
  }

  return null;
}

async function verifyStaff(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please log in to continue" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !profile) return { error: "Could not verify your account" };
  if (!STAFF_ROLES.includes(profile.role)) return { error: "Not authorized" };
  return { user, profile };
}

export async function applyToOpportunity(driveId) {
  if (!driveId) return { success: false, error: "Placement drive is required" };

  try {
    const supabase = await createClient();
    const { studentProfile, error: studentError } = await getCurrentStudent(supabase);
    if (studentError) return { success: false, error: studentError };
    if (!studentProfile) {
      return { success: false, error: "Complete your student profile before applying" };
    }

    const { data: drive, error: driveError } = await supabase
      .from("placement_drives")
      .select("id, status, min_cgpa, allowed_departments, max_backlogs, companies ( id )")
      .eq("id", driveId)
      .maybeSingle();
    if (driveError || !drive) {
      return { success: false, error: "Placement drive not found or unavailable" };
    }
    if (!drive.companies) {
      return { success: false, error: "The company for this placement drive is unavailable" };
    }
    if (drive.status !== "published") {
      return { success: false, error: "Applications are not open for this placement drive" };
    }

    const eligibilityError = checkDriveEligibility(studentProfile, drive);
    if (eligibilityError) return { success: false, error: eligibilityError };

    const { data: existingApplication, error: duplicateCheckError } = await supabase
      .from("applications")
      .select("id")
      .eq("student_id", studentProfile.id)
      .eq("drive_id", driveId)
      .maybeSingle();
    if (duplicateCheckError) {
      return { success: false, error: "Could not verify your application status" };
    }
    if (existingApplication) {
      return { success: false, error: "You have already applied to this placement drive" };
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("applications")
      .insert({
        drive_id: driveId,
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
          companies ( id, name, location, website )
        )
      `)
      .eq("student_id", studentProfile.id)
      .order("applied_at", { ascending: false });

    if (error) return { success: false, error: "Could not load your applications" };
    return { success: true, data: data || [] };
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
        student_profiles ( id, user_id, college_id, department, degree, graduation_year, cgpa, backlogs, skills )
      `)
      .eq("drive_id", driveId)
      .order("applied_at", { ascending: false });
    if (error) return { success: false, error: "Could not load applicants" };

    const userIds = [...new Set(
      (applications || [])
        .map((application) => application.student_profiles?.user_id)
        .filter(Boolean),
    )];
    const { data: profiles, error: profileError } = userIds.length
      ? await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds)
      : { data: [], error: null };
    if (profileError) return { success: false, error: "Could not load applicant details" };

    const profileByUserId = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
    return {
      success: true,
      data: (applications || []).map((application) => {
        const studentProfile = application.student_profiles;
        const accountProfile = profileByUserId.get(studentProfile?.user_id);
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

export async function updateApplicationStatus(applicationId, statusValue) {
  if (!applicationId || typeof statusValue !== "string" || !statusValue.trim()) {
    return { success: false, error: "Application and status are required" };
  }

  try {
    const supabase = await createClient();
    const { error: authError } = await verifyStaff(supabase);
    if (authError) return { success: false, error: authError };

    const { data, error } = await supabase
      .from("applications")
      .update({ status: statusValue.trim(), updated_at: new Date().toISOString() })
      .eq("id", applicationId)
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
