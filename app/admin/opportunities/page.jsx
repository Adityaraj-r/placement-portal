"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { getAllOpportunities } from "@/app/actions/opportunities.actions";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    async function getData() {
      try {
        const temp = await getAllOpportunities();
        if (temp?.success === false) setLoadFailed(true);
        setOpportunities(temp.data ?? []);
      } catch (error) {
        console.log(error);
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, []);

  return (
    <div className="w-full max-w-7xl space-y-8">
      {/* Header */}
      <PageHeader
        title="Placement Drives"
        description="Create and manage placement opportunities."
        actions={
        <Link href="/admin/opportunities/new">
          <Button className="font-medium">+ Create Drive</Button>
        </Link>
        }
      />

      {/* List */}
      {loading ? <LoadingState label="Loading placement drives">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <Card key={item}><CardContent className="space-y-4 px-6 py-5"><div className="h-5 w-1/2 animate-pulse rounded bg-muted" /><div className="h-4 w-1/3 animate-pulse rounded bg-muted" /><div className="h-20 animate-pulse rounded bg-muted" /><div className="h-9 animate-pulse rounded bg-muted" /></CardContent></Card>)}</div>
      </LoadingState> : loadFailed ? <ErrorState title="Unable to load placement drives" description="Something went wrong while retrieving placement drive data." /> : opportunities.length === 0 ? <EmptyState title="No placement drives yet" description="There are currently no placement drives to display." action={<Link href="/admin/opportunities/new"><Button className="font-medium">+ Create Drive</Button></Link>} /> : <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {opportunities.map((opp) => (
          <Card
            key={opp.id}
          className="border-border bg-card transition-shadow hover:shadow-md"
          >
            <CardContent className="px-6 py-5">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-primary">{opp?.company_name}</p>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {opp?.role}
                    </h2>
                  </div>
                  {opp?.status ? <StatusBadge status={opp.status} className="max-w-32" /> : null}
                </div>

                {/* Description */}
                {opp?.description && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {opp.description}
                  </p>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Eligibility
                    </Label>
                    <p className="mt-1 line-clamp-1 text-sm text-foreground">
                      {Array.isArray(opp?.allowed_departments) && opp.allowed_departments.length
                        ? opp.allowed_departments.join(", ")
                        : "Departments not specified"}
                      {opp?.min_cgpa != null ? ` · CGPA ${opp.min_cgpa}+` : ""}
                      {` · Max backlogs ${opp?.max_backlogs ?? 0}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Deadline
                    </Label>
                    <p className="mt-1 text-sm text-foreground">
                      {opp?.deadline
                        ? new Date(opp.deadline)
                            .toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                        : "No deadline"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
                  <Link href={`/admin/opportunities/${opp.id}/applicants`} className="w-full sm:flex-1">
                    <Button className="w-full" size="sm">
                      View applications
                    </Button>
                  </Link>
                  <Link href={`/admin/opportunities/${opp.id}/edit`} className="w-full sm:w-auto">
                    <Button className="w-full" variant="outline" size="sm">
                      Configure drive
                    </Button>
                  </Link>
                  {/* <Button variant="destructive" size="sm">
                    Close
                  </Button> */}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>}
    </div>
  );
}
