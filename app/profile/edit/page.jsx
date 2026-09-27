"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getProfileByUserId, updateProfile } from "@/app/actions/profile.actions";
import { createClient } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function EditProfilePage() {
  const [profile, setProfile] = useState({});
  const router = useRouter();
  const skillsValue = Array.isArray(profile?.skills)
    ? profile.skills.join(", ")
    : profile?.skills || "";

  useEffect(() => {
    async function getData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { success, data, error } = await getProfileByUserId();

      if (success) {
        setProfile(data);
      } else {
        toast.error("Could not load your profile. Please try again.");
        console.error("Error fetching profile:", error);
      }
    }

    getData();
  }, []);

  // Field change
  const handleFieldChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  // Save changes
  const handleSave = async () => {
    try {
      const updatedProfile = {
        full_name: profile.full_name ?? profile.name ?? "",
        phone: profile.phone ?? "",
        college_id: profile.college_id ?? "",
        department: profile.department ?? profile.branch ?? "",
        degree: profile.degree ?? "",
        graduation_year: profile.graduation_year ?? "",
        cgpa: profile.cgpa ?? "",
        backlogs: profile.backlogs ?? "",
        skills: profile.skills ?? "",
      };
      for (const field of ["graduation_year", "cgpa", "backlogs"]) {
        updatedProfile[field] = updatedProfile[field] === ""
          ? null
          : Number(updatedProfile[field]);
      }

      const { success, error } = await updateProfile(updatedProfile);

      if (success) {
        toast.success("Profile updated successfully!");
        router.push("/profile");
      } else {
        toast.error(error || "Could not save your profile. Please try again.");
        console.error("Error updating profile:", error);
      }
    } catch (err) {
      toast.error("Could not save your profile. Please try again.");
      console.error("Unexpected error:", err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-muted-foreground text-sm">
            Update your account and academic information
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-white border border-slate-200/80 rounded-xl shadow-md">
          <CardContent className="p-6 space-y-6">

            {/* Account details */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full name</Label>
              <Input
                value={profile?.full_name || profile?.name || ""}
                onChange={(e) => handleFieldChange("full_name", e.target.value)}
                placeholder="Enter your full name"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone</Label>
              <Input
                value={profile?.phone || ""}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                placeholder="Enter your phone number"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <Input value={profile?.email || ""} disabled className="h-10" />
            </div>

            {/* College */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">College ID</Label>
              <Input
                value={profile?.college_id || ""}
                onChange={(e) => handleFieldChange("college_id", e.target.value)}
                placeholder="Enter your college ID"
                className="h-10"
              />
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Department</Label>
              <Input
                value={profile?.department || profile?.branch || ""}
                onChange={(e) => handleFieldChange("department", e.target.value)}
                placeholder="Enter your department"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Degree</Label>
              <Input
                value={profile?.degree || ""}
                onChange={(e) => handleFieldChange("degree", e.target.value)}
                placeholder="Enter your degree"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Graduation year</Label>
              <Input
                type="number"
                value={profile?.graduation_year ?? ""}
                onChange={(e) => handleFieldChange("graduation_year", e.target.value)}
                placeholder="e.g. 2027"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">CGPA</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={profile?.cgpa ?? ""}
                  onChange={(e) => handleFieldChange("cgpa", e.target.value)}
                  placeholder="e.g. 8.5"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Backlogs</Label>
                <Input
                  type="number"
                  min="0"
                  value={profile?.backlogs ?? ""}
                  onChange={(e) => handleFieldChange("backlogs", e.target.value)}
                  placeholder="0"
                  className="h-10"
                />
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Skills (comma separated)
              </Label>
              <Textarea
                placeholder="React, Next.js, Tailwind CSS, JavaScript..."
                value={skillsValue}
                onChange={(e) => handleFieldChange("skills", e.target.value)}
                className="min-h-24"
              />
              {skillsValue && (
                <div className="flex gap-2 flex-wrap mt-2 pt-2 border-t border-slate-100">
                  {skillsValue
                    .split(",")
                    .filter((s) => s.trim() !== "")
                    .map((skill, i) => (
                      <Badge
                        key={i}
                        className="bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium"
                      >
                        {skill.trim()}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-11 mt-2"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
