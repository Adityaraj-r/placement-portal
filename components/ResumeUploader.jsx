"use client";

import { useState } from "react";

export default function ResumeUploader() {
  const [file, setFile] = useState(null);

  return (
    <div className="space-y-2 pt-4 border-t border-blue-300/30">
      <label className="block text-sm font-semibold text-blue-200">
        Upload Resume
      </label>

      <input
        type="file"
        accept=".pdf"
        className="w-full bg-[#243552] border border-blue-300/30 rounded-lg px-4 py-2 text-white 
        file:bg-blue-600 file:hover:bg-blue-700 file:text-white 
        file:border-0 file:px-4 file:py-2 file:rounded-md file:cursor-pointer"
        onChange={(e) => setFile(e.target.files[0])}
      />

      {file && <p className="text-sm text-blue-200">Uploaded: {file.name}</p>}
    </div>
  );
}
