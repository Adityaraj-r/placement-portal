"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  X,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/supabaseClient";
import { useEffect, useRef, useState } from "react";

export default function Sidebar({ open, setOpen }) {
  const pathname = usePathname();
  const [role, setRole] = useState(null);
  const sidebarRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, setOpen]);

  function keepFocusInDrawer(event) {
    if (!open || event.key !== "Tab") return;
    const focusable = sidebarRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  useEffect(() => {
    let active = true;
    async function loadRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (active && ["admin", "tpo", "coordinator"].includes(profile?.role)) {
        setRole(profile.role);
      }
    }
    loadRole();
    return () => { active = false; };
  }, []);

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  const navItems = [
    {
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
    },
    {
      href: "/admin/opportunities",
      icon: Briefcase,
      label: "Opportunities",
    },
    {
      href: "/admin/companies",
      icon: Building2,
      label: "Companies",
    },
    {
      href: "/admin/placements",
      icon: ClipboardCheck,
      label: "Placements",
    },
    {
      href: "/admin/students",
      icon: GraduationCap,
      label: "Students",
    },
  ];

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close staff navigation"
          className="fixed inset-0 z-40 cursor-default bg-foreground/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg transition-transform duration-200 ease-out md:shadow-sm",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        id="staff-navigation"
        role={open ? "dialog" : "complementary"}
        aria-label="Staff navigation"
        aria-modal={open ? "true" : undefined}
        onKeyDown={keepFocusInDrawer}
        ref={sidebarRef}
      >
        {/* Header */}
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-sidebar-border px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <span className="text-xs font-bold tracking-wide">CP</span>
            </div>
            <h2 className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              {role ? `${role.toUpperCase()} Panel` : "Staff Panel"}
            </h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-9 shrink-0 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close staff navigation"
            ref={closeButtonRef}
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Staff sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                  active
                    ? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon
                  size={18}
                  aria-hidden="true"
                  className="shrink-0"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
