"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, Calendar, Briefcase } from "lucide-react";
import Link from "next/link";

export default function OpportunityCard({ opportunity }) {
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-xl border-border bg-card transition-shadow hover:shadow-md">
      <CardHeader className="p-0">
        <div className="space-y-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex min-w-0 items-center gap-2 text-sm font-medium text-primary">
                <Building2 size={14} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{opportunity.company_name}</span>
              </div>
              <div className="flex min-w-0 items-start gap-2">
                <Briefcase size={18} aria-hidden="true" className="mt-1 shrink-0 text-muted-foreground" />
                <h3 className="line-clamp-2 min-w-0 text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
                  {opportunity.role}
                </h3>
              </div>
            </div>
            {opportunity.status ? <StatusBadge status={opportunity.status} className="max-w-28" /> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
        {/* Description */}
        {opportunity.description && (
          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
            {opportunity.description}
          </p>
        )}

        {/* Details */}
        <div className="space-y-3 border-t border-border pt-4">
          {opportunity.location && (
            <div className="flex items-start gap-2 text-sm">
              <GraduationCap
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-muted-foreground"
              />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">Location: </span>
                <span className="text-muted-foreground">{opportunity.location}</span>
              </div>
            </div>
          )}

          {opportunity.package_lpa != null && (
            <p className="text-sm text-gray-700">
              <span className="font-medium text-foreground">Package: </span>
              {opportunity.package_lpa} LPA
            </p>
          )}

          <p className="text-sm text-gray-700">
            <span className="font-medium text-foreground">Eligibility: </span>
            {Array.isArray(opportunity.allowed_departments) && opportunity.allowed_departments.length
              ? opportunity.allowed_departments.join(", ")
              : "Departments not specified"}
            {opportunity.min_cgpa != null ? ` · CGPA ${opportunity.min_cgpa}+` : ""}
            {` · Max backlogs ${opportunity.max_backlogs ?? 0}`}
          </p>

          {opportunity.deadline && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">Deadline: </span>
                {formatDate(opportunity.deadline)}
              </span>
            </div>
          )}
        </div>

        {/* Drive detail link */}
        <div className="mt-auto border-t border-border pt-4">
          <Button asChild className="w-full font-medium">
            <Link href={`/opportunities/${opportunity.id}`}>View details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
