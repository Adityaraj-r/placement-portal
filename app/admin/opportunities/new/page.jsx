"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createOpportunity } from "@/app/actions/opportunities.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewOpportunity() {
  const router = useRouter();
  const [opportunity, setOpportunity] = useState({
    company_name: "",
    role: "",
    job_location: "",
    package_lpa: "",
    min_cgpa: "",
    allowed_departments: "",
    max_backlogs: "0",
    deadline: "",
    description: "",
    status: "draft",
  });

  const handleChange = (field, value) => {
    setOpportunity((prev) => ({ ...prev, [field]: value }));
  };

  async function handleCreate(){
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
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create Opportunity
      </h1>

      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-4">

          <div className="space-y-1">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={opportunity.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={opportunity.role}
              onChange={(e) => handleChange("role", e.target.value)}
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
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="status">Drive Status</Label>
            <select id="status" value={opportunity.status} onChange={(e) => handleChange("status", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
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

          <Button
            className="bg-blue-600 text-white w-full"
            onClick={handleCreate}
          >
            Create Opportunity
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
