"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/supabaseServer";

const RESUME_BUCKET = "resumes";
const MAX_RESUME_SIZE = 5 * 1024 * 1024;
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
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || profile?.role !== "student") {
    return { error: "Only students can manage their resume" };
  }

  return { user };
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

function isOwnedResumePath(path, userId) {
  if (typeof path !== "string" || !path || path.startsWith("/")) return false;
  const segments = path.split("/");
  return segments.length === 2
    && segments[0] === userId
    && Boolean(segments[1])
    && !segments.some((segment) => segment === "." || segment === "..");
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
    const { user, error: authError } = await getStudentContext(supabase);
    if (authError) return { success: false, error: authError };

    const file = formData?.get("resume");
    if (!file || typeof file.arrayBuffer !== "function") {
      return { success: false, error: "Choose a PDF resume to upload" };
    }
    if (file.size <= 0 || file.size > MAX_RESUME_SIZE) {
      return { success: false, error: "Resume must be a PDF no larger than 5 MB" };
    }
    if (file.type !== "application/pdf" || !file.name?.toLowerCase().endsWith(".pdf")) {
      return { success: false, error: "Only PDF resumes are allowed" };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
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
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileReadError) {
      await supabase.storage.from(RESUME_BUCKET).remove([resumePath]);
      return { success: false, error: "Could not save your resume details" };
    }

    const profileWrite = existingProfile
      ? await supabase
          .from("student_profiles")
          .update({ resume_path: resumePath })
          .eq("user_id", user.id)
          .select("resume_path")
          .maybeSingle()
      : await supabase
          .from("student_profiles")
          .insert({ user_id: user.id, resume_path: resumePath })
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
    const { user, error: authError } = await getStudentContext(supabase);
    if (authError) return { success: false, error: authError };

    const { data: studentProfile, error } = await supabase
      .from("student_profiles")
      .select("resume_path")
      .eq("user_id", user.id)
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
      .select("id")
      .eq("drive_id", driveId)
      .eq("student_id", studentProfileId)
      .maybeSingle();
    if (applicationError || !application) {
      return { success: false, error: "Applicant resume is unavailable" };
    }

    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .select("user_id, resume_path")
      .eq("id", studentProfileId)
      .maybeSingle();
    if (studentError || !studentProfile?.resume_path || !studentProfile.user_id) {
      return { success: false, error: "No resume is available for this applicant" };
    }

    const result = await createResumeSignedUrl(
      supabase,
      studentProfile.resume_path,
      studentProfile.user_id,
    );
    if (result.error) return { success: false, error: result.error };
    return { success: true, url: result.url };
  } catch {
    return { success: false, error: "Could not open this applicant's resume" };
  }
}
