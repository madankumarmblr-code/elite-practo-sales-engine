"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLeadsStore } from "@/lib/store/leads";

export default function DashboardPage() {
  const leads = useLeadsStore((s) => s.leads);
  const byStatus = (status: string) => leads.filter((l) => l.status === status).length;
  const reach = leads.filter((l) => l.recommendedProduct !== "PRIME").length;
  const prime = leads.filter((l) => l.recommendedProduct !== "REACH").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          PractoPulse pulse-check for Reach &amp; Prime inside sales.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Pipeline leads", value: leads.length, tone: "teal" as const },
          { label: "Reach-fit", value: reach, tone: "blue" as const },
          { label: "Prime-fit", value: prime, tone: "teal" as const },
          { label: "Demos scheduled", value: byStatus("DEMO_SCHEDULED"), tone: "amber" as const },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-3xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge tone={kpi.tone}>Live mock + enrichment</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Core products</CardTitle>
            <CardDescription>Pitch framing for AEs / SDRs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="font-semibold text-sky-200">Practo Reach</div>
              Guaranteed impressions, locality &amp; specialty visibility, patient traffic.
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="font-semibold text-teal-200">Practo Prime</div>
              Premier listing, 24×7 booking, smart virtual number, 15-min wait tech.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next actions</CardTitle>
            <CardDescription>Jump into the engine</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href="/leads"
              className="inline-flex h-10 items-center rounded-lg bg-teal-500 px-4 text-sm font-semibold text-slate-950 hover:bg-teal-400"
            >
              Open Lead Finder
            </Link>
            <Link
              href="/outreach"
              className="inline-flex h-10 items-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-700"
            >
              Outreach campaigns
            </Link>
            <Link
              href="/pitch-studio"
              className="inline-flex h-10 items-center rounded-lg bg-[#1A365D] px-4 text-sm font-semibold text-white hover:bg-[#234a7a]"
            >
              Pitch studio
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
