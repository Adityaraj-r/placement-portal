"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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

  return <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-8 sm:px-6">
    <Card className="w-full max-w-md rounded-xl border-border shadow-sm">
      <CardHeader className="text-center"><CardTitle>Reset your password</CardTitle><CardDescription>We’ll email you a secure reset link.</CardDescription></CardHeader>
      <CardContent>
        {sent ? <p className="text-sm text-center" role="status">If an account matches that email, a password reset link is on its way. Check your inbox.</p> : <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1"><Label htmlFor="email">Email address <span className="text-destructive" aria-hidden="true">*</span></Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-invalid={Boolean(error)} aria-describedby={error ? "email-error" : undefined} />{error && <p id="email-error" className="text-sm text-destructive" role="alert">{error}</p>}</div>
          <Button className="w-full" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…</> : "Send reset link"}</Button>
        </form>}
        <p className="mt-5 text-center text-sm"><Link className="text-primary underline underline-offset-4" href="/login">Back to login</Link></p>
      </CardContent>
    </Card>
  </main>;
}
