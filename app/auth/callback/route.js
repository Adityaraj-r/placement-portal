import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/supabaseServer";
import { isValidRecoveryPath } from "@/lib/auth/rules.mjs";

const loginRedirect = (request, error) => {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
};

const recoveryRedirect = (request) =>
  NextResponse.redirect(new URL("/forgot-password?error=reset_failed", request.url));

export async function GET(request) {
  const callbackUrl = new URL(request.url);
  const requestedNext = callbackUrl.searchParams.get("next");
  const isRecovery = callbackUrl.searchParams.get("type") === "recovery"
    || requestedNext === "/reset-password";
  const code = callbackUrl.searchParams.get("code");
  if (!code) return isRecovery
    ? recoveryRedirect(request)
    : loginRedirect(request, "confirmation_failed");

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return isRecovery
      ? recoveryRedirect(request)
      : loginRedirect(request, "confirmation_failed");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      await supabase.auth.signOut();
      return isRecovery
        ? recoveryRedirect(request)
        : loginRedirect(request, "confirmation_failed");
    }

    if (isRecovery) {
      if (!isValidRecoveryPath(requestedNext)) {
        await supabase.auth.signOut();
        return recoveryRedirect(request);
      }
      const response = NextResponse.redirect(new URL(requestedNext, request.url));
      response.cookies.set("portal-password-recovery", user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/reset-password",
        maxAge: 15 * 60,
      });
      return response;
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
    return isRecovery
      ? recoveryRedirect(request)
      : loginRedirect(request, "confirmation_failed");
  }
}
