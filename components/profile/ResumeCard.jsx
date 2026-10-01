"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Upload, Loader2 } from "lucide-react";
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
        toast.error("Could not upload your resume. Please check the PDF and try again.");
        return;
      }

      setCurrentResumePath(result.data.resumePath);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      toast.success("Resume uploaded successfully");
      if (result.warning) toast.warning(result.warning);
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
        toast.error("Could not open your resume. Please try again.");
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
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" aria-hidden="true" />
          <CardTitle className="text-foreground text-lg font-semibold">Resume</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-foreground" role="status" aria-live="polite">
            <p className="font-medium">{currentResumePath ? "Resume uploaded" : "No resume uploaded"}</p>
            {filename && <p className="truncate text-muted-foreground">{filename}</p>}
          </div>
          {currentResumePath && (
            <Button onClick={handleView} disabled={opening} variant="outline" className="gap-1.5">
              {opening ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" />Opening…</> : <>View Resume<ExternalLink size={16} aria-hidden="true" /></>}
            </Button>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <label htmlFor="resume-upload" className="block text-sm font-medium text-foreground">
            {currentResumePath ? "Replace resume" : "Upload resume"} (PDF, up to 5 MB)
          </label>
          <input
            id="resume-upload"
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            aria-describedby="resume-upload-help"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-medium file:text-primary hover:file:bg-primary/15"
          />
          <p id="resume-upload-help" className="text-sm text-muted-foreground">PDF files up to 5 MB.</p>
          <Button onClick={handleUpload} disabled={uploading || !file} className="w-full gap-2 sm:w-auto">
            {uploading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
            {uploading ? "Uploading…" : currentResumePath ? "Replace Resume" : "Upload Resume"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
