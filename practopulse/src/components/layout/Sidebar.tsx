"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FolderSync,
  LayoutDashboard,
  Megaphone,
  Radar,
  Settings,
  Sparkles,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Lead Finder", icon: Radar },
  { href: "/outreach", label: "Outreach Campaigns", icon: Megaphone },
  { href: "/pitch-studio", label: "Pitch Deck Studio", icon: Presentation },
  { href: "/meetings", label: "Meeting Hub", icon: CalendarDays },
  { href: "/systems", label: "Systems & Vault Sync", icon: FolderSync },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-slate-800 bg-[#0B1224]">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white">PractoPulse</div>
          <div className="text-xs text-slate-400">B2B Sales Engine</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4 text-xs text-slate-500">
        Reach &amp; Prime · Inside Sales
      </div>
    </aside>
  );
}
