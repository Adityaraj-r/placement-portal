"use client";

import { useState } from "react";
import { getResumeFeedback } from "./actions";

export default function ResumeFeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFeedback(null);

    const formData = new FormData(e.target);
    const file = formData.get("resume");

    if (file.size > 5000000) {
      setError("File too large. Max 5MB");
      setLoading(false);
      return;
    }

    try {
      const result = await getResumeFeedback(formData);
      setFeedback(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <div className="text-center mb-8 mt-2">
          <h1 className="text-4xl font-extrabold text-blue-600">
            Resume Feedback Assistant
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Upload your resume (PDF) and get feedback on missing skills & formatting
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 bg-blue-50 text-center mb-6 transition hover:bg-blue-100">
            <input
              type="file"
              name="resume"
              accept=".pdf"
              required
              className="block mx-auto text-sm text-blue-600 file:py-2 file:px-4 file:border-0 file:outline-none file:bg-blue-600 file:text-white file:rounded-lg hover:file:bg-blue-700 cursor-pointer"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <strong>Error: </strong>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold text-base transition 
            ${
              loading
                ? "bg-indigo-200 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-md"
            }`}
          >
            {loading ? "Analyzing Resume..." : "Get Feedback"}
          </button>
        </form>

        {/* Feedback Card  */}
        {feedback && (
          <div className="mt-8 bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800">
                Overall Score:{" "}
                <span className="text-blue-600">{feedback.overallScore}</span>
              </h2>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-red-500 border-b border-red-200 pb-2 mb-3">
                Missing Skills
              </h3>
              <ul className="list-disc pl-5 text-gray-700 space-y-1">
                {feedback.missingSkills.map((skill, idx) => (
                  <li key={idx}>{skill}</li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-blue-600 border-b border-blue-200 pb-2 mb-3">
                Formatting Suggestions
              </h3>
              <ul className="list-disc pl-5 text-gray-700 space-y-1">
                {feedback.formattingSuggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm rounded-lg p-3 mb-5">
              This is AI-powered guidance. Please review and update your resume
              manually before applying.
            </div>

            <button
              onClick={() => setFeedback(null)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Check Another Resume
            </button>
          </div>
        )}
      </div>
    </div>
  );
}