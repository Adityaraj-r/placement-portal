"use client";

import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { getOpportunityById, updateOpportunity } from "@/app/actions/opportunities.actions";

export default function EditOpportunityPage() {
  const { id } = useParams();

  const [opportunity, setOpportunity] = useState(null);

  useEffect(() => {
    async function getData() {
      const temp = await getOpportunityById(id);
      setOpportunity(temp?.data || {});
    }
    if (id) getData();
  }, [id]);

  const handleFieldChange = (field, value) => {
    setOpportunity((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleUpdate = async () => {
    const updated = {
      ...opportunity,
      deadline: new Date(opportunity.deadline).toISOString(),
    };
    setOpportunity(updated);
    await updateOpportunity(id, updated);
  };

  const handleClose = async () => {
    const updated = {
      ...opportunity,
      status: "closed",
    };
    setOpportunity(updated);
    await updateOpportunity(id, updated);
  };

  if (!opportunity) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Opportunity</h1>

      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-4">

          <div className="space-y-1">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={opportunity.company_name || ""}
              onChange={(e) => handleFieldChange("company_name", e.target.value)}
            />
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
            <Label htmlFor="required_skills">Required Skills</Label>
            <Input
              id="required_skills"
              value={opportunity.required_skills || ""}
              onChange={(e) =>
                handleFieldChange("required_skills", e.target.value)
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={
                opportunity.deadline
                  ? new Date(opportunity.deadline).toISOString().slice(0, 10)
                  : ""
              }
              onChange={(e) => handleFieldChange("deadline", e.target.value)}
            />
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
            <Button className="bg-blue-600" onClick={handleUpdate}>
              Update Opportunity
            </Button>
            <Button variant="destructive" onClick={handleClose}>
              Close Opportunity
            </Button>
          </div>

        </CardContent>
      </Card>

      <p className="text-sm text-gray-500 mt-4">Opportunity ID: {id}</p>
    </div>
  );
}
