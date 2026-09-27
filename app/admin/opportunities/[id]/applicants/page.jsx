"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { getApplicantsByOpportunity } from "@/app/actions/applications.actions";
import { getOpportunityById } from "@/app/actions/opportunities.actions";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/supabaseClient";

export default function ApplicantsPage() {
  const { id } = useParams();

  const [applicants, setApplicants] = useState([]);
  const [opportunity, setOpportunity] = useState(null);

  useEffect(() => {
    async function getData() {
      const appsRes = await getApplicantsByOpportunity(id);
      if (appsRes?.success) {
        setApplicants(appsRes.data ?? []);
      }

      const oppRes = await getOpportunityById(id);
      if (oppRes?.data) {
        setOpportunity(oppRes.data);
      }
    }

    if (id) getData();
  }, [id]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Opportunity Header */}
      {opportunity && (
        <Card className="border border-slate-200/80 bg-white rounded-xl overflow-hidden">
          <CardContent className="px-6 py-5">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {opportunity.role}
                </h2>
                <p className="text-sm font-medium text-blue-600">
                  {opportunity.company_name}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Status
                  </Label>
                  <div className="mt-1.5">
                    <Badge
                      variant={
                        opportunity.status === "open"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {opportunity.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Deadline
                  </Label>
                  <p className="text-sm text-gray-700 mt-1.5">
                    {opportunity.deadline
                      ? new Date(opportunity.deadline).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "No deadline"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applicants Section */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Applicants</h1>
          <p className="text-muted-foreground text-base">
            Review and manage applications for this opportunity.
          </p>
        </div>

        <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">College</TableHead>
                <TableHead className="font-semibold">Branch</TableHead>
                <TableHead className="font-semibold">Skills</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>

          <TableBody>
            {applicants.map((app) => {
              const ResumeViewButton = ({ resumeUrl }) => {
                const publicUrl = useMemo(() => {
                  if (!resumeUrl) return null;
                  try {
                    const supabase = createClient();
                    const { data } = supabase.storage
                      .from("resumes")
                      .getPublicUrl(resumeUrl);
                    return data?.publicUrl || null;
                  } catch (error) {
                    console.error("Error getting resume URL:", error);
                    return null;
                  }
                }, [resumeUrl]);

                if (!publicUrl) return null;

                return (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(publicUrl, "_blank", "noopener,noreferrer")
                    }
                    className="gap-1.5"
                  >
                    <FileText size={14} />
                    View Resume
                  </Button>
                );
              };

              return (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">
                    {app.profiles?.name || "-"}
                  </TableCell>
                  <TableCell>{app.profiles?.email || "-"}</TableCell>
                  <TableCell>{app.profiles?.college || "-"}</TableCell>
                  <TableCell>{app.profiles?.branch || "-"}</TableCell>
                  <TableCell>
                    {Array.isArray(app.profiles?.skills)
                      ? app.profiles.skills.slice(0, 2).join(", ") +
                        (app.profiles.skills.length > 2
                          ? ` +${app.profiles.skills.length - 2}`
                          : "")
                      : typeof app.profiles?.skills === "string"
                      ? app.profiles.skills.split(",").slice(0, 2).join(", ") +
                        (app.profiles.skills.split(",").length > 2
                          ? ` +${app.profiles.skills.split(",").length - 2}`
                          : "")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        app.status === "shortlisted"
                          ? "default"
                          : app.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ResumeViewButton
                      resumeUrl={app.profiles?.resume_url}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" className="font-medium">
            Download CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
