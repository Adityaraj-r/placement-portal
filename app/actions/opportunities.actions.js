"use server";

import { createClient } from "@/lib/supabase/supabaseServer";

const DRIVE_STATUSES = ["draft", "published", "in_progress", "completed", "cancelled"];
const STAFF_ROLES = ["admin", "tpo", "coordinator"];
const DRIVE_SELECT = `
  id,
  company_id,
  title,
  job_description,
  job_location,
  package_lpa,
  min_cgpa,
  allowed_departments,
  max_backlogs,
  registration_deadline,
  status,
  created_by,
  created_at,
  updated_at,
  companies ( id, name, website, industry, description, location )
`;

async function getStaffContext(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Unauthorized" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !profile) return { error: "Could not verify your account" };
  if (!STAFF_ROLES.includes(profile.role)) return { error: "Not authorized" };

  return { user, profile };
}

function parseDepartments(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }
  if (typeof value === "string") {
    return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
  }
  return [];
}

function parseOptionalNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function buildDriveValues(input = {}) {
  const title = String(input.title ?? input.role ?? "").trim();
  const registrationDeadline = input.registration_deadline ?? input.deadline;
  const deadlineDate = registrationDeadline ? new Date(registrationDeadline) : null;
  const packageLpa = parseOptionalNumber(input.package_lpa);
  const minCgpa = parseOptionalNumber(input.min_cgpa);
  const maxBacklogs = Number(input.max_backlogs ?? 0);
  const status = String(input.status || "draft").toLowerCase();

  if (!title || !String(input.company_name ?? "").trim()) {
    return { error: "Company and opportunity title are required" };
  }
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) {
    return { error: "Enter a valid registration deadline" };
  }
  if (!Number.isInteger(maxBacklogs) || maxBacklogs < 0) {
    return { error: "Maximum backlogs must be a non-negative whole number" };
  }
  if (Number.isNaN(packageLpa) || (packageLpa != null && packageLpa < 0)) {
    return { error: "Package must be zero or greater" };
  }
  if (Number.isNaN(minCgpa) || (minCgpa != null && (minCgpa < 0 || minCgpa > 10))) {
    return { error: "Minimum CGPA must be between 0 and 10" };
  }
  if (!DRIVE_STATUSES.includes(status)) {
    return { error: "Choose a valid placement drive status" };
  }

  return {
    values: {
      title,
      job_description: String(input.job_description ?? input.description ?? "").trim() || null,
      job_location: String(input.job_location ?? "").trim() || null,
      package_lpa: packageLpa,
      min_cgpa: minCgpa,
      allowed_departments: parseDepartments(input.allowed_departments),
      max_backlogs: maxBacklogs,
      registration_deadline: deadlineDate.toISOString(),
      status,
    },
  };
}

async function findOrCreateCompany(supabase, name) {
  const companyName = String(name || "").trim();
  if (!companyName) return { error: "Company name is required" };

  const { data: existing, error: lookupError } = await supabase
    .from("companies")
    .select("id")
    .eq("name", companyName)
    .maybeSingle();
  if (lookupError) return { error: "Could not look up the company" };
  if (existing) return { companyId: existing.id };

  const now = new Date().toISOString();
  const { data: company, error: insertError } = await supabase
    .from("companies")
    .insert({ name: companyName, created_at: now, updated_at: now })
    .select("id")
    .single();
  if (insertError || !company) return { error: "Could not save the company" };
  return { companyId: company.id };
}

function toOpportunityView(drive) {
  if (!drive) return drive;
  return {
    ...drive,
    role: drive.title,
    company_name: drive.companies?.name || "Company unavailable",
    description: drive.job_description,
    deadline: drive.registration_deadline,
    location: drive.job_location || drive.companies?.location || "",
  };
}

// Keep the established action names for the existing opportunity UI.
export async function createOpportunity(opportunityData) {
  try {
    const supabase = await createClient();
    const { profile, error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };

    const { values, error: validationError } = buildDriveValues(opportunityData);
    if (validationError) return { success: false, error: validationError };

    const { companyId, error: companyError } = await findOrCreateCompany(
      supabase,
      opportunityData.company_name,
    );
    if (companyError) return { success: false, error: companyError };

    const now = new Date().toISOString();
    const { data: drive, error } = await supabase
      .from("placement_drives")
      .insert({
        ...values,
        company_id: companyId,
        created_by: profile.id,
        created_at: now,
        updated_at: now,
      })
      .select(DRIVE_SELECT)
      .single();

    if (error || !drive) return { success: false, error: "Could not create the placement drive" };
    return { success: true, data: toOpportunityView(drive) };
  } catch {
    return { success: false, error: "Could not create the placement drive" };
  }
}

