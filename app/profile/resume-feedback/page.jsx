"use client";

import { useState } from "react";
import { getResumeFeedback } from "./actions";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Loader2 } from "lucide-react";

export default function ResumeFeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");
  const [requestFailed, setRequestFailed] = useState(false);
  const [hasRequestedFeedback, setHasRequestedFeedback] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRequestFailed(false);
    setFeedback(null);

    const formData = new FormData(e.target);
    const file = formData.get("resume");

    if (!file || typeof file === "string" || typeof file.size !== "number" || file.size <= 0) {
      setError("Choose a valid PDF resume.");
      setLoading(false);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Max 5MB");
      setLoading(false);
      return;
    }

    setHasRequestedFeedback(true);
    try {
      const result = await getResumeFeedback(formData);
      if (result?.error) {
        setRequestFailed(true);
      } else {
        setFeedback(result);
      }
    } catch {
      setRequestFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <PageHeader
          title="Resume Feedback Assistant"
          description="Upload a PDF resume for feedback on skills and formatting."
        />

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5 sm:p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-lg border-2 border-dashed border-border bg-muted/40 p-5 text-center transition-colors hover:bg-muted/70 sm:p-8">
            <input
              type="file"
              name="resume"
              accept=".pdf"
              required
              className="mx-auto block max-w-full cursor-pointer text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {error && (
            <div role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive">
              <strong>Error: </strong>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Analyzing resume…</> : "Get Feedback"}
          </Button>
        </form>
          </CardContent>
        </Card>

        {loading ? <LoadingState label="Generating resume feedback"><Card><CardContent className="space-y-5 p-6"><div className="h-7 w-1/3 animate-pulse rounded bg-muted" /><div className="h-4 w-full animate-pulse rounded bg-muted" /><div className="h-24 animate-pulse rounded bg-muted" /><div className="h-24 animate-pulse rounded bg-muted" /></CardContent></Card></LoadingState> : null}
        {requestFailed ? <ErrorState title="Unable to generate resume feedback" description="Feedback could not be generated from this resume. Please check the PDF and try again." /> : null}
        {!loading && !feedback && !requestFailed && !error ? <EmptyState title={hasRequestedFeedback ? "No feedback result available" : "No resume feedback yet"} description={hasRequestedFeedback ? "No feedback was returned. You can submit your resume again to try once more." : "Upload a PDF resume above to receive feedback on skills and formatting."} /> : null}

        {/* Feedback Card  */}
        {feedback && (
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Overall Score:{" "}
                <span className="text-primary">{feedback.overallScore}</span>
              </h2>
            </div>

            <div className="mb-6">
              <h3 className="mb-3 border-b border-border pb-2 text-xl font-bold text-destructive">
                Missing Skills
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-foreground">
                {feedback.missingSkills.map((skill, idx) => (
                  <li key={idx}>{skill}</li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="mb-3 border-b border-border pb-2 text-xl font-bold text-primary">
                Formatting Suggestions
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-foreground">
                {feedback.formattingSuggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>

            <div role="note" className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
              This is AI-powered guidance. Please review and update your resume
              manually before applying.
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setFeedback(null)}
            >
              Check Another Resume
            </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
