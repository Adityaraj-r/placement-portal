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
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

export default function OpportunityDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [applicationCheck, setApplicationCheck] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [result, eligibility] = await Promise.all([
          getOpportunityById(id),
          getMyApplicationEligibility(id),
        ]);
        if (!active) return;
        if (result?.success && result.data?.status === "published") setDrive(result.data);
        else {
          setDrive(null);
          if (result?.success === false && !result.error?.toLowerCase().includes("not found or unavailable")) {
            setLoadFailed(true);
          }
        }
        if (eligibility?.success) setApplicationCheck(eligibility);
        else setApplicationCheck({ eligible: false, error: "Could not check application eligibility" });
      } catch {
        if (active) setLoadFailed(true);
      } finally {
        if (active) setLoading(false);
      }
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

  if (loading) return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10"><LoadingState label="Loading placement opportunity"><div className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6"><div className="h-7 w-2/3 animate-pulse rounded bg-muted" /><div className="h-4 w-1/3 animate-pulse rounded bg-muted" /><div className="h-36 animate-pulse rounded bg-muted" /></div></LoadingState></main>;
  if (loadFailed) {
    return <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10"><PageHeader title="Opportunity unavailable" description="Placement opportunity details could not be loaded." /><ErrorState title="Unable to load this opportunity" description="Something went wrong while retrieving this placement opportunity." /><Button onClick={() => router.push("/opportunities")}>Back to published drives</Button></main>;
  }
  if (!drive) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader title="Placement opportunity unavailable" description="This opportunity may no longer be published." />
        <EmptyState title="No placement opportunity found" description="This placement opportunity is unavailable or is no longer published." />
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
