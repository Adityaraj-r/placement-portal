"use server";

import { revalidatePath } from "next/cache";
import { authorizationFailure } from "@/lib/auth/rules.mjs";
import {
  canScheduleApplicationInterview,
  canTransitionInterviewForApplication,
  validateInterviewEvaluation,
  validateInterviewInput,
} from "@/lib/placement/lifecycle-rules.mjs";
import { createClient } from "@/lib/supabase/supabaseServer";

const STAFF_ROLES = ["admin", "tpo", "coordinator"];

async function getStaffContext(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please log in to continue" };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  const failure = authorizationFailure(user, profile, STAFF_ROLES, null, error);
  if (failure === "unverified") return { error: "Could not verify your account" };
  if (failure) return { error: "Not authorized" };
  return { user, profile };
}

async function getStudentContext(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please log in to continue" };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  const failure = authorizationFailure(user, profile, ["student"], null, error);
  if (failure === "unverified") return { error: "Could not verify your account" };
  if (failure) return { error: "Only students can manage their offers" };
  const { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("id, profile_id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (studentError || !student || student.profile_id !== profile.id) {
    return { error: "Could not verify your student profile" };
  }
  return { user, profile, student };
}

async function loadInterviewScope(supabase, driveId, interviewId) {
  if (typeof driveId !== "string" || !driveId.trim() || typeof interviewId !== "string" || !interviewId.trim()) {
    return { error: "Interview and placement drive are required" };
  }
  const { data: interview, error: interviewError } = await supabase
    .from("application_interviews")
    .select("id, application_id, scheduled_at, mode, location, details, status")
    .eq("id", interviewId.trim())
    .maybeSingle();
  if (interviewError) return { error: "Could not verify the interview" };
  if (!interview) return { error: "Interview not found" };
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, drive_id, status, student_id")
    .eq("id", interview.application_id)
    .maybeSingle();
  if (applicationError) return { error: "Could not verify the interview application" };
  if (!application || application.drive_id !== driveId.trim()) {
    return { error: "Interview does not belong to this placement drive" };
  }
  return { interview, application };
}

export async function getDriveLifecycle(driveId) {
  try {
    const supabase = await createClient();
    const { error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };
    if (typeof driveId !== "string" || !driveId.trim()) return { success: false, error: "Placement drive is required" };

    const { data: applications, error: applicationError } = await supabase
      .from("applications")
      .select("id")
      .eq("drive_id", driveId.trim());
    if (applicationError) return { success: false, error: "Could not load drive applications" };
    const applicationIds = (applications || []).map(({ id }) => id);
    if (!applicationIds.length) return { success: true, data: { interviews: [], evaluations: [], offers: [], placements: [] } };

    const [interviews, evaluations, offers, placements] = await Promise.all([
      supabase.from("application_interviews").select("id, application_id, scheduled_at, mode, location, details, status").in("application_id", applicationIds).order("scheduled_at", { ascending: true }),
      supabase.from("interview_evaluations").select("id, interview_id, application_id, score, feedback, recommendation, evaluator_id, updated_at").in("application_id", applicationIds),
      supabase.from("placement_offers").select("id, application_id, student_id, drive_id, offered_ctc, offer_letter_path, is_accepted, decided_at, created_at").in("application_id", applicationIds),
      supabase.from("placements").select("id, application_id, student_id, drive_id, company_id, job_title, package_lpa, offer_status, placement_date, joining_date, created_at").in("application_id", applicationIds),
    ]);
    if (interviews.error || evaluations.error || offers.error || placements.error) {
      return { success: false, error: "Could not load interview and offer details" };
    }
    return { success: true, data: {
      interviews: interviews.data || [], evaluations: evaluations.data || [],
      offers: offers.data || [], placements: placements.data || [],
    } };
  } catch {
    return { success: false, error: "Could not load drive lifecycle details" };
  }
}

export async function scheduleApplicationInterview(driveId, applicationId, input) {
  const validationError = validateInterviewInput(input);
  if (validationError) return { success: false, error: validationError };
  try {
    const supabase = await createClient();
    const { user, profile, error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };
    if (typeof driveId !== "string" || !driveId.trim() || typeof applicationId !== "string" || !applicationId.trim()) {
      return { success: false, error: "Application and placement drive are required" };
    }
    const { data: application, error } = await supabase.from("applications")
      .select("id, drive_id, status")
      .eq("id", applicationId.trim())
      .maybeSingle();
    if (error) return { success: false, error: "Could not verify the application" };
    if (!application || application.drive_id !== driveId.trim()) return { success: false, error: "Application does not belong to this placement drive" };
    if (!canScheduleApplicationInterview(application.status)) return { success: false, error: "Only shortlisted applicants can be scheduled for interview" };

    const { data, error: insertError } = await supabase.from("application_interviews").insert({
      application_id: application.id,
      scheduled_at: new Date(input.scheduledAt).toISOString(),
      mode: input.mode,
      location: input.location.trim(),
      details: input.details.trim(),
      status: "scheduled",
      created_by: profile.id,
    }).select("id, application_id, scheduled_at, mode, location, details, status").single();
    if (insertError) return { success: false, error: "Could not schedule interview" };
    revalidatePath(`/admin/opportunities/${driveId}/applicants`);
    revalidatePath("/applications");
    return { success: true, data };
  } catch {
    return { success: false, error: "Could not schedule interview" };
  }
}

export async function updateApplicationInterview(driveId, interviewId, input) {
  const validationError = validateInterviewInput(input);
  if (validationError) return { success: false, error: validationError };
  try {
    const supabase = await createClient();
    const { error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };
    const scope = await loadInterviewScope(supabase, driveId, interviewId);
    if (scope.error) return { success: false, error: scope.error };
    if (scope.interview.status !== "scheduled" || scope.application.status !== "shortlisted") {
      return { success: false, error: "Only scheduled interviews for shortlisted applicants can be changed" };
    }
    const { data, error } = await supabase.from("application_interviews").update({
      scheduled_at: new Date(input.scheduledAt).toISOString(), mode: input.mode,
      location: input.location.trim(), details: input.details.trim(), updated_at: new Date().toISOString(),
    }).eq("id", scope.interview.id).eq("status", "scheduled")
      .select("id, application_id, scheduled_at, mode, location, details, status").maybeSingle();
    if (error || !data) return { success: false, error: "Could not update interview" };
    revalidatePath(`/admin/opportunities/${driveId}/applicants`);
    revalidatePath("/applications");
    return { success: true, data };
  } catch {
    return { success: false, error: "Could not update interview" };
  }
}

export async function transitionApplicationInterview(driveId, interviewId, nextStatus) {
  if (nextStatus !== "completed" && nextStatus !== "cancelled") return { success: false, error: "Choose a valid interview status" };
  try {
    const supabase = await createClient();
    const { error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };
    const scope = await loadInterviewScope(supabase, driveId, interviewId);
    if (scope.error) return { success: false, error: scope.error };
    if (!canTransitionInterviewForApplication(scope.application.status, scope.interview.status, nextStatus)) {
      return { success: false, error: "Invalid interview status transition" };
    }
    const { data, error } = await supabase.from("application_interviews")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", scope.interview.id).eq("status", "scheduled")
      .select("id, application_id, scheduled_at, mode, location, details, status").maybeSingle();
    if (error || !data) return { success: false, error: "Could not update interview status" };
    revalidatePath(`/admin/opportunities/${driveId}/applicants`);
    revalidatePath("/applications");
    return { success: true, data };
  } catch {
    return { success: false, error: "Could not update interview status" };
  }
}

export async function saveInterviewEvaluation(driveId, interviewId, input) {
  const validationError = validateInterviewEvaluation(input);
  if (validationError) return { success: false, error: validationError };
  try {
    const supabase = await createClient();
    const { profile, error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };
    const scope = await loadInterviewScope(supabase, driveId, interviewId);
    if (scope.error) return { success: false, error: scope.error };
    if (scope.interview.status !== "completed") return { success: false, error: "Complete the interview before evaluating it" };
    const values = {
      score: Number(input.score),
      feedback: input.feedback.trim(), recommendation: input.recommendation,
      updated_at: new Date().toISOString(),
    };
    const { data: existing, error: lookupError } = await supabase.from("interview_evaluations")
      .select("id").eq("interview_id", scope.interview.id).maybeSingle();
    if (lookupError) return { success: false, error: "Could not verify the evaluation" };
    const result = existing
      ? await supabase.from("interview_evaluations").update(values).eq("id", existing.id).select().single()
      : await supabase.from("interview_evaluations").insert({
          interview_id: scope.interview.id,
          application_id: scope.application.id,
          evaluator_id: profile.id,
          ...values,
        }).select().single();
    if (result.error) return { success: false, error: "Could not save interview evaluation" };
    revalidatePath(`/admin/opportunities/${driveId}/applicants`);
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Could not save interview evaluation" };
  }
}

export async function createPlacementOffer(driveId, applicationId, input) {
  const offeredCtc = Number(input?.offeredCtc);
  if (!Number.isFinite(offeredCtc) || offeredCtc <= 0) return { success: false, error: "Offer amount must be greater than zero" };
  try {
    const supabase = await createClient();
    const { error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };
    if (typeof driveId !== "string" || !driveId.trim() || typeof applicationId !== "string" || !applicationId.trim()) {
      return { success: false, error: "Application and placement drive are required" };
    }
    const { data: application, error } = await supabase.from("applications")
      .select("id, status, student_id, drive_id, student_profiles ( profile_id )")
      .eq("id", applicationId.trim()).maybeSingle();
    if (error) return { success: false, error: "Could not verify the application" };
    if (!application || application.drive_id !== driveId.trim()) return { success: false, error: "Application does not belong to this placement drive" };
    if (application.status !== "selected") return { success: false, error: "Only selected applicants can receive offers" };
    const studentProfile = Array.isArray(application.student_profiles)
      ? application.student_profiles[0]
      : application.student_profiles;
    if (!studentProfile?.profile_id) return { success: false, error: "Could not verify applicant account" };
    const { data, error: insertError } = await supabase.from("placement_offers").insert({
      application_id: application.id, student_id: studentProfile.profile_id,
      drive_id: application.drive_id, offered_ctc: offeredCtc, is_accepted: null,
    }).select("id, application_id, student_id, drive_id, offered_ctc, is_accepted, decided_at, created_at").single();
    if (insertError) {
      return { success: false, error: insertError.code === "23505" ? "An offer already exists for this application" : "Could not create offer" };
    }
    revalidatePath(`/admin/opportunities/${driveId}/applicants`);
    revalidatePath("/applications");
    return { success: true, data };
  } catch {
    return { success: false, error: "Could not create offer" };
  }
}

export async function respondToPlacementOffer(offerId, accept) {
  if (typeof offerId !== "string" || !offerId.trim() || typeof accept !== "boolean") {
    return { success: false, error: "Offer response is invalid" };
  }
  try {
    const supabase = await createClient();
    const { profile, error: authError } = await getStudentContext(supabase);
    if (authError) return { success: false, error: authError };
    const { data: offer, error: lookupError } = await supabase.from("placement_offers")
      .select("id, application_id, student_id, drive_id, is_accepted")
      .eq("id", offerId.trim()).maybeSingle();
    if (lookupError) return { success: false, error: "Could not verify the offer" };
    if (!offer || offer.student_id !== profile.id) return { success: false, error: "Offer not found" };
    if (offer.is_accepted !== null) return { success: false, error: "This offer has already been decided" };
    const { data, error } = await supabase.from("placement_offers")
      .update({ is_accepted: accept, decided_at: new Date().toISOString() })
      .eq("id", offer.id).is("is_accepted", null)
      .select("id, application_id, student_id, drive_id, is_accepted, decided_at").maybeSingle();
    if (error || !data) return { success: false, error: "Offer was already decided or could not be updated" };
    let placement = null;
    if (accept) {
      const { data: createdPlacement, error: placementError } = await supabase.from("placements")
        .select("id, application_id, student_id, drive_id, company_id, job_title, package_lpa, offer_status, placement_date, joining_date")
        .eq("application_id", offer.application_id).maybeSingle();
      if (placementError || !createdPlacement) return { success: false, error: "Offer accepted, but placement record could not be confirmed" };
      placement = createdPlacement;
    }
    revalidatePath("/applications");
    revalidatePath("/admin/placements");
    return { success: true, data: { offer: data, placement } };
  } catch {
    return { success: false, error: "Could not respond to offer" };
  }
}
