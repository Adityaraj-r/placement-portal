"use client";

import { useEffect, useState } from "react";
import { getPlacements } from "@/app/actions/placement.actions";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { StatusBadge } from "@/components/ui/badge";

export default function PlacementsPage() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPlacements().then((result) => {
      if (!active) return;
      if (!result?.success) setError(result?.error || "Could not load placements");
      else setPlacements(result.data || []);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError("Could not load placements");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <section className="w-full max-w-7xl space-y-8">
      <PageHeader title="Placements" description="Placement records created from accepted offers." />
      {loading ? <LoadingState label="Loading placements"><div className="grid gap-4" aria-hidden="true">{[0, 1, 2].map((item) => <Card key={item}><CardContent className="grid gap-3 p-5 sm:grid-cols-2">{[0, 1, 2, 3, 4, 5].map((line) => <div key={line} className="h-4 animate-pulse rounded bg-muted" />)}</CardContent></Card>)}</div></LoadingState> : error ? <ErrorState title="Unable to load placements" description="Something went wrong while retrieving placement records." /> : placements.length === 0 ? (
        <EmptyState title="No placements recorded yet" description="Accepted offers have not created any placement records yet." />
      ) : (
        <div className="grid gap-4">
          {placements.map((placement) => (
            <Card key={placement.id} className="border-border bg-card">
              <CardContent className="grid gap-x-8 gap-y-5 p-5 text-sm sm:grid-cols-2 sm:p-6">
                <div className="min-w-0 space-y-1 border-b border-border pb-4 sm:border-0 sm:pb-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student</p>
                  <p className="break-words font-semibold text-foreground">{placement.student?.full_name || placement.student?.email || "-"}</p>
                </div>
                <div className="min-w-0 space-y-1 border-b border-border pb-4 sm:border-0 sm:pb-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Company</p>
                  <p className="break-words font-semibold text-foreground">{placement.company?.name || "-"}</p>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</p>
                  <p className="break-words text-foreground">{placement.job_title || placement.drive?.title || "-"}</p>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Package</p>
                  <p className="text-foreground">{placement.package_lpa ?? "-"} LPA</p>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Offer status</p>
                  <StatusBadge status={placement.offer_status || "accepted"} />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Joining date</p>
                  <p className="text-foreground">{placement.joining_date || "-"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
