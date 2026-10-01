"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/app/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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

  return <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-8 sm:px-6">
    <Card className="w-full max-w-md rounded-xl border-border shadow-sm">
      <CardHeader className="text-center"><CardTitle>Choose a new password</CardTitle><CardDescription>Use at least 8 characters.</CardDescription></CardHeader>
      <CardContent>
        {success ? <div className="space-y-4 text-center" role="status"><p>Your password has been updated. Please log in with your new password.</p><Button className="w-full" onClick={() => router.replace("/login")}>Go to login</Button></div> : <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1"><Label htmlFor="password">New password <span className="text-destructive" aria-hidden="true">*</span></Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required className="pr-12" /><button type="button" aria-label={showPassword ? "Hide new password" : "Show new password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}</button></div><p className="text-sm text-muted-foreground">Use at least 8 characters.</p></div>
          <div className="space-y-1"><Label htmlFor="confirm-password">Confirm password <span className="text-destructive" aria-hidden="true">*</span></Label><div className="relative"><Input id="confirm-password" type={showConfirmation ? "text" : "password"} autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required className="pr-12" /><button type="button" aria-label={showConfirmation ? "Hide password confirmation" : "Show password confirmation"} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((value) => !value)} className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{showConfirmation ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}</button></div></div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Updating…</> : "Update password"}</Button>
        </form>}
        <p className="mt-5 text-center text-sm"><Link className="text-primary underline underline-offset-4" href="/login">Back to login</Link></p>
      </CardContent>
    </Card>
  </main>;
}
