"use client";

import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProfile, getProfileByUserId } from "../actions/profile.actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter()
  const [errors, setErrors] = useState({ email: "", password: "" });
  // ✅ FORM STATE
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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
    const result = await signIn(email, password);
    if (result?.success) {
      toast.success("Logged in successfully.");
    } else if (result?.message) {
      toast.error(result.message);
    } else {
      toast.error("Login failed. Please try again.");
    }
    setLoading(false);
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
        return { success: false, message: error.message };
      }

      console.log("Login success:", data);

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
        console.error("Error fetching profile:", profileError.message);
        return { success: false, message: "Error fetching user profile." };
      }

      const userRole = profile?.role || "student";

      // Role-based routing
      if (userRole === "admin") {
        router.push("/admin/dashboard");
        return { success: true };
      } else if (userRole === "tpo") {
        // Note: Dedicated /tpo dashboard route will be created in later phases
        router.push("/opportunities");
        return { success: true };
      } else if (userRole === "coordinator") {
        // Note: Dedicated /coordinator dashboard route will be created in later phases
        router.push("/opportunities");
        return { success: true };
      } else {
        router.push("/opportunities");
        return { success: true };
      }
    } catch (err) {
      console.log(err);
      return { success: false, message: err?.message || "Unexpected error" };
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-white to-blue-50 px-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Coding Savvy</CardTitle>
          <CardDescription>Login to your account</CardDescription>
        </CardHeader>

        <CardContent>
          {/* ROLE */}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* EMAIL */}
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input
                type="email"
                name="email"
                placeholder="john@gmail.com"
                value={formData.email}
                onChange={handleChange}
                aria-invalid={!!errors.email}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email}</p>
              ) : null}
            </div>

            {/* PASSWORD */}
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pr-10"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password}</p>
              ) : null}
            </div>

            {/* REMEMBER */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember">Remember me</Label>
              </div>
              <button type="button" className="text-blue-600 hover:underline">
                Forgot password?
              </button>
            </div>

            {/* SUBMIT */}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>

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
            Coding Savvy Platform
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
