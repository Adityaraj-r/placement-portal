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
import { useEffect, useMemo, useState } from "react";
import { getApplicantsByDrive, updateApplicationStatus } from "@/app/actions/applications.actions";
import { applicationTransitions, PHASE_3B_APPLICATION_STATUSES } from "@/lib/applications/application-rules.mjs";
import { getApplicantResumeSignedUrl } from "@/app/actions/resume.actions";
import { getOpportunityById } from "@/app/actions/opportunities.actions";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const APPLICATION_STATUSES = PHASE_3B_APPLICATION_STATUSES;

export default function ApplicantsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [applicants, setApplicants] = useState([]);
  const [opportunity, setOpportunity] = useState(null);
  const [openingResumeId, setOpeningResumeId] = useState(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [loadingApplicants, setLoadingApplicants] = useState(true);

  const filteredApplicants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return applicants.filter((app) => {
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      const searchableValues = [
        app.profiles?.name,
        app.profiles?.email,
        app.student_profiles?.college_id,
        app.student_id,
      ];
      return searchableValues.some((value) =>
        String(value ?? "").toLocaleLowerCase().includes(query),
      );
    });
  }, [applicants, search, statusFilter]);

  async function handleStatusChange(applicationId, status) {
    setUpdatingApplicationId(applicationId);
    try {
      const result = await updateApplicationStatus(applicationId, id, status);
      if (!result?.success) {
        toast.error(result?.error || "Could not update application status");
        return;
      }

      setApplicants((current) => current.map((app) =>
        app.id === applicationId ? { ...app, status: result.data.status } : app,
      ));
      toast.success("Application status updated.");
      const refreshedApplicants = await getApplicantsByDrive(id);
      if (refreshedApplicants?.success) {
        setApplicants(refreshedApplicants.data ?? []);
      }
      router.refresh();
    } catch {
      toast.error("Could not update application status");
    } finally {
      setUpdatingApplicationId(null);
    }
  }

  async function handleViewResume(studentProfileId) {
    setOpeningResumeId(studentProfileId);
    try {
      const result = await getApplicantResumeSignedUrl(id, studentProfileId);
      if (!result?.success || !result.url) {
        toast.error(result?.error || "Could not open this applicant's resume");
        return;
      }
      window.location.assign(result.url);
    } catch {
      toast.error("Could not open this applicant's resume");
    } finally {
      setOpeningResumeId(null);
    }
  }

  useEffect(() => {
    async function getData() {
      setLoadingApplicants(true);
      try {
        const [appsRes, oppRes] = await Promise.all([
          getApplicantsByDrive(id),
          getOpportunityById(id),
        ]);
        if (appsRes?.success) setApplicants(appsRes.data ?? []);
        else toast.error(appsRes?.error || "Could not load applicants");
        if (oppRes?.data) setOpportunity(oppRes.data);
        else if (oppRes?.error) toast.error(oppRes.error);
      } catch {
        toast.error("Could not load applicant information");
      } finally {
        setLoadingApplicants(false);
      }
    }

    if (id) getData();
  }, [id]);

  function downloadFilteredApplicants() {
    const headers = [
      "Name",
      "Email",
      "College ID",
      "Department",
      "Degree",
      "Graduation Year",
      "CGPA",
      "Backlogs",
      "Application Status",
      "Applied Date",
    ];
    const escapeCsv = (value) => {
      const text = String(value ?? "");
      const spreadsheetSafeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${spreadsheetSafeText.replace(/"/g, '""')}"`;
    };
    const rows = filteredApplicants.map((app) => [
      app.profiles?.name,
      app.profiles?.email,
      app.student_profiles?.college_id,
      app.student_profiles?.department,
      app.student_profiles?.degree,
      app.student_profiles?.graduation_year,
      app.student_profiles?.cgpa,
      app.student_profiles?.backlogs,
      app.status,
      app.applied_at,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeDriveId = String(id || "drive").replace(/[^a-z0-9-]/gi, "-");
    link.href = url;
    link.download = `applicants-${safeDriveId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "-";

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
                        opportunity.status === "published"
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, college ID, or student ID"
            aria-label="Search applicants"
            className="sm:max-w-md"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter applicants by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {APPLICATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <TableHead className="font-semibold">Details</TableHead>
                <TableHead className="font-semibold">Resume</TableHead>
              </TableRow>
            </TableHeader>

          <TableBody>
            {filteredApplicants.map((app) => {
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
                    {applicationTransitions(app.status).length ? (
                      <Select
                        value={app.status || "applied"}
                        onValueChange={(status) => handleStatusChange(app.id, status)}
                        disabled={updatingApplicationId === app.id}
                      >
                        <SelectTrigger className="w-36" aria-label={`Application status for ${app.profiles?.name || "applicant"}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={app.status} disabled>Current: {app.status}</SelectItem>
                          {applicationTransitions(app.status).map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <Badge variant="secondary">{app.status}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setSelectedApplicant(app)}>
                      Details
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!app.student_id || openingResumeId === app.student_id}
                      onClick={() => handleViewResume(app.student_id)}
                    >
                      {openingResumeId === app.student_id ? "Opening..." : "View Resume"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loadingApplicants && filteredApplicants.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  {applicants.length === 0
                    ? "No applicants have applied to this placement drive yet."
                    : search.trim() && statusFilter !== "all"
                    ? "No applicants match this search and status."
                    : search.trim()
                    ? "No applicants match your search."
                    : "No applicants match the selected status."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" className="font-medium" onClick={downloadFilteredApplicants} disabled={filteredApplicants.length === 0}>
            Download CSV
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(selectedApplicant)} onOpenChange={(open) => { if (!open) setSelectedApplicant(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedApplicant && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedApplicant.profiles?.name || "Applicant details"}</DialogTitle>
                <DialogDescription>{selectedApplicant.profiles?.email || "Applicant information"}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {[
                  ["College ID", selectedApplicant.student_profiles?.college_id],
                  ["Department", selectedApplicant.student_profiles?.department],
                  ["Degree", selectedApplicant.student_profiles?.degree],
                  ["Graduation year", selectedApplicant.student_profiles?.graduation_year],
                  ["CGPA", selectedApplicant.student_profiles?.cgpa],
                  ["Backlogs", selectedApplicant.student_profiles?.backlogs],
                  ["Application status", selectedApplicant.status],
                  ["Applied date", formatDate(selectedApplicant.applied_at)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="mt-1 text-gray-900">{value ?? "-"}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Skills</dt>
                  <dd className="mt-1 text-gray-900">
                    {Array.isArray(selectedApplicant.student_profiles?.skills)
                      ? selectedApplicant.student_profiles.skills.join(", ") || "-"
                      : selectedApplicant.student_profiles?.skills || "-"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
