"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createOpportunity } from "@/app/actions/opportunities.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getCompanies } from "@/app/actions/company.actions";
import PageHeader from "@/components/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewOpportunity() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesFailed, setCompaniesFailed] = useState(false);
  const [opportunity, setOpportunity] = useState({
    company_id: "",
    role: "",
    job_location: "",
    package_lpa: "",
    min_cgpa: "",
    allowed_departments: "",
    max_backlogs: "0",
    deadline: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const result = await getCompanies();
        if (result?.success) setCompanies(result.data ?? []);
        else {
          setCompaniesFailed(true);
          toast.error("Could not load companies. Please try again.");
        }
      } catch {
        setCompaniesFailed(true);
        toast.error("Could not load companies. Please try again.");
      } finally {
        setCompaniesLoading(false);
      }
    }
    loadCompanies();
  }, []);

  const handleChange = (field, value) => {
    setOpportunity((prev) => ({ ...prev, [field]: value }));
  };

  async function handleCreate(event){
    event.preventDefault();
    setSaving(true);
    try {
      const result = await createOpportunity(opportunity);
      if (result.success) {
        toast.success("Placement drive created.");
        router.push("/admin/opportunities");
      } else {
        toast.error(result.error || "Could not create the placement drive.");
      }
    } catch (error) {
      console.log(error)
      toast.error("Could not create the placement drive.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 sm:space-y-8">
      <PageHeader
        title="Create Placement Drive"
        description="Configure the company, eligibility criteria, and application deadline."
      />

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <form className="space-y-7" onSubmit={handleCreate}>
            <p className="text-sm text-muted-foreground"><span className="text-destructive" aria-hidden="true">*</span> Required field</p>

            <section aria-labelledby="drive-basic-heading" className="space-y-4 border-b border-border pb-6">
              <div><h2 id="drive-basic-heading" className="text-base font-semibold">Basic information</h2><p className="mt-1 text-sm text-muted-foreground">Set the role and company shown to students.</p></div>
              <div className="space-y-1">
                <Label htmlFor="company_id">Company <span className="text-destructive" aria-hidden="true">*</span></Label>
                <Select value={opportunity.company_id} onValueChange={(value) => handleChange("company_id", value)}>
                  <SelectTrigger id="company_id" className="w-full" aria-label="Company" required disabled={companiesLoading || companiesFailed}>
                    <SelectValue placeholder={companiesLoading ? "Loading companies…" : "Select a company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {companiesFailed ? <p className="text-sm text-destructive" role="alert">Companies could not be loaded. Refresh the page to try again.</p> : null}
                {!companiesLoading && !companiesFailed && companies.length === 0 ? <p className="text-sm text-muted-foreground">No companies yet. <Link className="text-primary underline underline-offset-4" href="/admin/companies">Add a company</Link> first.</p> : null}
              </div>
              <div className="space-y-1"><Label htmlFor="role">Role title <span className="text-destructive" aria-hidden="true">*</span></Label><Input id="role" value={opportunity.role} onChange={(event) => handleChange("role", event.target.value)} required /></div>
              <div className="space-y-1"><Label htmlFor="job_location">Job location</Label><Input id="job_location" autoComplete="off" value={opportunity.job_location} onChange={(event) => handleChange("job_location", event.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="description">Opportunity description</Label><Textarea id="description" value={opportunity.description} onChange={(event) => handleChange("description", event.target.value)} className="min-h-28 resize-y" /></div>
            </section>

            <section aria-labelledby="drive-eligibility-heading" className="space-y-4 border-b border-border pb-6">
              <div><h2 id="drive-eligibility-heading" className="text-base font-semibold">Eligibility and package</h2><p className="mt-1 text-sm text-muted-foreground">Add the criteria students need to meet.</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1"><Label htmlFor="package_lpa">Package (LPA)</Label><Input id="package_lpa" type="number" min="0" step="0.01" value={opportunity.package_lpa} onChange={(event) => handleChange("package_lpa", event.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="min_cgpa">Minimum CGPA</Label><Input id="min_cgpa" type="number" min="0" max="10" step="0.01" value={opportunity.min_cgpa} onChange={(event) => handleChange("min_cgpa", event.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label htmlFor="allowed_departments">Allowed departments (comma separated)</Label><Input id="allowed_departments" value={opportunity.allowed_departments} onChange={(event) => handleChange("allowed_departments", event.target.value)} placeholder="Computer Science, Electrical" /><p className="text-sm text-muted-foreground">Leave blank if all departments are eligible.</p></div>
              <div className="space-y-1"><Label htmlFor="max_backlogs">Maximum backlogs</Label><Input id="max_backlogs" type="number" min="0" step="1" value={opportunity.max_backlogs} onChange={(event) => handleChange("max_backlogs", event.target.value)} /></div>
            </section>

            <section aria-labelledby="drive-config-heading" className="space-y-4">
              <div><h2 id="drive-config-heading" className="text-base font-semibold">Application configuration</h2><p className="mt-1 text-sm text-muted-foreground">Set when applications close. New drives are saved as drafts.</p></div>
              <div className="space-y-1"><Label htmlFor="deadline">Registration deadline <span className="text-destructive" aria-hidden="true">*</span></Label><Input id="deadline" type="datetime-local" value={opportunity.deadline} onChange={(event) => handleChange("deadline", event.target.value)} required /></div>
            </section>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button type="submit" className="w-full sm:w-auto" disabled={companiesLoading || companiesFailed || companies.length === 0 || saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…</> : "Save as draft"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
