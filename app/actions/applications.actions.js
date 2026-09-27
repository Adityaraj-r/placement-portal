"use server";

import { createClient } from "@/lib/supabase/supabaseServer";


async function checkDeadline(supabase, oppId) {
  try {
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .select("id")
      .eq("id", oppId)
      .gt("deadline", new Date().toISOString())
      .single();

    if (oppError || !opportunity) {
      return { success: false, error: "This Opportunity has closed or does not exist" };
    }

    return { success: true, canApply: true };
  } catch (err) {
    console.error("Error checking opportunity deadline: ", err.message);
    return { success: false, error: "Failed to validate opportunity" };
  }
}

//student
export async function applyToOpportunity(studId, oppId) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized: Please log in to apply" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError || !profile || profile.id !== studId) {
      return { success: false, error: "Unauthorized" };
    }

    //new application
    const appData = {
      student_id: studId,
      opportunity_id: oppId,
      status: "applied", // Default status
    };

    const { data, error } = await supabase
      .from("applications")
      .insert([appData])
      .select();

    if (error) {
      console.error("Error creating application: ", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Error creating application: ", err.message);
    return {
      success: false,
      error: "An unexpected error occurred while creating application",
    };
  }
}

//student dashboard
export async function getMyApplications(studId) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError || !profile || profile.id !== studId) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: studApplications, error } = await supabase
      .from("applications")
      .select(`
        *,
        opportunities (
          id,
          role,
          company_name,
          description,
          required_skills,
          deadline,
          status
        )
      `)
      .eq("student_id", studId)
      .order("applied_at", { ascending: false });

    if (error) {
      console.error("Error getting student applications: ", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: studApplications || [] };
  } catch (err) {
    console.error("Error getting student applications: ", err.message);
    return {
      success: false,
      error: "An unexpected error occurred while getting applications",
    };
  }
}

export async function getApplicantsByOpportunity(oppId) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        profiles (
          id,
          name,
          email,
          college,
          branch,
          skills,
          resume_url
        ),
        opportunities (
          id,
          company_name,
          role
        )
      `)
      .eq("opportunity_id", oppId);

    if (error) {
      console.error("Error getting applicants:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("Error getting applicants:", err.message);
    return {
      success: false,
      error: "An unexpected error occurred while getting applicants",
    };
  }
}

//statusValue -> shortlisted, rejected (only admin)
export async function updateApplicationStatus(appId, statusValue) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("applications")
      .update({ status: statusValue })
      .eq("id", appId)
      .select();

    if (error) {
      console.error("Error updating application status: ", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Error updating application status: ", err.message);
    return {
      success: false,
      error: "An unexpected error occurred while updating application status",
    };
  }
}

// get all applications
export async function getAllApplications() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting opportunities : ", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Error getting opportunities : ", err.message);
    return {
      success: false,
      error: "An unexpected error occurred while getting opportunities",
    };
  }
}
