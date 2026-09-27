"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createOpportunity } from "@/app/actions/opportunities.actions";

export default function NewOpportunity() {
  const [opportunity, setOpportunity] = useState({
    company_name: "",
    role: "",
    required_skills: "",
    deadline: "",
    description: "",
  });

  const handleChange = (field, value) => {
    setOpportunity((prev) => ({ ...prev, [field]: value }));
  };

  async function handleCreate(){
    try {
      await createOpportunity(opportunity)
    } catch (error) {
      console.log(error)
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
            <Label htmlFor="required_skills">Required Skills</Label>
            <Input
              id="required_skills"
              value={opportunity.required_skills}
              onChange={(e) =>
                handleChange("required_skills", e.target.value)
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={opportunity.deadline}
              onChange={(e) => handleChange("deadline", e.target.value)}
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
