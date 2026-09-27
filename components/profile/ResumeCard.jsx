"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/supabaseClient";
import { useMemo } from "react";

export default function ResumeCard({ resumeUrl }) {
  // Get public URL from Supabase storage bucket "resumes"
  // resumeUrl is the storage path stored in profiles.resume_url (e.g., "user_id/resume.pdf")
  const publicUrl = useMemo(() => {
    if (!resumeUrl) return null;

    try {
      const supabase = createClient();
      const { data } = supabase.storage
        .from("resumes")
        .getPublicUrl(resumeUrl);

      return data?.publicUrl || null;
    } catch (error) {
      console.error("Error getting resume URL:", error);
      return null;
    }
  }, [resumeUrl]);

  const handleViewResume = () => {
    if (publicUrl) {
      window.open(publicUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="bg-white shadow-md border border-slate-200/80 rounded-xl overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-600" />
          <CardTitle className="text-slate-800 text-lg font-bold">
            Resume
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">My Resume (PDF)</span>
          </div>

          {resumeUrl && publicUrl ? (
            <Button
              onClick={handleViewResume}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
            >
              View Resume
              <ExternalLink size={16} />
            </Button>
          ) : resumeUrl ? (
            <p className="text-sm text-slate-500 italic">
              Resume unavailable
            </p>
          ) : (
            <p className="text-sm text-slate-500 italic">
              No resume uploaded
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
