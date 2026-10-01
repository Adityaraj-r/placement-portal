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
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto grid min-h-16 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-2 sm:flex sm:justify-between sm:gap-6 sm:px-6 sm:py-0 lg:px-8">
        <Link href="/opportunities" className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span className="truncate text-sm font-semibold tracking-tight text-primary sm:text-base">
            Placement Portal
          </span>
        </Link>

        <nav className="col-span-2 grid grid-cols-2 gap-1 sm:order-2 sm:flex sm:items-center sm:justify-center" aria-label="Student navigation">
          <Button
            asChild
            variant={isActive("/opportunities") ? "default" : "ghost"}
            size="default"
            className={isActive("/opportunities") ? "" : "text-muted-foreground"}
          >
            <Link href="/opportunities" aria-current={isActive("/opportunities") ? "page" : undefined}>Opportunities</Link>
          </Button>

          <Button
            asChild
            variant={isActive("/applications") ? "default" : "ghost"}
            size="default"
            className={isActive("/applications") ? "" : "text-muted-foreground"}
          >
            <Link href="/applications" aria-current={isActive("/applications") ? "page" : undefined}>My Applications</Link>
          </Button>
        </nav>

        <Link
          href="/profile"
          className="group flex size-10 items-center justify-center justify-self-end rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:order-3"
          aria-label="Go to profile"
        >
          <Avatar className="size-9 border border-border shadow-sm transition-shadow group-hover:shadow-md">
              <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}

