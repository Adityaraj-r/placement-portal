import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/supabaseServer";

const loginRedirect = (request, error) => {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
};

export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return loginRedirect(request, "confirmation_failed");

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return loginRedirect(request, "confirmation_failed");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      await supabase.auth.signOut();
      return loginRedirect(request, "confirmation_failed");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      return loginRedirect(request, "profile_unavailable");
    }

    if (["admin", "tpo", "coordinator"].includes(profile?.role)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (profile?.role === "student") {
      return NextResponse.redirect(new URL("/opportunities", request.url));
    }

    await supabase.auth.signOut();
    return loginRedirect(request, "profile_unavailable");
  } catch {
    return loginRedirect(request, "confirmation_failed");
  }
}
