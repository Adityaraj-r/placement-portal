"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOpportunityById } from "@/app/actions/opportunities.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OpportunityDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await getOpportunityById(id);
      if (!active) return;
      if (result?.success && result.data?.status === "published") setDrive(result.data);
      else setDrive(null);
      setLoading(false);
    }
    if (id) load();
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="mx-auto max-w-3xl p-8" aria-live="polite">Loading placement drive…</main>;
  if (!drive) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Placement drive unavailable</h1>
        <p className="text-muted-foreground">This drive may no longer be published.</p>
        <Button onClick={() => router.push("/opportunities")}>Back to published drives</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link href="/opportunities" className="text-sm text-blue-600 hover:underline">← Published drives</Link>
      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-blue-600">{drive.company_name}</p>
          <CardTitle className="text-3xl">{drive.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {drive.description && <section className="space-y-2"><h2 className="font-semibold">Role details</h2><p className="whitespace-pre-wrap text-sm text-slate-700">{drive.description}</p></section>}
          <section className="grid gap-4 sm:grid-cols-2">
            <p><span className="font-medium">Company: </span>{drive.company_name}</p>
            {drive.companies?.industry && <p><span className="font-medium">Industry: </span>{drive.companies.industry}</p>}
            {drive.location && <p><span className="font-medium">Location: </span>{drive.location}</p>}
            {drive.companies?.website && <p><span className="font-medium">Website: </span><a className="text-blue-600 underline" href={drive.companies.website} target="_blank" rel="noreferrer">{drive.companies.website}</a></p>}
            {drive.package_lpa != null && <p><span className="font-medium">Package: </span>{drive.package_lpa} LPA</p>}
            <p><span className="font-medium">Registration deadline: </span>{new Date(drive.registration_deadline).toLocaleString()}</p>
          </section>
          <section className="space-y-2 border-t pt-4">
            <h2 className="font-semibold">Eligibility</h2>
            <p className="text-sm text-slate-700">
              {Array.isArray(drive.allowed_departments) && drive.allowed_departments.length ? drive.allowed_departments.join(", ") : "Departments not specified"}
              {drive.min_cgpa != null ? ` · Minimum CGPA ${drive.min_cgpa}` : ""}
              {` · Maximum backlogs ${drive.max_backlogs ?? 0}`}
            </p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
