"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/supabaseServer";
import { validateNewPassword } from "@/lib/auth/rules.mjs";

export async function updatePassword(password, confirmation) {
  const validationError = validateNewPassword(password, confirmation);
  if (validationError) return { success: false, error: validationError };

  const cookieStore = await cookies();
  try {
    const supabase = await createClient(cookieStore);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const recoveryUserId = cookieStore.get("portal-password-recovery")?.value;
    if (userError || !user || recoveryUserId !== user.id) {
      cookieStore.delete("portal-password-recovery");
      return { success: false, error: "This password reset link is invalid or expired. Request a new link." };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { success: false, error: "We couldn't update your password. Request a new reset link and try again." };
    await supabase.auth.signOut();
    cookieStore.delete("portal-password-recovery");
    return { success: true };
  } catch {
    return { success: false, error: "We couldn't update your password. Request a new reset link and try again." };
  }
}
