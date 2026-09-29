"use client";

import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { getOpportunityById, updateOpportunity } from "@/app/actions/opportunities.actions";
import { toast } from "sonner";
import Link from "next/link";
import { getCompanies } from "@/app/actions/company.actions";
import { DRIVE_STATUSES, canTransitionDriveStatus } from "@/lib/placement/drive-rules.mjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EditOpportunityPage() {
  const { id } = useParams();

  const [opportunity, setOpportunity] = useState(null);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    async function getData() {
      const [driveResult, companiesResult] = await Promise.all([
        getOpportunityById(id),
        getCompanies(),
      ]);
      if (driveResult?.data) setOpportunity(driveResult.data);
      else toast.error(driveResult?.error || "Could not load placement drive");
      if (companiesResult?.success) setCompanies(companiesResult.data ?? []);
      else toast.error(companiesResult?.error || "Could not load companies");
    }
    if (id) getData();
  }, [id]);

  const handleFieldChange = (field, value) => {
    setOpportunity((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleUpdate = async () => {
    const result = await updateOpportunity(id, {
      ...opportunity,
      deadline: new Date(opportunity.deadline).toISOString(),
    });
    if (result.success) setOpportunity(result.data);
    else toast.error(result.error || "Could not update the placement drive.");
  };

  const handleClose = async () => {
    const result = await updateOpportunity(id, {
      ...opportunity,
      deadline: new Date(opportunity.deadline).toISOString(),
      status: "cancelled",
    });
    if (result.success) setOpportunity(result.data);
    else toast.error(result.error || "Could not close the placement drive.");
  };

  if (!opportunity) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Opportunity</h1>

      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-4">

          <div className="space-y-1">
            <Label htmlFor="company_id">Company</Label>
            <Select value={opportunity.company_id || ""} onValueChange={(value) => handleFieldChange("company_id", value)}>
              <SelectTrigger id="company_id" className="w-full">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companies.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No companies available. <Link className="text-blue-600 underline" href="/admin/companies">Add a company</Link> first.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={opportunity.role || ""}
              onChange={(e) => handleFieldChange("role", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="job_location">Job Location</Label>
            <Input id="job_location" value={opportunity.job_location || ""} onChange={(e) => handleFieldChange("job_location", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="package_lpa">Package (LPA)</Label>
              <Input id="package_lpa" type="number" min="0" step="0.01" value={opportunity.package_lpa ?? ""} onChange={(e) => handleFieldChange("package_lpa", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="min_cgpa">Minimum CGPA</Label>
              <Input id="min_cgpa" type="number" min="0" max="10" step="0.01" value={opportunity.min_cgpa ?? ""} onChange={(e) => handleFieldChange("min_cgpa", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="allowed_departments">Allowed Departments (comma separated)</Label>
            <Input id="allowed_departments" value={Array.isArray(opportunity.allowed_departments) ? opportunity.allowed_departments.join(", ") : ""} onChange={(e) => handleFieldChange("allowed_departments", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="max_backlogs">Maximum Backlogs</Label>
            <Input id="max_backlogs" type="number" min="0" step="1" value={opportunity.max_backlogs ?? 0} onChange={(e) => handleFieldChange("max_backlogs", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={
                opportunity.deadline
                  ? new Date(opportunity.deadline).toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) => handleFieldChange("deadline", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="status">Drive Status</Label>
            <select id="status" value={opportunity.status || "draft"} onChange={(e) => handleFieldChange("status", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {DRIVE_STATUSES.filter((status) => canTransitionDriveStatus(opportunity.status || "draft", status)).map((status) => (
                <option key={status} value={status}>{status.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={opportunity.description || ""}
              onChange={(e) =>
                handleFieldChange("description", e.target.value)
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button className="bg-blue-600" onClick={handleUpdate} disabled={companies.length === 0}>
              Update Opportunity
            </Button>
            <Button variant="destructive" onClick={handleClose} disabled={["completed", "cancelled"].includes(opportunity.status)}>
              Close Opportunity
            </Button>
          </div>

        </CardContent>
      </Card>

      <p className="text-sm text-gray-500 mt-4">Opportunity ID: {id}</p>
    </div>
  );
}