export async function updateOpportunity(id, opportunityData) {
  if (!id) return { success: false, error: "Placement drive ID is required" };

  try {
    const supabase = await createClient();
    const { error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };

    const { values, error: validationError } = buildDriveValues(opportunityData);
    if (validationError) return { success: false, error: validationError };

    const { data: currentDrive, error: driveError } = await supabase
      .from("placement_drives")
      .select("id, company_id")
      .eq("id", id)
      .maybeSingle();
    if (driveError || !currentDrive) {
      return { success: false, error: "Placement drive not found or unavailable" };
    }

    const companyName = String(opportunityData.company_name).trim();
    const { data: currentCompany, error: currentCompanyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", currentDrive.company_id)
      .maybeSingle();
    if (currentCompanyError || !currentCompany) {
      return { success: false, error: "Could not load the company" };
    }
    if (currentCompany.name !== companyName) {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .update({ name: companyName, updated_at: new Date().toISOString() })
        .eq("id", currentDrive.company_id)
        .select("id")
        .maybeSingle();
      if (companyError || !company) return { success: false, error: "Could not update the company" };
    }

    const { data: drive, error } = await supabase
      .from("placement_drives")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(DRIVE_SELECT)
      .single();
    if (error || !drive) return { success: false, error: "Could not update the placement drive" };

    return { success: true, data: toOpportunityView(drive) };
  } catch {
    return { success: false, error: "Could not update the placement drive" };
  }
}

export async function closeOpportunity(id) {
  if (!id) return { success: false, error: "Placement drive ID is required" };
  try {
    const supabase = await createClient();
    const { error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };
    const { data: drive, error } = await supabase
      .from("placement_drives")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(DRIVE_SELECT)
      .single();
    if (error || !drive) return { success: false, error: "Could not close the placement drive" };
    return { success: true, data: toOpportunityView(drive) };
  } catch {
    return { success: false, error: "Could not close the placement drive" };
  }
}

export async function getAllOpportunities() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Please log in to view placement drives" };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError || !profile) return { success: false, error: "Could not verify your account" };

    let query = supabase
      .from("placement_drives")
      .select(DRIVE_SELECT)
      .order("created_at", { ascending: false });
    if (profile.role === "student") query = query.eq("status", "published");
    else if (!STAFF_ROLES.includes(profile.role)) return { success: false, error: "Not authorized" };

    const { data, error } = await query;
    if (error) return { success: false, error: "Could not load placement drives" };
    return { success: true, data: (data || []).map(toOpportunityView) };
  } catch {
    return { success: false, error: "Could not load placement drives" };
  }
}

export async function getOpportunityById(id) {
  if (!id) return { success: false, error: "Placement drive ID is required" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Please log in to view this placement drive" };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError || !profile) return { success: false, error: "Could not verify your account" };
    if (profile.role !== "student" && !STAFF_ROLES.includes(profile.role)) {
      return { success: false, error: "Not authorized" };
    }

    let query = supabase
      .from("placement_drives")
      .select(DRIVE_SELECT)
      .eq("id", id);
    if (profile.role === "student") query = query.eq("status", "published");
    const { data: drive, error } = await query.maybeSingle();
    if (error || !drive) return { success: false, error: "Placement drive not found or unavailable" };
    return { success: true, data: toOpportunityView(drive) };
  } catch {
    return { success: false, error: "Could not load the placement drive" };
  }
}

export async function getAllNonAppliedOpportunities() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Please log in to view placement drives" };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "student") {
      return { success: false, error: "Student account not found" };
    }

    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (studentError) return { success: false, error: "Could not load student profile" };

    const { data: applications, error: applicationError } = studentProfile
      ? await supabase
          .from("applications")
          .select("drive_id")
          .eq("student_id", studentProfile.id)
      : { data: [], error: null };
    if (applicationError) return { success: false, error: "Could not load your applications" };

    const appliedDriveIds = new Set((applications || []).map((application) => application.drive_id));
    const { data: drives, error } = await supabase
      .from("placement_drives")
      .select(DRIVE_SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: "Could not load placement drives" };

    return {
      success: true,
      data: (drives || [])
        .filter((drive) => !appliedDriveIds.has(drive.id))
        .map(toOpportunityView),
    };
  } catch {
    return { success: false, error: "Could not load placement drives" };
  }
}
