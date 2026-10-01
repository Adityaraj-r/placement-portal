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
            "group toast bg-card border border-border text-card-foreground shadow-md rounded-lg",
          description: "text-muted-foreground",
          success: "border-primary/30",
          warning: "border-border",
          error: "border-destructive/40",
          info: "border-border",
          actionButton:
            "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md",
          cancelButton:
            "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md",
        },
      }}
    />
  );
}

