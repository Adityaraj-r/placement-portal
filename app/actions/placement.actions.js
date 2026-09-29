"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/supabaseServer";

const STAFF_ROLES = ["admin", "tpo", "coordinator"];
const OFFER_STATUSES = ["offered", "accepted", "rejected"];
const PLACEMENT_FIELDS = "id, application_id, student_id, drive_id, company_id, job_title, package_lpa, offer_status, placement_date, joining_date, created_at";

async function verifyStaff(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please log in to create placements" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !profile) return { error: "Could not verify your account" };
  if (!STAFF_ROLES.includes(profile.role)) return { error: "Not authorized" };
  return {};
}

function isValidId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function parseOptionalPackage(value) {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "number" && typeof value !== "string") {
    return { error: "Package must be a valid number" };
  }
  const packageLpa = Number(value);
  if (!Number.isFinite(packageLpa) || packageLpa < 0) {
    return { error: "Package must be a valid number greater than or equal to zero" };
  }
  return { value: packageLpa };
}

function parseOptionalDate(value, label) {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: `${label} must be a valid date` };
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { error: `${label} must be a valid date` };
  }
  return { value };
}

function firstRelation(relation) {
  return Array.isArray(relation) ? relation[0] : relation;
}

export async function getPlacements() {
  try {
    const supabase = await createClient();
    const { error: authError } = await verifyStaff(supabase);
    if (authError) return { success: false, error: authError };

    const { data: placements, error } = await supabase
      .from("placements")
      .select(`
        ${PLACEMENT_FIELDS},
        student_profiles ( id, profile_id, college_id, department, degree, graduation_year, cgpa, backlogs, skills ),
        companies ( id, name, website, industry, location ),
        placement_drives ( id, title, job_location, registration_deadline )
      `)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: "Could not load placements" };
    if (!placements?.length) return { success: true, data: [] };

    const profileIds = [...new Set(placements
      .map((placement) => firstRelation(placement.student_profiles)?.profile_id)
      .filter(Boolean))];
    const profileById = new Map();
    if (profileIds.length) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds);
      if (profilesError) return { success: false, error: "Could not load placement student details" };
      for (const profile of profiles || []) profileById.set(profile.id, profile);
    }

    const data = placements.map((placement) => {
      const studentProfile = firstRelation(placement.student_profiles);
      const company = firstRelation(placement.companies);
      const drive = firstRelation(placement.placement_drives);
      const profile = profileById.get(studentProfile?.profile_id);
      return {
        ...placement,
        student: studentProfile ? {
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? null,
          college_id: studentProfile.college_id,
          department: studentProfile.department,
          degree: studentProfile.degree,
          graduation_year: studentProfile.graduation_year,
          cgpa: studentProfile.cgpa,
          backlogs: studentProfile.backlogs,
          skills: studentProfile.skills,
        } : null,
        company: company ? {
          name: company.name,
          website: company.website,
          industry: company.industry,
          location: company.location,
        } : null,
        drive: drive ? {
          title: drive.title,
          job_location: drive.job_location,
          registration_deadline: drive.registration_deadline,
        } : null,
      };
    });
    return { success: true, data };
  } catch {
    return { success: false, error: "Could not load placements" };
  }
}

export async function updatePlacement(placementId, placementData = {}) {
  try {
    const supabase = await createClient();
    const { error: authError } = await verifyStaff(supabase);
    if (authError) return { success: false, error: authError };
    if (!isValidId(placementId)) return { success: false, error: "Placement ID is invalid" };
    if (!placementData || typeof placementData !== "object" || Array.isArray(placementData)) {
      return { success: false, error: "Placement details are invalid" };
    }

    const { data: existing, error: lookupError } = await supabase
      .from("placements")
      .select(PLACEMENT_FIELDS)
      .eq("id", placementId)
      .maybeSingle();
    if (lookupError) return { success: false, error: "Could not verify the placement" };
    if (!existing) return { success: false, error: "Placement not found" };

    const updates = {};
    if (Object.hasOwn(placementData, "package_lpa")) {
      const result = parseOptionalPackage(placementData.package_lpa);
      if (result.error) return { success: false, error: result.error };
      updates.package_lpa = result.value;
    }
    if (Object.hasOwn(placementData, "offer_status")) {
      if (typeof placementData.offer_status !== "string" || !OFFER_STATUSES.includes(placementData.offer_status)) {
        return { success: false, error: "Choose a valid offer status" };
      }
      updates.offer_status = placementData.offer_status;
    }
    if (Object.hasOwn(placementData, "placement_date")) {
      const result = parseOptionalDate(placementData.placement_date, "Placement date");
      if (result.error) return { success: false, error: result.error };
      updates.placement_date = result.value;
    }
    if (Object.hasOwn(placementData, "joining_date")) {
      const result = parseOptionalDate(placementData.joining_date, "Joining date");
      if (result.error) return { success: false, error: result.error };
      updates.joining_date = result.value;
    }
    if (!Object.keys(updates).length) return { success: false, error: "No placement changes provided" };

    const { data: placement, error: updateError } = await supabase
      .from("placements")
      .update(updates)
      .eq("id", existing.id)
      .select(PLACEMENT_FIELDS)
      .maybeSingle();
    if (updateError) return { success: false, error: "Could not update placement" };
    if (!placement) return { success: false, error: "Placement not found or not accessible" };
    revalidatePath("/admin/placements");
    return { success: true, data: placement };
  } catch {
    return { success: false, error: "Could not update placement" };
  }
}

