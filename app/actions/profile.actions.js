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
      .select("role")
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

    const studentUpdates = { user_id: user.id };
    for (const field of academicFields) {
      if (Object.hasOwn(profileData, field)) {
        studentUpdates[field] = profileData[field];
      }
    }

    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .upsert(studentUpdates, { onConflict: "user_id" })
      .select()
      .single();

    if (studentError) {
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
  if (!profileId) {
    return { success: false, error: "Profile ID is required" };
  }

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
      .eq("id", profileId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", accountProfile.user_id)
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*");

    if (error) {
      return { success: false, error: error.message };
    }

    const studentIds = profiles
      .filter((profile) => profile.role === "student")
      .map((profile) => profile.user_id);
    const { data: studentProfiles, error: studentError } = studentIds.length
      ? await supabase
          .from("student_profiles")
          .select("*")
          .in("user_id", studentIds)
      : { data: [], error: null };

    if (studentError) {
      return { success: false, error: "Could not load student profiles" };
    }

    const studentProfilesByUserId = new Map(
      studentProfiles.map((profile) => [profile.user_id, profile]),
    );
    return {
      success: true,
      data: profiles
        .filter((profile) => profile.role === "student")
        .map((profile) =>
          combineProfile(profile, studentProfilesByUserId.get(profile.user_id)),
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
  if (!profileId) {
    return { success: false, error: "Profile ID is required" };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (error) {
      return { success: false, error: error.message };
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
      .eq("user_id", user.id)
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
