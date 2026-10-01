"use client";

import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { getOpportunityById, updateOpportunity } from "@/app/actions/opportunities.actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { getCompanies } from "@/app/actions/company.actions";
import PageHeader from "@/components/PageHeader";
import { DRIVE_STATUSES, canTransitionDriveStatus } from "@/lib/placement/drive-rules.mjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { StatusBadge } from "@/components/ui/badge";

export default function EditOpportunityPage() {
  const { id } = useParams();
  const router = useRouter();

  const [opportunity, setOpportunity] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    async function getData() {
      try {
        const [driveResult, companiesResult] = await Promise.all([
          getOpportunityById(id),
          getCompanies(),
        ]);
        if (driveResult?.success && driveResult.data) setOpportunity(driveResult.data);
        else setLoadFailed(true);
        if (companiesResult?.success) setCompanies(companiesResult.data ?? []);
        else toast.error("Could not load companies. Please try again.");
      } catch {
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    }
    if (id) getData();
  }, [id]);

  const handleFieldChange = (field, value) => {
    setOpportunity((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const result = await updateOpportunity(id, {
        ...opportunity,
        deadline: new Date(opportunity.deadline).toISOString(),
      });
      if (result.success) {
        setOpportunity(result.data);
        toast.success("Placement drive updated.");
      } else toast.error(result.error || "Could not update the placement drive.");
    } catch {
      toast.error("Could not update the placement drive. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      const result = await updateOpportunity(id, {
        ...opportunity,
        deadline: new Date(opportunity.deadline).toISOString(),
        status: "cancelled",
      });
      if (result.success) {
        setOpportunity(result.data);
        toast.success("Placement drive cancelled.");
      } else toast.error(result.error || "Could not close the placement drive.");
    } catch {
      toast.error("Could not close the placement drive. Please try again.");
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <div className="mx-auto w-full max-w-3xl"><LoadingState label="Loading placement drive"><Card><CardContent className="space-y-5 p-5 sm:p-6">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-muted" />)}</CardContent></Card></LoadingState></div>;
  if (loadFailed || !opportunity) return <div className="mx-auto w-full max-w-3xl space-y-5"><ErrorState title="Unable to load placement drive" description="The drive details could not be loaded. Return to the placement drives and try again." /><Button variant="outline" onClick={() => router.push("/admin/opportunities")}>Back to placement drives</Button></div>;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <PageHeader
        title="Edit Placement Drive"
        description="Update company details, eligibility criteria, and drive status."
      />

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="space-y-7">
            <section aria-labelledby="drive-basic-heading" className="space-y-4 border-b border-border pb-6">
              <div><h2 id="drive-basic-heading" className="text-base font-semibold">Basic information</h2><p className="mt-1 text-sm text-muted-foreground">Company and role details shown to students.</p></div>
              <div className="space-y-1">
                <Label htmlFor="company_id">Company</Label>
                <Select value={opportunity.company_id || ""} onValueChange={(value) => handleFieldChange("company_id", value)}>
                  <SelectTrigger id="company_id" className="w-full"><SelectValue placeholder="Select a company" /></SelectTrigger>
                  <SelectContent>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent>
                </Select>
                {companies.length === 0 && <p className="text-sm text-muted-foreground">No companies available. <Link className="text-primary underline underline-offset-4" href="/admin/companies">Add a company</Link> first.</p>}
              </div>
              <div className="space-y-1"><Label htmlFor="role">Role title</Label><Input id="role" value={opportunity.role || ""} onChange={(event) => handleFieldChange("role", event.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="job_location">Job location</Label><Input id="job_location" value={opportunity.job_location || ""} onChange={(event) => handleFieldChange("job_location", event.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="description">Opportunity description</Label><Textarea id="description" value={opportunity.description || ""} onChange={(event) => handleFieldChange("description", event.target.value)} className="min-h-28 resize-y" /></div>
            </section>

            <section aria-labelledby="drive-eligibility-heading" className="space-y-4 border-b border-border pb-6">
              <div><h2 id="drive-eligibility-heading" className="text-base font-semibold">Eligibility and package</h2><p className="mt-1 text-sm text-muted-foreground">Review the criteria attached to this drive.</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1"><Label htmlFor="package_lpa">Package (LPA)</Label><Input id="package_lpa" type="number" min="0" step="0.01" value={opportunity.package_lpa ?? ""} onChange={(event) => handleFieldChange("package_lpa", event.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="min_cgpa">Minimum CGPA</Label><Input id="min_cgpa" type="number" min="0" max="10" step="0.01" value={opportunity.min_cgpa ?? ""} onChange={(event) => handleFieldChange("min_cgpa", event.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label htmlFor="allowed_departments">Allowed departments (comma separated)</Label><Input id="allowed_departments" value={Array.isArray(opportunity.allowed_departments) ? opportunity.allowed_departments.join(", ") : ""} onChange={(event) => handleFieldChange("allowed_departments", event.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="max_backlogs">Maximum backlogs</Label><Input id="max_backlogs" type="number" min="0" step="1" value={opportunity.max_backlogs ?? 0} onChange={(event) => handleFieldChange("max_backlogs", event.target.value)} /></div>
            </section>

            <section aria-labelledby="drive-config-heading" className="space-y-4 border-b border-border pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="drive-config-heading" className="text-base font-semibold">Application configuration</h2><p className="mt-1 text-sm text-muted-foreground">Set the registration deadline.</p></div><div className="space-y-1"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current status</p><StatusBadge status={opportunity.status} /></div></div>
              <div className="space-y-1"><Label htmlFor="deadline">Registration deadline</Label><Input id="deadline" type="datetime-local" value={opportunity.deadline ? new Date(opportunity.deadline).toISOString().slice(0, 16) : ""} onChange={(event) => handleFieldChange("deadline", event.target.value)} /></div>
            </section>

            <section aria-labelledby="drive-lifecycle-heading" className="space-y-4">
              <div><h2 id="drive-lifecycle-heading" className="text-base font-semibold">Drive lifecycle</h2><p className="mt-1 text-sm text-muted-foreground">Available status changes follow the existing placement workflow.</p></div>
              <div className="space-y-1"><Label htmlFor="status">Drive status</Label><select id="status" value={opportunity.status || "draft"} onChange={(event) => handleFieldChange("status", event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {DRIVE_STATUSES.filter((status) => canTransitionDriveStatus(opportunity.status || "draft", status)).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}
              </select></div>
            </section>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="destructive" className="w-full sm:w-auto" onClick={handleClose} disabled={saving || closing || ["completed", "cancelled"].includes(opportunity.status)}>{closing ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Cancelling…</> : "Close Opportunity"}</Button>
              <Button className="w-full sm:w-auto" onClick={handleUpdate} disabled={companies.length === 0 || saving || closing}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…</> : "Update Opportunity"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
