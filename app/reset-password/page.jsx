"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/app/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await updatePassword(password, confirmation);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setPassword("");
      setConfirmation("");
      router.refresh();
    } catch {
      setError("This reset link is invalid or expired. Request a new link.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-white to-blue-50 px-4">
    <Card className="w-full max-w-md rounded-2xl shadow-xl">
      <CardHeader className="text-center"><CardTitle>Choose a new password</CardTitle><CardDescription>Use at least 8 characters.</CardDescription></CardHeader>
      <CardContent>
        {success ? <div className="space-y-4 text-center" role="status"><p>Your password has been updated. Please log in with your new password.</p><Button className="w-full" onClick={() => router.replace("/login")}>Go to login</Button></div> : <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1"><Label htmlFor="password">New password</Label><Input id="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
        </form>}
        <p className="mt-5 text-center text-sm"><Link className="text-blue-600 underline" href="/login">Back to login</Link></p>
      </CardContent>
    </Card>
  </div>;
}
