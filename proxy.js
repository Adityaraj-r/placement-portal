import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

  const path = req.nextUrl.pathname;

  // Define route groups
  const isProtectedAdminRoute = path.startsWith("/admin");
  const staffRoles = ["admin", "tpo", "coordinator"];
  const isProtectedStudentRoute =
    path.startsWith("/profile") ||
    path.startsWith("/opportunities") ||
    path.startsWith("/applications");
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup");

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

  if (isProtectedAdminRoute || isProtectedStudentRoute || isAuthRoute) {
    if (!user) {
      if (!isAuthRoute) return redirectWithCookies("/login");
      return supabaseResponse;
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    const role = profileError ? null : profile?.role;
    const supportedRoles = ["admin", "tpo", "coordinator", "student"];
    if (!supportedRoles.includes(role)) return forbiddenWithCookies();

    if (isAuthRoute) {
      if (staffRoles.includes(role)) return redirectWithCookies("/admin/dashboard");
      if (role === "student") return redirectWithCookies("/opportunities");
      return supabaseResponse;
    }

    if (isProtectedAdminRoute && !staffRoles.includes(role)) {
      if (role === "student") return redirectWithCookies("/opportunities");
      return forbiddenWithCookies();
    }

    if (isProtectedStudentRoute && role !== "student") {
      if (staffRoles.includes(role)) return redirectWithCookies("/admin/dashboard");
      return forbiddenWithCookies();
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
