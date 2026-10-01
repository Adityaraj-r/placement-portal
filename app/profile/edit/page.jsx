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
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2 } from "lucide-react";

export default function EditProfilePage() {
  const [profile, setProfile] = useState({});
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const skillsValue = Array.isArray(profile?.skills)
    ? profile.skills.join(", ")
    : profile?.skills || "";

  useEffect(() => {
    let active = true;

    async function getData() {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          if (active) setProfileLoadFailed(true);
          return;
        }

        const { success, data } = await getProfileByUserId();

        if (!active) return;
        if (success) {
          setProfile(data);
        } else {
          setProfileLoadFailed(true);
          toast.error("Could not load your profile. Please try again.");
        }
      } catch {
        if (active) {
          setProfileLoadFailed(true);
          toast.error("Could not load your profile. Please try again.");
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    getData();
    return () => {
      active = false;
    };
  }, []);

  // Field change
  const handleFieldChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  // Save changes
  const handleSave = async () => {
    if (profileLoading || profileLoadFailed || saving) return;

    setSaving(true);
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
        toast.error("Could not save your profile. Please review your details and try again.");
      }
    } catch {
      toast.error("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <PageHeader title="Edit Profile" description="Update your account and academic information." />

        {profileLoading ? <LoadingState label="Loading your profile for editing"><Card><CardContent className="space-y-5 p-6"><div className="h-6 w-1/3 animate-pulse rounded bg-muted" />{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-muted" />)}<div className="h-11 animate-pulse rounded bg-muted" /></CardContent></Card></LoadingState> : null}
        {profileLoadFailed && <ErrorState title="Unable to load your profile" description="Your saved profile could not be loaded. Saving is disabled to protect your existing account details. Refresh the page or try again later." />}
        {!profileLoading && !profileLoadFailed && profile.studentProfileExists === false ? <EmptyState title="Your student profile is not set up yet" description="Complete the form below to add your academic and profile information." /> : null}

        {/* Form Card */}
        {!profileLoading && <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 space-y-6">

            {/* Account details */}
            <div className="space-y-2">
              <Label htmlFor="full-name" className="text-sm font-medium">Full name</Label>
              <Input
                id="full-name"
                value={profile?.full_name || profile?.name || ""}
                onChange={(e) => handleFieldChange("full_name", e.target.value)}
                placeholder="Enter your full name"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
              <Input
                id="phone"
                value={profile?.phone || ""}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                placeholder="Enter your phone number"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" value={profile?.email || ""} disabled className="h-10" />
            </div>

            {/* College */}
            <div className="space-y-2">
              <Label htmlFor="college-id" className="text-sm font-medium">College ID</Label>
              <Input
                id="college-id"
                value={profile?.college_id || ""}
                onChange={(e) => handleFieldChange("college_id", e.target.value)}
                placeholder="Enter your college ID"
                className="h-10"
              />
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">Department</Label>
              <Input
                id="department"
                value={profile?.department || profile?.branch || ""}
                onChange={(e) => handleFieldChange("department", e.target.value)}
                placeholder="Enter your department"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="degree" className="text-sm font-medium">Degree</Label>
              <Input
                id="degree"
                value={profile?.degree || ""}
                onChange={(e) => handleFieldChange("degree", e.target.value)}
                placeholder="Enter your degree"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="graduation-year" className="text-sm font-medium">Graduation year</Label>
              <Input
                id="graduation-year"
                type="number"
                value={profile?.graduation_year ?? ""}
                onChange={(e) => handleFieldChange("graduation_year", e.target.value)}
                placeholder="e.g. 2027"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cgpa" className="text-sm font-medium">CGPA</Label>
                <Input
                  id="cgpa"
                  type="number"
                  step="0.01"
                  value={profile?.cgpa ?? ""}
                  onChange={(e) => handleFieldChange("cgpa", e.target.value)}
                  placeholder="e.g. 8.5"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backlogs" className="text-sm font-medium">Backlogs</Label>
                <Input
                  id="backlogs"
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
              <Label htmlFor="skills" className="text-sm font-medium">
                Skills (comma separated)
              </Label>
              <Textarea
                id="skills"
                placeholder="React, Next.js, Tailwind CSS, JavaScript..."
                value={skillsValue}
                onChange={(e) => handleFieldChange("skills", e.target.value)}
                className="min-h-24"
              />
              {skillsValue && (
              <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-3">
                  {skillsValue
                    .split(",")
                    .filter((s) => s.trim() !== "")
                    .map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-sm font-medium">
                        {skill.trim()}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            <Button
              className="mt-2 h-11 w-full font-medium"
              onClick={handleSave}
              disabled={profileLoading || profileLoadFailed || saving}
            >
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Saving changes…</> : profileLoading ? "Loading profile..." : profileLoadFailed ? "Profile unavailable" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>}
      </div>
    </div>
  );
}
