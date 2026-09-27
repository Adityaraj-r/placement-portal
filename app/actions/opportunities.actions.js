"use server";

import { createClient } from "@/lib/supabase/supabaseServer";

// helper to normalize required_skills
function processSkills(skills) {
  if (!skills) return [];

  if (Array.isArray(skills)) {
    return [...new Set(skills.map((s) => String(s).trim()).filter((s) => s))];
  }

  if (typeof skills === "string") {
    return [
      ...new Set(
        skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
      ),
    ];
  }

  return [];
}

// create opportunity
export async function createOpportunity(opportunityData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!opportunityData.company_name?.trim() || !opportunityData.role?.trim()) {
      return {
        success: false,
        error: "Company and role are required",
      };
    }

    const data = {
      ...opportunityData,
      company_name: opportunityData.company_name.trim(),
      role: opportunityData.role.trim(),
      description: opportunityData.description?.trim() || "",
      status: opportunityData.status?.trim() || "Open",
      required_skills: opportunityData.required_skills,
    };

    const { data: newOpportunity, error } = await supabase
      .from("opportunities")
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error("Error creating opportunity : ", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: newOpportunity };
  } catch (err) {
    console.error("Error creating opportunity : ", err.message);
    return {
      success: false,
      error: "An unexpected error occurred while creating oppportunity",
    };
  }
}

// update opportunity
export async function updateOpportunity(id, opportunityData) {
  if (!id) {
    return {
      success: false,
      error: "Opportunity ID is required",
    };
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

    const data = {
      ...opportunityData,
      ...(opportunityData.required_skills && {
        required_skills: opportunityData.required_skills,
      }),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedOpportunity, error } = await supabase
      .from("opportunities")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating opportunity : ", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: updatedOpportunity };
  } catch (err) {
    console.error("Error updating opportunity : ", err.message);
    return {
      success: false,
      error: "An unexpected error occurred while updating opportunity",
    };
  }
}

// close opportunity
export async function closeOpportunity(id) {
  if (!id) {
    return {
      success: false,
      error: "Opportunity ID is required",
    };
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

    const { data, error } = await supabase
      .from("opportunities")
      .update({ status: "Closed", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error closing opportunity : ", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Error closing opportunity : ", err.message);
    return {
      success: false,
      error: "An unexpected error occurred while closing opportunity",
    };
  }
}

// get all opportunities
export async function getAllOpportunities() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("opportunities")
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

// get opportunity by id
export async function getOpportunityById(id) {
  if (!id) {
    return {
      success: false,
      error: "Opportunity ID is required",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error getting opportunity : ", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Error getting opportunity : ", err.message);
    return {
      success: false,
      error: "An unexpected error occurred while getting opportunity",
    };
  }
}
export async function getAllNonAppliedOpportunities(userId) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: profiles, error: proError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (proError || !profiles) {
      return { success: false, error: "Profile not found" };
    }

    const studentId = profiles.id;

    const { data: applied, error: appError } = await supabase
      .from("applications")
      .select("opportunity_id")
      .eq("student_id", studentId);

    if (appError) {
      return { success: false, error: appError.message };
    }

    const appliedIds = applied.map(a => a.opportunity_id);

    const { data: opp, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    if (oppError) {
      return { success: false, error: oppError.message };
    }

    if (appliedIds.length === 0) {
      return { success: true, data: opp };
    }

    const appliedSet = new Set(appliedIds);

    const filteredOpportunities = opp.filter(
      item => !appliedSet.has(item.id)
    );

    return { success: true, data: filteredOpportunities };

  } catch (err) {
    console.error(err);
    return { success: false, error: "Unexpected error" };
  }
}


