"use client";

import { useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar open={open} setOpen={setOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <div className="sticky top-0 z-40 flex items-center justify-between bg-white/80 backdrop-blur supports-backdrop-filter:bg-white/70 border-b border-slate-200/80 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(true)}
                className="h-9 w-9"
              >
                <Menu size={20} />
              </Button>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">
                Coding Savvy
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Administration Dashboard
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-sm font-medium"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>

        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
