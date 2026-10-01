"use client";

import StudentNavbar from "@/components/StudentNavbar";
import StudentFooter from "@/components/StudentFooter";

export default function ApplicationsLayout({ children }) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-muted/30">
      <StudentNavbar />
      <main className="w-full min-w-0 flex-1">{children}</main>
      <StudentFooter />
    </div>
  );
}

