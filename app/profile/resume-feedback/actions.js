"use server";

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/supabaseServer";

const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const FEEDBACK_MODEL = "gemini-2.5-flash";

function isValidFeedback(value) {
  return value != null
    && typeof value === "object"
    && !Array.isArray(value)
    && typeof value.overallScore === "number"
    && Number.isFinite(value.overallScore)
    && value.overallScore >= 0
    && value.overallScore <= 100
    && Array.isArray(value.missingSkills)
    && value.missingSkills.every((item) => typeof item === "string")
    && Array.isArray(value.formattingSuggestions)
    && value.formattingSuggestions.every((item) => typeof item === "string");
}

export async function getResumeFeedback(formData) {
  try {
    if (!formData || typeof formData.get !== "function") {
      return { error: "Choose a PDF resume to analyze." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "Please log in as a student to use resume feedback." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "student") {
      return { error: "Resume feedback is available to students only." };
    }

    const file = formData.get("resume");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return { error: "Choose a PDF resume to analyze." };
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
      return { error: "The selected file is empty or invalid." };
    }
    if (file.size > MAX_RESUME_SIZE) {
      return { error: "Resume must be no larger than 5 MB." };
    }
    if (file.type !== "application/pdf" || !file.name?.toLowerCase().endsWith(".pdf")) {
      return { error: "Only PDF resumes are supported." };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "Resume feedback is temporarily unavailable." };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length !== file.size || bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return { error: "The selected file is not a valid PDF." };
    }

    // The resume PDF is sent to Google GenAI for processing to generate feedback.
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: FEEDBACK_MODEL,
      contents: {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: bytes.toString("base64"),
            },
          },
          {
            text: `Analyze the resume below and return ONLY valid JSON.
Do not include explanations or markdown.
JSON schema:
{
  "overallScore": number (0-100),
  "missingSkills": string[],
  "formattingSuggestions": string[]
}`,
          },
        ],
      },
    });

    if (typeof result?.text !== "string" || !result.text.trim()) {
      return { error: "Resume feedback could not be generated. Please try again." };
    }

    const json = result.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    let feedback;
    try {
      feedback = JSON.parse(json);
    } catch {
      return { error: "Resume feedback could not be read. Please try again." };
    }
    if (!isValidFeedback(feedback)) {
      return { error: "Resume feedback was incomplete. Please try again." };
    }

    return {
      overallScore: feedback.overallScore,
      missingSkills: feedback.missingSkills.slice(0, 30).map((item) => item.trim().slice(0, 300)),
      formattingSuggestions: feedback.formattingSuggestions.slice(0, 30).map((item) => item.trim().slice(0, 500)),
    };
  } catch {
    return { error: "Resume feedback could not be generated. Please try again." };
  }
}
