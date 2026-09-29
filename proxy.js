import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routeDecision } from "@/lib/auth/rules.mjs";

export async function proxy(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const path = req.nextUrl.pathname;
  const requiresAuth =
    path.startsWith("/admin") ||
    path.startsWith("/profile") ||
    path.startsWith("/opportunities") ||
    path.startsWith("/applications") ||
    path.startsWith("/login") ||
    path.startsWith("/signup");

  // Public pages should still render when the project has not configured Supabase.
  // Authenticated routes fail closed rather than accidentally becoming public.
  if (!supabaseUrl || !supabaseKey) {
    if (requiresAuth) {
      return new NextResponse(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local, then restart the dev server.",
        { status: 503 }
      );
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectWithCookies = (url) => {
    const redirectResponse = NextResponse.redirect(new URL(url, req.url));
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  };

  const forbiddenWithCookies = () => {
    const forbiddenResponse = new NextResponse("Forbidden", { status: 403 });
    for (const cookie of supabaseResponse.cookies.getAll()) {
      forbiddenResponse.cookies.set(cookie);
    }
    return forbiddenResponse;
  };

  const decision = routeDecision(path, null, Boolean(user));
  if (decision === "allow") return supabaseResponse;
  if (decision === "login") return redirectWithCookies("/login");
  if (user) {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    const role = profileError ? null : profile?.role;
    const decision = routeDecision(path, role, true);
    if (decision === "forbidden") return forbiddenWithCookies();
    if (decision === "student-home") return redirectWithCookies("/opportunities");
    if (decision === "staff-home") return redirectWithCookies("/admin/dashboard");
    if (decision === "/admin/dashboard" || decision === "/opportunities") return redirectWithCookies(decision);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
