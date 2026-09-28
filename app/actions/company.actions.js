"use server";

import { createClient } from "@/lib/supabase/supabaseServer";

const STAFF_ROLES = ["admin", "tpo", "coordinator"];
const COMPANY_FIELDS = [
  "name",
  "website",
  "industry",
  "description",
  "location",
  "hr_contact_name",
  "hr_contact_email",
];
const COMPANY_SELECT = `id, ${COMPANY_FIELDS.join(", ")}`;

async function getStaffClient() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please log in to manage companies" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !profile) return { error: "Could not verify your account" };
  if (!STAFF_ROLES.includes(profile.role)) return { error: "Not authorized" };
  return { supabase };
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildCompanyValues(input = {}) {
  if (!input || typeof input !== "object") input = {};
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return { error: "Company name is required" };

  const values = { name };
  for (const field of COMPANY_FIELDS.slice(1)) {
    const value = input[field];
    values[field] = typeof value === "string" && value.trim() ? value.trim() : null;
  }
  if (values.website) {
    try {
      const website = new URL(values.website);
      if (!["http:", "https:"].includes(website.protocol)) throw new Error("Invalid protocol");
    } catch {
      return { error: "Enter a valid website URL beginning with http:// or https://" };
    }
  }
  return { values };
}

async function findDuplicateCompany(supabase, name, excludeId) {
  const { data: companies, error } = await supabase.from("companies").select("id, name");
  if (error) return { error: "Could not check for duplicate company names" };
  const normalizedName = normalizeName(name);
  const duplicate = (companies || []).some(
    (company) => company.id !== excludeId && normalizeName(company.name || "") === normalizedName,
  );
  return duplicate ? { error: "A company with this name already exists" } : {};
}

export async function getCompanies() {
  try {
    const { supabase, error: authError } = await getStaffClient();
    if (authError) return { success: false, error: authError };

    const { data, error } = await supabase
      .from("companies")
      .select(COMPANY_SELECT)
      .order("name", { ascending: true });
    if (error) return { success: false, error: "Could not load companies" };
    return { success: true, data: data || [] };
  } catch {
    return { success: false, error: "Could not load companies" };
  }
}

export async function createCompany(companyInput) {
  try {
    const { supabase, error: authError } = await getStaffClient();
    if (authError) return { success: false, error: authError };

    const { values, error: validationError } = buildCompanyValues(companyInput);
    if (validationError) return { success: false, error: validationError };
    const { error: duplicateError } = await findDuplicateCompany(supabase, values.name);
    if (duplicateError) return { success: false, error: duplicateError };

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("companies")
      .insert({ ...values, created_at: now, updated_at: now })
      .select(COMPANY_SELECT)
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "A company with this name already exists" };
      return { success: false, error: "Could not create company" };
    }
    return { success: true, data };
  } catch {
    return { success: false, error: "Could not create company" };
  }
}

export async function updateCompany(companyId, companyInput) {
  try {
    const { supabase, error: authError } = await getStaffClient();
    if (authError) return { success: false, error: authError };
    if (typeof companyId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId.trim())) {
      return { success: false, error: "A valid company is required" };
    }
    companyId = companyId.trim();

    const { values, error: validationError } = buildCompanyValues(companyInput);
    if (validationError) return { success: false, error: validationError };

    const { data: existing, error: lookupError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();
    if (lookupError) return { success: false, error: "Could not verify the company" };
    if (!existing) return { success: false, error: "Company not found" };

    const { error: duplicateError } = await findDuplicateCompany(supabase, values.name, companyId);
    if (duplicateError) return { success: false, error: duplicateError };

    const { data, error } = await supabase
      .from("companies")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", companyId)
      .select(COMPANY_SELECT)
      .maybeSingle();
    if (error) {
      if (error.code === "23505") return { success: false, error: "A company with this name already exists" };
      return { success: false, error: "Could not update company" };
    }
    if (!data) return { success: false, error: "Company not found" };
    return { success: true, data };
  } catch {
    return { success: false, error: "Could not update company" };
  }
}
