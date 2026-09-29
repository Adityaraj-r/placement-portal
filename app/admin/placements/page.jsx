"use client";

import { useEffect, useState } from "react";
import { getPlacements } from "@/app/actions/placement.actions";
import { Card, CardContent } from "@/components/ui/card";

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
    <section className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Placements</h1>
        <p className="text-muted-foreground">Placement records created from accepted offers.</p>
      </header>
      {loading ? <p aria-live="polite">Loading placements…</p> : error ? <p role="alert">{error}</p> : placements.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No accepted offers have created placement records yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {placements.map((placement) => (
            <Card key={placement.id}>
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
