"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const wasOpenRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (wasOpenRef.current && !open) menuButtonRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen min-w-0 bg-muted/40">
      {/* Sidebar */}
      <Sidebar open={open} setOpen={setOpen} />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(true)}
                className="size-10"
                ref={menuButtonRef}
                aria-label="Open staff navigation"
                aria-expanded={open}
                aria-controls="staff-navigation"
              >
                <Menu aria-hidden="true" />
              </Button>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Placement Portal
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Staff Dashboard
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-sm font-medium"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </header>

        <main className="mx-auto flex w-full min-w-0 max-w-[100rem] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
