"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { getAllOpportunities } from "@/app/actions/opportunities.actions";

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
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Opportunities
          </h1>
          <p className="text-muted-foreground text-base">
            Manage and review all posted opportunities.
          </p>
        </div>
        <Link href="/admin/opportunities/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            + New Opportunity
          </Button>
        </Link>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {opportunities.map((opp) => (
          <Card
            key={opp.id}
            className="border border-slate-200/80 bg-white hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden group"
          >
            <CardContent className="px-6 py-5">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {opp?.role}
                    </h3>
                    <p className="text-sm font-medium text-blue-600 mt-1">
                      {opp?.company_name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      opp?.status === "active"
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
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {opp.description}
                  </p>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Required Skills
                    </Label>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-1">
                      {opp?.required_skills || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Deadline
                    </Label>
                    <p className="text-sm text-gray-700 mt-1">
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
                  <Link
                    href={`/admin/opportunities/${opp.id}/applicants`}
                    className="flex-1"
                  >
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      View Applications
                    </Button>
                  </Link>
                  <Link href={`/admin/opportunities/${opp.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
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
