"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-white border border-slate-200/80 text-slate-900 shadow-lg rounded-xl",
          description: "text-slate-600",
          actionButton:
            "bg-blue-600 text-white hover:bg-blue-700 rounded-md",
          cancelButton:
            "bg-slate-100 text-slate-900 hover:bg-slate-200 rounded-md",
        },
      }}
    />
  );
}

