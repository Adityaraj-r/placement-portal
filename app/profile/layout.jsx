"use client";

import StudentNavbar from "@/components/StudentNavbar";
import StudentFooter from "@/components/StudentFooter";

export default function ProfileLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <StudentNavbar />
      <main className="flex-1">{children}</main>
      <StudentFooter />
    </div>
  );
}

