"use server";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getResumeFeedback(formData) {
  const file = formData.get("resume");
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64,
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

  const text = result.text;
  const json = text.replace(/```json|```/g, "").trim();
  return JSON.parse(json);
}
