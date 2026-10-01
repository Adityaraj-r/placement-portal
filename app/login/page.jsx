"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { roleLandingPath } from "@/lib/auth/rules.mjs";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);
  const router = useRouter()
  const [errors, setErrors] = useState({ email: "", password: "" });
  // ✅ FORM STATE
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "confirmation_failed") {
      setShowVerificationHelp(true);
      toast.error("That verification link is invalid or expired. Request a new verification email and try again.");
    } else if (error === "profile_unavailable") {
      toast.error("Your account is verified, but its profile is not ready. Please contact support.");
    }
  }, []);

  // ✅ HANDLE INPUT CHANGE
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // ✅ HANDLE LOGIN
  async function handleLogin(e) {
    e.preventDefault();

    const { email, password } = formData;

    const nextErrors = { email: "", password: "" };
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) nextErrors.email = "Enter a valid email address.";
    if (!password || password.length < 6)
      nextErrors.password = "Password must be at least 6 characters.";
    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setShowVerificationHelp(false);
    try {
      const result = await signIn(email, password);
      if (result?.success) {
        toast.success("Logged in successfully.");
      } else if (result?.verificationRequired) {
        setShowVerificationHelp(true);
        toast.error("Please verify your email before logging in. Check your inbox for the verification email.");
      } else {
        toast.error(result?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ✅ SUPABASE LOGIN
  async function signIn(email, password) {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const notConfirmed =
          error.code === "email_not_confirmed" ||
          error.message?.toLowerCase().includes("email not confirmed");
        if (notConfirmed) {
          return { success: false, verificationRequired: true };
        }
        if (["invalid_credentials", "user_not_found"].includes(error.code)) {
          return { success: false, message: "Email or password is incorrect." };
        }
        return { success: false, message: "We couldn't log you in. Please try again." };
      }

      // Retrieve the authenticated user's profile to read database-backed role
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        return { success: false, message: "We couldn't verify your account role. Please contact support." };
      }

      const landingPath = roleLandingPath(profile?.role);
      if (!landingPath) {
        await supabase.auth.signOut();
        return { success: false, message: "We couldn't verify your account role. Please contact support." };
      }
      router.replace(landingPath);
      return { success: true };
    } catch {
      return { success: false, message: "A network error prevented login. Please try again." };
    }
  }

  async function resendVerification() {
    setResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: formData.email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error("We couldn't resend the verification email. Check the address and try again later.");
      } else {
        toast.success("If the account needs verification, a new email is on its way.");
      }
    } catch {
      toast.error("A network error prevented us from resending the email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-8 sm:px-6">
      <Card className="w-full max-w-md rounded-xl border-border shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Placement Portal</CardTitle>
          <CardDescription>Login to your account</CardDescription>
        </CardHeader>

        <CardContent>
          {/* ROLE */}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* EMAIL */}
            <div className="space-y-1">
              <Label htmlFor="login-email">Email address <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Input
                id="login-email"
                type="email"
                name="email"
                placeholder="john@gmail.com"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "login-email-error" : undefined}
              />
              {errors.email ? (
                  <p id="login-email-error" className="text-sm text-destructive" role="alert">{errors.email}</p>
              ) : null}
            </div>

            {/* PASSWORD */}
            <div className="space-y-1">
              <Label htmlFor="login-password">Password <span className="text-destructive" aria-hidden="true">*</span></Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  className="pr-12"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "login-password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {errors.password ? (
                  <p id="login-password-error" className="text-sm text-destructive" role="alert">{errors.password}</p>
              ) : null}
            </div>

            {/* REMEMBER */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember">Remember me</Label>
              </div>
              <Link href="/forgot-password" className="text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* SUBMIT */}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? "Signing in…" : "Login"}
            </Button>
          </form>

          {showVerificationHelp && (
            <div className="mt-4 space-y-2 text-sm" role="status">
              <p className="text-muted-foreground">
                Please verify your email before logging in. Check your inbox and spam folder.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={resendVerification} disabled={resending || !formData.email.trim()}>
                {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend verification email
              </Button>
            </div>
          )}

          {/* Sign up link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link
              href="/signup"
              className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
            >
              Sign up
            </Link>
          </div>

          {/* DIVIDER */}
          {/* <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="px-3 text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div> */}

          {/* OAUTH */}
          {/* <div className="space-y-3">
            <Button variant="outline" className="w-full gap-2">
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5"
              />
              Continue with Google
            </Button>

            <Button variant="outline" className="w-full gap-2">
              <img
                src="https://www.svgrepo.com/show/512317/github-142.svg"
                className="w-5"
              />
              Continue with GitHub
            </Button>
          </div> */}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Placement Portal Platform
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
