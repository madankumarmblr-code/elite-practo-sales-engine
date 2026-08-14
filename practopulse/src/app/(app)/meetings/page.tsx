"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { useLeadsStore } from "@/lib/store/leads";
import { useSettingsStore } from "@/lib/store/settings";

export default function MeetingsPage() {
  const leads = useLeadsStore((s) => s.leads);
  const upsertLead = useLeadsStore((s) => s.upsertLead);
  const settings = useSettingsStore((s) => s.settings);
  const [leadId, setLeadId] = useState(leads[0]?.id || "");
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);

  async function pullFireflies() {
    if (!lead) return;
    const res = await fetch("/api/meetings/fireflies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        keys: { FIREFLIES_API_KEY: settings.FIREFLIES_API_KEY },
      }),
    });
    const data = await res.json();
    setSummary(data.summary || "");
    upsertLead({ ...lead, firefliesSummary: data.summary });
    setMessage(data.message || "Fireflies synced");
  }

  async function bookDemo() {
    if (!lead) return;
    const start = new Date(Date.now() + 2 * 86400000);
    start.setHours(16, 0, 0, 0);
    const res = await fetch("/api/webhooks/demo-booked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        title: `Practo ${lead.recommendedProduct} demo · ${lead.clinicName}`,
        startIso: start.toISOString(),
        attendeeEmail: lead.email,
        keys: {
          GOOGLE_CALENDAR_CLIENT_ID: settings.GOOGLE_CALENDAR_CLIENT_ID,
          NOTION_API_KEY: settings.NOTION_API_KEY,
          N8N_WEBHOOK_URL: settings.N8N_WEBHOOK_URL,
        },
      }),
    });
    const data = await res.json();
    upsertLead({ ...lead, status: "DEMO_SCHEDULED" });
    setMessage(data.message || "Calendar hold created");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Meeting Hub</h1>
        <p className="mt-1 text-sm text-slate-400">Google Calendar holds · Fireflies call intelligence</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead meeting workspace</CardTitle>
          <CardDescription>Pull transcripts into the prospect profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-lg">
            <Label>Lead</Label>
            <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.clinicName} · {l.status}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={bookDemo}>Book GCal demo</Button>
            <Button variant="secondary" onClick={pullFireflies}>
              Pull Fireflies summary
            </Button>
          </div>
          {message ? <p className="text-sm text-teal-200">{message}</p> : null}
          {summary || lead?.firefliesSummary ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300 whitespace-pre-wrap">
              {summary || lead?.firefliesSummary}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
