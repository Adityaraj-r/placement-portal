"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  X,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Sidebar({ open, setOpen }) {
  const pathname = usePathname();

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
      href: "/admin/students",
      icon: GraduationCap,
      label: "Students",
    },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200/80 shadow-sm transform transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CS</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden h-8 w-8"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    active ? "text-white" : "text-blue-600"
                  )}
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
