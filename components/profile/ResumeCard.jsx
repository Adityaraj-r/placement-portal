"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  getMyResumeSignedUrl,
  uploadStudentResume,
} from "@/app/actions/resume.actions";

export default function ResumeCard({ resumePath }) {
  const [currentResumePath, setCurrentResumePath] = useState(resumePath || null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const fileInput = useRef(null);

  async function handleUpload() {
    if (!file) {
      toast.error("Choose a PDF resume to upload");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("resume", file);
      const result = await uploadStudentResume(formData);
      if (!result?.success) {
        toast.error(result?.error || "Could not upload your resume");
        return;
      }

      setCurrentResumePath(result.data.resumePath);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      toast.success("Resume uploaded successfully");
      if (result.warning) toast.error(result.warning);
    } catch {
      toast.error("Could not upload your resume");
    } finally {
      setUploading(false);
    }
  }

  async function handleView() {
    setOpening(true);
    try {
      const result = await getMyResumeSignedUrl();
      if (!result?.success || !result.url) {
        toast.error(result?.error || "Could not open your resume");
        return;
      }
      window.location.assign(result.url);
    } catch {
      toast.error("Could not open your resume");
    } finally {
      setOpening(false);
    }
  }

  const filename = currentResumePath?.split("/").at(-1) || "";

  return (
    <Card className="bg-white shadow-md border border-slate-200/80 rounded-xl overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-600" />
          <CardTitle className="text-slate-800 text-lg font-bold">Resume</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-slate-700">
            <p className="font-medium">{currentResumePath ? "Resume uploaded" : "No resume uploaded"}</p>
            {filename && <p className="truncate text-slate-500">{filename}</p>}
          </div>
          {currentResumePath && (
            <Button onClick={handleView} disabled={opening} variant="outline" className="gap-1.5">
              {opening ? "Opening..." : "View Resume"}
              <ExternalLink size={16} />
            </Button>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <label htmlFor="resume-upload" className="block text-sm font-medium text-slate-700">
            {currentResumePath ? "Replace resume" : "Upload resume"} (PDF, up to 5 MB)
          </label>
          <input
            id="resume-upload"
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          <Button onClick={handleUpload} disabled={uploading || !file} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
            <Upload size={16} />
            {uploading ? "Uploading..." : currentResumePath ? "Replace Resume" : "Upload Resume"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
