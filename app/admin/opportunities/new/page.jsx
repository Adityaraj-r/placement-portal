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
import { getCompanies } from "@/app/actions/company.actions";
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
      const result = await getCompanies();
      if (result?.success) setCompanies(result.data ?? []);
      else toast.error(result?.error || "Could not load companies");
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
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create Opportunity
      </h1>

      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-4">
          <form className="space-y-4" onSubmit={handleCreate}>

          <div className="space-y-1">
            <Label htmlFor="company_id">Company</Label>
            <Select value={opportunity.company_id} onValueChange={(value) => handleChange("company_id", value)}>
              <SelectTrigger id="company_id" className="w-full" aria-label="Company" required>
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
                No companies yet. <Link className="text-blue-600 underline" href="/admin/companies">Add a company</Link> first.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={opportunity.role}
              onChange={(e) => handleChange("role", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="job_location">Job Location</Label>
            <Input id="job_location" value={opportunity.job_location} onChange={(e) => handleChange("job_location", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="package_lpa">Package (LPA)</Label>
              <Input id="package_lpa" type="number" min="0" step="0.01" value={opportunity.package_lpa} onChange={(e) => handleChange("package_lpa", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="min_cgpa">Minimum CGPA</Label>
              <Input id="min_cgpa" type="number" min="0" max="10" step="0.01" value={opportunity.min_cgpa} onChange={(e) => handleChange("min_cgpa", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="allowed_departments">Allowed Departments (comma separated)</Label>
            <Input id="allowed_departments" value={opportunity.allowed_departments} onChange={(e) => handleChange("allowed_departments", e.target.value)} placeholder="Computer Science, Electrical" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="max_backlogs">Maximum Backlogs</Label>
            <Input id="max_backlogs" type="number" min="0" step="1" value={opportunity.max_backlogs} onChange={(e) => handleChange("max_backlogs", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={opportunity.deadline}
              onChange={(e) => handleChange("deadline", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Opportunity Description</Label>
            <Textarea
              id="description"
              value={opportunity.description}
              onChange={(e) =>
                handleChange("description", e.target.value)
              }
            />
          </div>

          <Button type="submit"
            className="bg-blue-600 text-white w-full"
            disabled={companies.length === 0 || saving}
          >
            {saving ? "Saving…" : "Save as draft"}
          </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
