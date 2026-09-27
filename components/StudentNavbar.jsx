 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/supabaseClient";
import { useEffect, useState } from "react";

export default function StudentNavbar() {
  const pathname = usePathname();
  const [initial, setInitial] = useState("U");

  const isActive = (href) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        const name =
          user?.user_metadata?.full_name || user?.email || user?.id || "";
        const nextInitial = String(name).trim().charAt(0).toUpperCase();
        setInitial(nextInitial || "U");
      } catch {
        // ignore: navbar can render without user details
      }
    }
    loadUser();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-backdrop-filter:bg-white/70 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/opportunities" className="flex items-center gap-2">
          <span className="text-base font-semibold text-blue-600">
            Coding Savvy
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Button
            asChild
            variant={isActive("/opportunities") ? "default" : "ghost"}
            size="sm"
            className={isActive("/opportunities") ? "" : "text-slate-600"}
          >
            <Link href="/opportunities">Opportunities</Link>
          </Button>

          <Button
            asChild
            variant={isActive("/applications") ? "default" : "ghost"}
            size="sm"
            className={isActive("/applications") ? "" : "text-slate-600"}
          >
            <Link href="/applications">My Applications</Link>
          </Button>
        </nav>

        <Link
          href="/profile"
          className="group flex items-center rounded-full focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          aria-label="Go to profile"
        >
          <Avatar className="h-9 w-9 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow">
            <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}

