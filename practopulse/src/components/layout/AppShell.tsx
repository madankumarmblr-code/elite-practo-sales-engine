"use client";

import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0F172A] text-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/40 px-6 backdrop-blur">
          <div className="text-sm text-slate-400">
            Practo Inside Sales · <span className="text-slate-200">AE / SDR workspace</span>
          </div>
          <div className="rounded-full bg-[#1A365D] px-3 py-1 text-xs font-semibold text-sky-100">
            Healthcare B2B
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
