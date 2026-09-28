"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, Calendar, Briefcase } from "lucide-react";
import { applyToOpportunity } from "@/app/actions/applications.actions";
import { useState } from "react";
import { toast } from "sonner";


export default function OpportunityCard({ opportunity }) {
  const [applying, setApplying] = useState(false);
  async function handleApply(id) {
    setApplying(true);
    try {
      const result = await applyToOpportunity(id);
      if (result?.success) {
        toast.success("Application submitted successfully!");
      } else {
        toast.error(result?.error || "Failed to submit application");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
      console.error("Error applying:", err);
    } finally {
      setApplying(false);
    }
  }

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
    <Card className="h-full border border-slate-200/80 bg-white hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden group flex flex-col">
      <CardHeader className="p-0">
        <div className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Briefcase
                  size={18}
                  className="text-blue-600 shrink-0 mt-0.5"
                />
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {opportunity.role}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
                <Building2 size={14} />
                <span className="truncate">{opportunity.company_name}</span>
              </div>
            </div>
            {opportunity.status && (
              <Badge
                variant={opportunity.status === "published" ? "default" : "secondary"}
                className="shrink-0"
              >
                {opportunity.status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 px-6 pb-6 space-y-4">
        {/* Description */}
        {opportunity.description && (
          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
            {opportunity.description}
          </p>
        )}

        {/* Details */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          {opportunity.location && (
            <div className="flex items-start gap-2 text-sm">
              <GraduationCap
                size={16}
                className="text-slate-400 mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">Location: </span>
                <span className="text-gray-700">{opportunity.location}</span>
              </div>
            </div>
          )}

          {opportunity.package_lpa != null && (
            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">Package: </span>
              {opportunity.package_lpa} LPA
            </p>
          )}

          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Eligibility: </span>
            {Array.isArray(opportunity.allowed_departments) && opportunity.allowed_departments.length
              ? opportunity.allowed_departments.join(", ")
              : "Departments not specified"}
            {opportunity.min_cgpa != null ? ` · CGPA ${opportunity.min_cgpa}+` : ""}
            {` · Max backlogs ${opportunity.max_backlogs ?? 0}`}
          </p>

          {opportunity.deadline && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} className="text-slate-400 shrink-0" />
              <span className="text-gray-700">
                <span className="font-medium text-gray-900">Deadline: </span>
                {formatDate(opportunity.deadline)}
              </span>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="mt-auto pt-3 border-t border-slate-100">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            onClick={() => handleApply(opportunity.id)}
            disabled={applying}
          >
            {applying ? "Applying..." : "Apply Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