export async function createPlacement(applicationId, placementData = {}) {
  try {
    const supabase = await createClient();
    const { error: authError } = await verifyStaff(supabase);
    if (authError) return { success: false, error: authError };
    if (typeof applicationId !== "string" || !applicationId.trim()) {
      return { success: false, error: "Application is required" };
    }
    if (!placementData || typeof placementData !== "object" || Array.isArray(placementData)) {
      return { success: false, error: "Placement details are invalid" };
    }

    const packageResult = parseOptionalPackage(placementData.package_lpa);
    if (packageResult.error) return { success: false, error: packageResult.error };
    const offerStatus = Object.hasOwn(placementData, "offer_status")
      ? placementData.offer_status
      : "offered";
    if (typeof offerStatus !== "string" || !OFFER_STATUSES.includes(offerStatus)) {
      return { success: false, error: "Choose a valid offer status" };
    }
    const placementDate = parseOptionalDate(placementData.placement_date, "Placement date");
    if (placementDate.error) return { success: false, error: placementDate.error };
    const joiningDate = parseOptionalDate(placementData.joining_date, "Joining date");
    if (joiningDate.error) return { success: false, error: joiningDate.error };

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        student_id,
        drive_id,
        student_profiles ( id ),
        placement_drives (
          id,
          title,
          company_id,
          companies ( id )
        )
      `)
      .eq("id", applicationId.trim())
      .maybeSingle();
    if (applicationError) return { success: false, error: "Could not verify the application" };
    if (!application) return { success: false, error: "Application not found" };
    if (application.status !== "selected") {
      return { success: false, error: "A placement can only be created for a selected applicant" };
    }

    const studentProfile = firstRelation(application.student_profiles);
    const drive = firstRelation(application.placement_drives);
    const company = firstRelation(drive?.companies);
    if (!studentProfile || studentProfile.id !== application.student_id) {
      return { success: false, error: "The applicant's student profile is unavailable" };
    }
    if (!drive || drive.id !== application.drive_id) {
      return { success: false, error: "The placement drive is unavailable" };
    }
    if (!company || company.id !== drive.company_id) {
      return { success: false, error: "The drive's company is unavailable" };
    }

    const { data: existingPlacement, error: placementLookupError } = await supabase
      .from("placements")
      .select("id")
      .eq("application_id", application.id)
      .maybeSingle();
    if (placementLookupError) return { success: false, error: "Could not check for an existing placement" };
    if (existingPlacement) {
      return { success: false, error: "A placement already exists for this application" };
    }

    const { data: placement, error: insertError } = await supabase
      .from("placements")
      .insert({
        application_id: application.id,
        student_id: studentProfile.id,
        drive_id: drive.id,
        company_id: company.id,
        job_title: drive.title,
        package_lpa: packageResult.value,
        offer_status: offerStatus,
        placement_date: placementDate.value,
        joining_date: joiningDate.value,
      })
      .select("id, application_id, student_id, drive_id, company_id, job_title, package_lpa, offer_status, placement_date, joining_date, created_at")
      .single();
    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "A placement already exists for this application" };
      }
      return { success: false, error: "Could not create placement" };
    }

    revalidatePath(`/admin/opportunities/${drive.id}/applicants`);
    return { success: true, data: placement };
  } catch {
    return { success: false, error: "Could not create placement" };
  }
}
