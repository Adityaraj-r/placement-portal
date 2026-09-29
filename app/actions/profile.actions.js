"use server";

import { createClient } from "@/lib/supabase/supabaseServer";

const academicFields = [
  "college_id",
  "department",
  "degree",
  "graduation_year",
  "cgpa",
  "backlogs",
  "skills",
];
const STAFF_ROLES = ["admin", "tpo", "coordinator"];

async function getAuthenticatedProfile(supabase) {
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

  return { profile };
}

async function saveStudentProfile(profileData = {}) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: accountProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError || accountProfile?.role !== "student") {
      return { success: false, error: "Could not verify student account" };
    }

    const accountUpdates = {};
    if (typeof profileData.full_name === "string") {
      accountUpdates.full_name = profileData.full_name.trim();
    } else if (typeof profileData.name === "string") {
      accountUpdates.full_name = profileData.name.trim();
    }
    if (typeof profileData.phone === "string") {
      accountUpdates.phone = profileData.phone.trim();
    }

    if (Object.keys(accountUpdates).length > 0) {
      const { data: updatedAccount, error: accountError } = await supabase
        .from("profiles")
        .update(accountUpdates)
        .eq("user_id", user.id)
        .select("user_id")
        .maybeSingle();
      if (accountError || !updatedAccount) {
        return { success: false, error: "Could not save account details" };
      }
    }

    const studentUpdates = { profile_id: accountProfile.id };
    for (const field of academicFields) {
      if (Object.hasOwn(profileData, field)) {
        studentUpdates[field] = profileData[field];
      }
    }

    const { data: existingStudentProfile, error: studentLookupError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("profile_id", accountProfile.id)
      .maybeSingle();

    if (studentLookupError) {
      return { success: false, error: "Could not load student profile" };
    }

    const { data: studentProfile, error: studentError } = existingStudentProfile
      ? await supabase
          .from("student_profiles")
          .update(studentUpdates)
          .eq("id", existingStudentProfile.id)
          .select()
          .single()
      : await supabase
          .from("student_profiles")
          .insert(studentUpdates)
          .select()
          .single();

    if (studentError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Student profile save failed", {
          code: studentError.code,
          message: studentError.message,
        });
      }
      return { success: false, error: "Could not save student profile" };
    }

    return { success: true, data: studentProfile };
  } catch {
    return {
      success: false,
      error: "Could not save profile changes",
    };
  }
}

export async function createProfile(profileData) {
  return saveStudentProfile(profileData);
}

export async function updateProfile(profileData) {
  return saveStudentProfile(profileData);
}


export async function getProfileById(profileId) {
  if (typeof profileId !== "string" || !profileId.trim()) {
    return { success: false, error: "Profile ID is required" };
  }
  const targetProfileId = profileId.trim();

  try {
    const supabase = await createClient();

    const { profile: callerProfile, error: authError } = await getAuthenticatedProfile(supabase);
    if (authError) return { success: false, error: authError };
    if (!STAFF_ROLES.includes(callerProfile.role) && callerProfile.role !== "student") {
      return { success: false, error: "Not authorized" };
    }
    if (callerProfile.role === "student" && targetProfileId !== callerProfile.id) {
      return { success: false, error: "Not authorized" };
    }

    const { data: accountProfile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetProfileId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("profile_id", accountProfile.id)
      .maybeSingle();
    if (studentError) {
      return { success: false, error: "Could not load student profile" };
    }

    return { success: true, data: combineProfile(accountProfile, studentProfile) };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while getting profile",
    };
  }
}

export async function getAllProfiles() {
  try {
    const supabase = await createClient();

    const { profile, error: authError } = await getAuthenticatedProfile(supabase);
    if (authError) return { success: false, error: authError };
    if (!STAFF_ROLES.includes(profile.role)) {
      return { success: false, error: "Not authorized" };
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*");

    if (error) {
      return { success: false, error: error.message };
    }

    const studentProfileIds = profiles
      .filter((profile) => profile.role === "student")
      .map((profile) => profile.id);
    const { data: studentProfiles, error: studentError } = studentProfileIds.length
      ? await supabase
          .from("student_profiles")
          .select("*")
          .in("profile_id", studentProfileIds)
      : { data: [], error: null };

    if (studentError) {
      return { success: false, error: "Could not load student profiles" };
    }

    const studentProfilesByProfileId = new Map(
      studentProfiles.map((profile) => [profile.profile_id, profile]),
    );
    return {
      success: true,
      data: profiles
        .filter((profile) => profile.role === "student")
        .map((profile) =>
          combineProfile(profile, studentProfilesByProfileId.get(profile.id)),
        ),
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while getting profile",
    };
  }
}

export async function deleteProfileById(profileId) {
  if (typeof profileId !== "string" || !profileId.trim()) {
    return { success: false, error: "Profile ID is required" };
  }
  const targetProfileId = profileId.trim();

  try {
    const supabase = await createClient();

    const { profile, error: authError } = await getAuthenticatedProfile(supabase);
    if (authError) return { success: false, error: authError };
    if (!STAFF_ROLES.includes(profile.role)) {
      return { success: false, error: "Not authorized" };
    }

    const { data: deletedProfile, error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", targetProfileId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    if (!deletedProfile) {
      return { success: false, error: "Profile was not found or deletion is not permitted" };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while deleting profile",
    };
  }
}

export async function getProfileByUserId(_userId) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: accountProfile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return { success: false, error: "Could not load account profile" };
    }

    if (!accountProfile) {
      return { success: false, error: "Account profile not found" };
    }

    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("profile_id", accountProfile.id)
      .maybeSingle();
    if (studentError) {
      return { success: false, error: "Could not load student profile" };
    }

    return { success: true, data: combineProfile(accountProfile, studentProfile) };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while fetching profile",
    };
  }
}

function combineProfile(accountProfile, studentProfile) {
  return {
    ...accountProfile,
    ...studentProfile,
    id: accountProfile.id ?? accountProfile.user_id,
    user_id: accountProfile.user_id,
    name: accountProfile.full_name || "",
    college: studentProfile?.college_id ?? "",
    branch: studentProfile?.department ?? "",
    studentProfileExists: Boolean(studentProfile),
  };
}
