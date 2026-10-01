"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { getAllOpportunities } from "@/app/actions/opportunities.actions";
import PageHeader from "@/components/PageHeader";

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState([]);

  useEffect(() => {
    async function getData() {
      try {
        const temp = await getAllOpportunities();
        setOpportunities(temp.data ?? []);
      } catch (error) {
        console.log(error);
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {opportunities.map((opp) => (
          <Card
            key={opp.id}
          className="border-border bg-card transition-shadow hover:shadow-md"
          >
            <CardContent className="px-6 py-5">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {opp?.role}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {opp?.company_name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      opp?.status === "published"
                        ? "default"
                        : "secondary"
                    }
                    className="shrink-0"
                  >
                    {opp?.status}
                  </Badge>
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
                <div className="flex items-center gap-2 pt-2">
                  <Link href={`/admin/opportunities/${opp.id}/applicants`} className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                      View applications
                    </Button>
                  </Link>
                  <Link href={`/admin/opportunities/${opp.id}/edit`}>
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
      </div>
    </div>
  );
}
