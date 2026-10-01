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
import PageHeader from "@/components/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { getApplicantsByDrive, updateApplicationStatus } from "@/app/actions/applications.actions";
import { applicationTransitions, PHASE_3C_APPLICATION_STATUSES } from "@/lib/applications/application-rules.mjs";
import {
  createPlacementOffer,
  getDriveLifecycle,
  saveInterviewEvaluation,
  scheduleApplicationInterview,
  transitionApplicationInterview,
  updateApplicationInterview,
} from "@/app/actions/lifecycle.actions";
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

const APPLICATION_STATUSES = PHASE_3C_APPLICATION_STATUSES;

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
  const [lifecycle, setLifecycle] = useState({ interviews: [], evaluations: [], offers: [], placements: [] });
  const [savingLifecycle, setSavingLifecycle] = useState(false);
  const [interviewForm, setInterviewForm] = useState({ scheduledAt: "", mode: "online", location: "", details: "" });
  const [evaluationForm, setEvaluationForm] = useState({ score: "", feedback: "", recommendation: "undecided" });
  const [offerAmount, setOfferAmount] = useState("");

  const refreshLifecycle = async () => {
    const result = await getDriveLifecycle(id);
    if (result?.success) setLifecycle(result.data);
    else toast.error(result?.error || "Could not load interview and offer details");
  };

  function getApplicantInterview(applicationId) {
    return lifecycle.interviews.find((interview) => interview.application_id === applicationId) || null;
  }

  function getInterviewEvaluation(interviewId) {
    return lifecycle.evaluations.find((evaluation) => evaluation.interview_id === interviewId) || null;
  }

  function getApplicantOffer(applicationId) {
    return lifecycle.offers.find((offer) => offer.application_id === applicationId) || null;
  }

  async function runLifecycleAction(action, successMessage) {
    setSavingLifecycle(true);
    try {
      const result = await action();
      if (!result?.success) {
        toast.error(result?.error || "Could not update placement lifecycle");
        return false;
      }
      toast.success(successMessage);
      await refreshLifecycle();
      const refreshedApplicants = await getApplicantsByDrive(id);
      if (refreshedApplicants?.success) setApplicants(refreshedApplicants.data ?? []);
      return true;
    } catch {
      toast.error("Could not update placement lifecycle");
      return false;
    } finally {
      setSavingLifecycle(false);
    }
  }

  async function handleScheduleInterview(event) {
    event.preventDefault();
    if (!selectedApplicant) return;
    const interview = getApplicantInterview(selectedApplicant.id);
    const action = interview
      ? () => updateApplicationInterview(id, interview.id, interviewForm)
      : () => scheduleApplicationInterview(id, selectedApplicant.id, interviewForm);
    await runLifecycleAction(action, interview ? "Interview updated." : "Interview scheduled.");
  }

  async function handleInterviewTransition(interview, status) {
    await runLifecycleAction(
      () => transitionApplicationInterview(id, interview.id, status),
      status === "completed" ? "Interview marked complete." : "Interview cancelled.",
    );
  }

  async function handleSaveEvaluation(event) {
    event.preventDefault();
    if (!selectedApplicant) return;
    const interview = getApplicantInterview(selectedApplicant.id);
    if (!interview) return;
    await runLifecycleAction(
      () => saveInterviewEvaluation(id, interview.id, evaluationForm),
      "Interview evaluation saved.",
    );
  }

  async function handleCreateOffer(event) {
    event.preventDefault();
    if (!selectedApplicant) return;
    const created = await runLifecycleAction(
      () => createPlacementOffer(id, selectedApplicant.id, { offeredCtc: offerAmount }),
      "Offer created.",
    );
    if (created) setOfferAmount("");
  }

  function openApplicantReview(app) {
    setSelectedApplicant(app);
    const interview = getApplicantInterview(app.id);
    const evaluation = interview ? getInterviewEvaluation(interview.id) : null;
    setInterviewForm(interview ? {
      scheduledAt: new Date(new Date(interview.scheduled_at).getTime() - new Date(interview.scheduled_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      mode: interview.mode,
      location: interview.location || "",
      details: interview.details || "",
    } : { scheduledAt: "", mode: "online", location: "", details: "" });
    setEvaluationForm(evaluation
      ? { score: String(evaluation.score), feedback: evaluation.feedback, recommendation: evaluation.recommendation }
      : { score: "", feedback: "", recommendation: "undecided" });
    const offer = getApplicantOffer(app.id);
    setOfferAmount(offer ? String(offer.offered_ctc) : "");
  }

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
      await refreshLifecycle();
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
        const lifecycleRes = await getDriveLifecycle(id);
        if (lifecycleRes?.success) setLifecycle(lifecycleRes.data);
        else toast.error(lifecycleRes?.error || "Could not load interview and offer details");
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
  const selectedInterview = selectedApplicant ? getApplicantInterview(selectedApplicant.id) : null;
  const selectedEvaluation = selectedInterview ? getInterviewEvaluation(selectedInterview.id) : null;
  const selectedOffer = selectedApplicant ? getApplicantOffer(selectedApplicant.id) : null;
  const selectedPlacement = selectedApplicant
    ? lifecycle.placements.find((placement) => placement.application_id === selectedApplicant.id)
    : null;

  return (
    <div className="w-full max-w-7xl space-y-8">
      {/* Opportunity Header */}
      {opportunity && (
        <Card className="border-border bg-card">
          <CardContent className="px-6 py-5">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {opportunity.role}
                </h2>
                <p className="text-sm font-medium text-primary">
                  {opportunity.company_name}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Deadline
                  </Label>
                  <p className="mt-1.5 text-sm text-foreground">
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
      <section className="space-y-6">
        <PageHeader
          title="Applicants"
          description="Review and manage applications for this placement drive."
          actions={
            <Button variant="outline" className="font-medium" onClick={downloadFilteredApplicants} disabled={filteredApplicants.length === 0}>
              Download CSV
            </Button>
          }
          className="border-0 pb-0"
        />

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

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">College</TableHead>
                <TableHead className="font-semibold">Branch</TableHead>
                <TableHead className="font-semibold">Skills</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Interview / offer</TableHead>
                <TableHead className="font-semibold">Details</TableHead>
                <TableHead className="font-semibold">Resume</TableHead>
              </TableRow>
            </TableHeader>

          <TableBody>
            {filteredApplicants.map((app) => {
              const interview = getApplicantInterview(app.id);
              const offer = getApplicantOffer(app.id);
              const placement = lifecycle.placements.find((item) => item.application_id === app.id);
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
                    {interview ? (
                      <div className="space-y-1">
                        <p className="text-xs">Interview: {interview.status}</p>
                        {offer ? <p className="text-xs">Offer: {offer.is_accepted === null ? "offered" : offer.is_accepted ? "accepted" : "rejected"}</p> : null}
                        {placement ? <p className="text-xs">Placement recorded</p> : null}
                        <Button variant="outline" size="sm" onClick={() => openApplicantReview(app)}>Manage lifecycle</Button>
                      </div>
                    ) : app.status === "shortlisted" || app.status === "selected" ? (
                      <Button variant="outline" size="sm" onClick={() => openApplicantReview(app)}>
                        {app.status === "shortlisted" ? "Schedule interview" : "Create offer"}
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">Available after shortlist</span>}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openApplicantReview(app)}>
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
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
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

      </section>

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
                    <dd className="mt-1 text-foreground">{value ?? "-"}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Skills</dt>
                  <dd className="mt-1 text-foreground">
                    {Array.isArray(selectedApplicant.student_profiles?.skills)
                      ? selectedApplicant.student_profiles.skills.join(", ") || "-"
                      : selectedApplicant.student_profiles?.skills || "-"}
                  </dd>
                </div>
              </dl>
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Interview</h3>
                {selectedInterview ? (
                  <div className="space-y-1 text-sm">
                    <p>Status: {selectedInterview.status}</p>
                    <p>{new Date(selectedInterview.scheduled_at).toLocaleString()} · {selectedInterview.mode}</p>
                    {selectedInterview.location && <p>{selectedInterview.location}</p>}
                    {selectedInterview.details && <p>{selectedInterview.details}</p>}
                  </div>
                ) : null}
                {selectedApplicant.status === "shortlisted" && (!selectedInterview || selectedInterview.status === "scheduled") ? (
                  <form className="space-y-3 rounded-md border p-3" onSubmit={handleScheduleInterview}>
                    <Label htmlFor="interview-scheduled-at">Interview date and time</Label>
                    <Input id="interview-scheduled-at" type="datetime-local" required value={interviewForm.scheduledAt} onChange={(event) => setInterviewForm((value) => ({ ...value, scheduledAt: event.target.value }))} />
                    <Label htmlFor="interview-mode">Mode</Label>
                    <Select value={interviewForm.mode} onValueChange={(mode) => setInterviewForm((value) => ({ ...value, mode }))}>
                      <SelectTrigger id="interview-mode"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="onsite">Onsite</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                    <Label htmlFor="interview-location">Location or meeting link</Label>
                    <Input id="interview-location" maxLength={500} value={interviewForm.location} onChange={(event) => setInterviewForm((value) => ({ ...value, location: event.target.value }))} />
                    <Label htmlFor="interview-details">Details</Label>
                    <Input id="interview-details" maxLength={2000} value={interviewForm.details} onChange={(event) => setInterviewForm((value) => ({ ...value, details: event.target.value }))} />
                    <Button type="submit" disabled={savingLifecycle}>{selectedInterview ? "Update interview" : "Schedule interview"}</Button>
                    {selectedInterview && <Button type="button" variant="outline" disabled={savingLifecycle} onClick={() => handleInterviewTransition(selectedInterview, "completed")}>Mark completed</Button>}
                    {selectedInterview && <Button type="button" variant="outline" disabled={savingLifecycle} onClick={() => handleInterviewTransition(selectedInterview, "cancelled")}>Cancel interview</Button>}
                  </form>
                ) : null}
                {selectedInterview?.status === "completed" ? (
                  <form className="space-y-3 rounded-md border p-3" onSubmit={handleSaveEvaluation}>
                    <h4 className="font-medium">Interview evaluation</h4>
                    <Label htmlFor="evaluation-score">Score (1–5)</Label>
                    <Input id="evaluation-score" type="number" min="1" max="5" step="1" required value={evaluationForm.score} onChange={(event) => setEvaluationForm((value) => ({ ...value, score: event.target.value }))} />
                    <Label htmlFor="evaluation-feedback">Feedback</Label>
                    <Input id="evaluation-feedback" maxLength={5000} required value={evaluationForm.feedback} onChange={(event) => setEvaluationForm((value) => ({ ...value, feedback: event.target.value }))} />
                    <Label htmlFor="evaluation-recommendation">Recommendation</Label>
                    <Select value={evaluationForm.recommendation} onValueChange={(recommendation) => setEvaluationForm((value) => ({ ...value, recommendation }))}>
                      <SelectTrigger id="evaluation-recommendation"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="reject">Reject</SelectItem>
                        <SelectItem value="undecided">Undecided</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" disabled={savingLifecycle}>{selectedEvaluation ? "Update evaluation" : "Save evaluation"}</Button>
                  </form>
                ) : null}
                {selectedInterview && selectedApplicant.status === "shortlisted" && !selectedEvaluation && selectedInterview.status !== "completed" ? (
                  <p className="text-xs text-muted-foreground">Complete and evaluate an interview before making a final decision.</p>
                ) : null}
              </div>

              {selectedApplicant.status === "selected" && (
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-semibold">Offer</h3>
                  {selectedOffer ? (
                    <p className="text-sm">{selectedOffer.offered_ctc} LPA · {selectedOffer.is_accepted === null ? "offered" : selectedOffer.is_accepted ? "accepted" : "rejected"}</p>
                  ) : (
                    <form className="flex items-end gap-3" onSubmit={handleCreateOffer}>
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="offer-ctc">Offer package (LPA)</Label>
                        <Input id="offer-ctc" type="number" min="0.01" step="0.01" required value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} />
                      </div>
                      <Button type="submit" disabled={savingLifecycle}>Create offer</Button>
                    </form>
                  )}
                  {selectedPlacement && <p className="text-sm text-green-700">Placement record created after offer acceptance.</p>}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
