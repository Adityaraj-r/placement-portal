"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "reset_failed") {
      setError("That reset link is invalid or expired. Request a new password reset link.");
    }
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", "/reset-password");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: callback.toString(),
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch {
      // Use the same response for unknown accounts and request errors.
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-white to-blue-50 px-4">
    <Card className="w-full max-w-md rounded-2xl shadow-xl">
      <CardHeader className="text-center"><CardTitle>Reset your password</CardTitle><CardDescription>We’ll email you a secure reset link.</CardDescription></CardHeader>
      <CardContent>
        {sent ? <p className="text-sm text-center" role="status">If an account matches that email, a password reset link is on its way. Check your inbox.</p> : <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-invalid={Boolean(error)} />{error && <p className="text-sm text-destructive">{error}</p>}</div>
          <Button className="w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
        </form>}
        <p className="mt-5 text-center text-sm"><Link className="text-blue-600 underline" href="/login">Back to login</Link></p>
      </CardContent>
    </Card>
  </div>;
}
