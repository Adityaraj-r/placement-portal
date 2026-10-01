"use client";

import { useEffect, useState } from "react";
import { getPlacements } from "@/app/actions/placement.actions";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

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
              <CardContent className="grid gap-2 p-5 text-sm sm:grid-cols-2">
                <p><span className="font-medium">Student:</span> {placement.student?.full_name || placement.student?.email || "-"}</p>
                <p><span className="font-medium">Company:</span> {placement.company?.name || "-"}</p>
                <p><span className="font-medium">Role:</span> {placement.job_title || placement.drive?.title || "-"}</p>
                <p><span className="font-medium">Package:</span> {placement.package_lpa ?? "-"} LPA</p>
                <p><span className="font-medium">Status:</span> {placement.offer_status || "accepted"}</p>
                <p><span className="font-medium">Joining date:</span> {placement.joining_date || "-"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
