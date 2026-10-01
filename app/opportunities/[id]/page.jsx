"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOpportunityById } from "@/app/actions/opportunities.actions";
import { applyToOpportunity, getMyApplicationEligibility } from "@/app/actions/applications.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

export default function OpportunityDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicationCheck, setApplicationCheck] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const [result, eligibility] = await Promise.all([
        getOpportunityById(id),
        getMyApplicationEligibility(id),
      ]);
      if (!active) return;
      if (result?.success && result.data?.status === "published") setDrive(result.data);
      else setDrive(null);
      if (eligibility?.success) setApplicationCheck(eligibility);
      else setApplicationCheck({ eligible: false, error: eligibility?.error || "Could not check application eligibility" });
      setLoading(false);
    }
    if (id) load();
    return () => { active = false; };
  }, [id]);

  async function handleApply() {
    if (!applicationCheck?.eligible || submitting) return;
    setSubmitting(true);
    try {
      const result = await applyToOpportunity(id);
      if (!result?.success) {
        toast.error(result?.error || "Could not submit your application");
        const eligibility = await getMyApplicationEligibility(id);
        if (eligibility?.success) setApplicationCheck(eligibility);
        return;
      }
      setApplicationCheck({ eligible: false, applicationStatus: "applied", error: null });
      toast.success("Application submitted successfully.");
    } catch {
      toast.error("Could not submit your application");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-3xl p-8" aria-live="polite">Loading placement drive…</main>;
  if (!drive) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader title="Placement drive unavailable" description="This drive may no longer be published." />
        <Button onClick={() => router.push("/opportunities")}>Back to published drives</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/opportunities" className="text-sm font-medium text-primary hover:underline">← Published drives</Link>
      <PageHeader title={drive.title} description={drive.company_name} />
      <Card>
        <CardContent className="space-y-6">
          {drive.description && <section className="space-y-2"><h2 className="font-semibold">Role details</h2><p className="whitespace-pre-wrap text-sm leading-6 text-foreground/85">{drive.description}</p></section>}
          <section className="grid gap-4 sm:grid-cols-2">
            <p><span className="font-medium">Company: </span>{drive.company_name}</p>
            {drive.companies?.industry && <p><span className="font-medium">Industry: </span>{drive.companies.industry}</p>}
            {drive.location && <p><span className="font-medium">Location: </span>{drive.location}</p>}
            {drive.companies?.website && <p><span className="font-medium">Website: </span><a className="text-primary underline" href={drive.companies.website} target="_blank" rel="noreferrer">{drive.companies.website}</a></p>}
            {drive.package_lpa != null && <p><span className="font-medium">Package: </span>{drive.package_lpa} LPA</p>}
            <p><span className="font-medium">Registration deadline: </span>{new Date(drive.registration_deadline).toLocaleString()}</p>
          </section>
          <section className="space-y-2 border-t pt-4">
            <h2 className="font-semibold">Eligibility</h2>
            <p className="text-sm text-foreground/85">
              {Array.isArray(drive.allowed_departments) && drive.allowed_departments.length ? drive.allowed_departments.join(", ") : "Departments not specified"}
              {drive.min_cgpa != null ? ` · Minimum CGPA ${drive.min_cgpa}` : ""}
              {` · Maximum backlogs ${drive.max_backlogs ?? 0}`}
            </p>
          </section>
          <section className="space-y-3 border-t pt-4" aria-live="polite">
            {applicationCheck?.applicationStatus ? (
              <p className="font-medium">Your application status: {applicationCheck.applicationStatus}</p>
            ) : applicationCheck?.eligible ? (
              <p className="text-sm text-green-700">Your profile meets the listed eligibility requirements.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-amber-800">{applicationCheck?.error || "Checking application eligibility…"}</p>
                {applicationCheck?.error?.toLowerCase().includes("profile") || applicationCheck?.error?.toLowerCase().includes("resume") ? (
                  <Link className="text-sm text-primary underline" href="/profile">Review your profile</Link>
                ) : null}
              </div>
            )}
            <Button onClick={handleApply} disabled={!applicationCheck?.eligible || submitting}>
              {submitting ? "Submitting…" : "Apply to this drive"}
            </Button>
            <Link className="ml-3 text-sm text-primary underline" href="/applications">My Applications</Link>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
