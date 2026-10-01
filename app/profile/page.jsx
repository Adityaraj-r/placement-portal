"use client";

import ProfileCard from "@/components/profile/ProfileCard";
import ResumeCard from "@/components/profile/ResumeCard";
import SkillsList from "@/components/profile/SkillsList";
import { useEffect, useState } from "react";
import { getProfileByUserId } from "../actions/profile.actions";
import { createClient } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfilePage() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function getData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/login");
          return;
        }

        const result = await getProfileByUserId();

        if (!result.success || !result.data) {
          // If no profile exists yet, send the student to create/edit flow
          router.replace("/profile/edit");
          return;
        }

        if (!result.data.studentProfileExists) {
          router.replace("/profile/edit");
          return;
        }

        setProfile({ ...result.data, email: user.email });
      } catch {
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    }

    getData();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Middleware will prevent accessing protected routes after logout
    router.replace("/login");
  };

  const skills = Array.isArray(profile?.skills)
    ? profile.skills
    : typeof profile?.skills === "string"
      ? profile.skills.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

  return (
    <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <PageHeader
          title="Profile"
          description="Manage your profile information and documents."
          actions={<Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>}
        />

        {loading ? <LoadingState label="Loading your profile">
          <div className="grid gap-6 md:grid-cols-3"><Card><CardContent className="space-y-4 p-6"><div className="h-6 w-2/3 animate-pulse rounded bg-muted" /><div className="h-4 w-full animate-pulse rounded bg-muted" /><div className="h-24 animate-pulse rounded bg-muted" /></CardContent></Card><Card className="md:col-span-2"><CardContent className="space-y-4 p-6"><div className="h-6 w-1/3 animate-pulse rounded bg-muted" /><div className="h-20 animate-pulse rounded bg-muted" /><div className="h-12 animate-pulse rounded bg-muted" /></CardContent></Card></div>
        </LoadingState> : loadFailed ? <ErrorState title="Unable to load your profile" description="Something went wrong while retrieving your profile information." /> : <>
        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <ProfileCard profile={profile} />
          <div className="space-y-6 md:col-span-2">
            <SkillsList skills={skills} />
            <ResumeCard resumePath={profile?.resume_path} />
            <Link href="./profile/resume-feedback">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Get Resume Feedback
              </Button>
            </Link>
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}
