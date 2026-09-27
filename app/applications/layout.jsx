"use client";

import StudentNavbar from "@/components/StudentNavbar";
import StudentFooter from "@/components/StudentFooter";

export default function ApplicationsLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <StudentNavbar />
      <main className="flex-1">{children}</main>
      <StudentFooter />
    </div>
  );
}

