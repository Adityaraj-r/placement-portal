"use server";

import { randomUUID } from "node:crypto";
import { hasPdfSignature, isOwnedResumePath, validateResumeMetadata } from "@/lib/auth/rules.mjs";
import { isApplicationResumeScope } from "@/lib/applications/application-rules.mjs";
import { createClient } from "@/lib/supabase/supabaseServer";

const RESUME_BUCKET = "Resumes";
const SIGNED_URL_SECONDS = 60;
const STAFF_ROLES = ["admin", "tpo", "coordinator"];

async function getStudentContext(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please log in to manage your resume" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || profile?.role !== "student") {
    return { error: "Only students can manage their resume" };
  }

  return { user, profileId: profile.id };
}

async function getStaffContext(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please log in to view applicant resumes" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !profile) return { error: "Could not verify your account" };
  if (!STAFF_ROLES.includes(profile.role)) return { error: "Not authorized" };

  return { user };
}

async function createResumeSignedUrl(supabase, path, userId) {
  if (!isOwnedResumePath(path, userId)) {
    return { error: "Resume is unavailable" };
  }

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS, { download: false });
  if (error || !data?.signedUrl) return { error: "Could not open this resume" };
  return { url: data.signedUrl };
}

export async function uploadStudentResume(formData) {
  try {
    const supabase = await createClient();
    const { user, profileId, error: authError } = await getStudentContext(supabase);
    if (authError) return { success: false, error: authError };

    const file = formData?.get("resume");
    const metadataError = validateResumeMetadata(file);
    if (metadataError) return { success: false, error: metadataError };
    if (typeof file.arrayBuffer !== "function") return { success: false, error: "Choose a PDF resume to upload" };

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasPdfSignature(bytes)) {
      return { success: false, error: "The selected file is not a valid PDF" };
    }

    const safeFilename = file.name
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "_")
      .replace(/^\.+/, "")
      .slice(-120) || "resume.pdf";
    const resumePath = `${user.id}/${randomUUID()}-${safeFilename}`;
    const { error: uploadError } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(resumePath, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) return { success: false, error: "Could not upload your resume" };

    const { data: existingProfile, error: profileReadError } = await supabase
      .from("student_profiles")
      .select("resume_path")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (profileReadError) {
      await supabase.storage.from(RESUME_BUCKET).remove([resumePath]);
      return { success: false, error: "Could not save your resume details" };
    }

    const profileWrite = existingProfile
      ? await supabase
          .from("student_profiles")
          .update({ resume_path: resumePath })
          .eq("profile_id", profileId)
          .select("resume_path")
          .maybeSingle()
      : await supabase
          .from("student_profiles")
          .insert({ profile_id: profileId, resume_path: resumePath })
          .select("resume_path")
          .maybeSingle();

    if (profileWrite.error || !profileWrite.data) {
      await supabase.storage.from(RESUME_BUCKET).remove([resumePath]);
      return { success: false, error: "Could not save your resume details" };
    }

    let warning;
    const oldPath = existingProfile?.resume_path;
    if (oldPath && oldPath !== resumePath && isOwnedResumePath(oldPath, user.id)) {
      const { error: removeError } = await supabase.storage.from(RESUME_BUCKET).remove([oldPath]);
      if (removeError) warning = "Your new resume is saved, but the previous file could not be removed";
    }

    return {
      success: true,
      data: { resumePath, filename: file.name },
      warning,
    };
  } catch {
    return { success: false, error: "Could not upload your resume" };
  }
}

export async function getMyResumeSignedUrl() {
  try {
    const supabase = await createClient();
    const { user, profileId, error: authError } = await getStudentContext(supabase);
    if (authError) return { success: false, error: authError };

    const { data: studentProfile, error } = await supabase
      .from("student_profiles")
      .select("resume_path")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error) return { success: false, error: "Could not load your resume" };
    if (!studentProfile?.resume_path) return { success: false, error: "No resume has been uploaded" };

    const result = await createResumeSignedUrl(supabase, studentProfile.resume_path, user.id);
    if (result.error) return { success: false, error: result.error };
    return { success: true, url: result.url };
  } catch {
    return { success: false, error: "Could not open your resume" };
  }
}

export async function getApplicantResumeSignedUrl(driveId, studentProfileId) {
  if (!driveId || !studentProfileId) {
    return { success: false, error: "Applicant resume is unavailable" };
  }

  try {
    const supabase = await createClient();
    const { error: authError } = await getStaffContext(supabase);
    if (authError) return { success: false, error: authError };

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, drive_id, student_id")
      .eq("drive_id", driveId)
      .eq("student_id", studentProfileId)
      .maybeSingle();
    if (applicationError || !isApplicationResumeScope(application, driveId, studentProfileId)) {
      return { success: false, error: "Applicant resume is unavailable" };
    }

    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .select("profile_id, resume_path")
      .eq("id", studentProfileId)
      .maybeSingle();
    if (studentError || !studentProfile?.resume_path || !studentProfile.profile_id) {
      return { success: false, error: "No resume is available for this applicant" };
    }

    const { data: accountProfile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", studentProfile.profile_id)
      .maybeSingle();
    if (profileError || !accountProfile?.user_id) {
      return { success: false, error: "No resume is available for this applicant" };
    }

    const result = await createResumeSignedUrl(
      supabase,
      studentProfile.resume_path,
      accountProfile.user_id,
    );
    if (result.error) return { success: false, error: result.error };
    return { success: true, url: result.url };
  } catch {
    return { success: false, error: "Could not open this applicant's resume" };
  }
}
