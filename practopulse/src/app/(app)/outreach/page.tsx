"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, Label } from "@/components/ui/input";
import { selectedLeads, useLeadsStore } from "@/lib/store/leads";
import { useSettingsStore } from "@/lib/store/settings";

export default function OutreachPage() {
  const settings = useSettingsStore((s) => s.settings);
  const selectedIds = useLeadsStore((s) => s.selectedIds);
  const upsertLead = useLeadsStore((s) => s.upsertLead);
  const [product, setProduct] = useState<"REACH" | "PRIME">("PRIME");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const count = Object.values(selectedIds).filter(Boolean).length;

  async function launchSmartlead() {
    setBusy(true);
    try {
      const leads = selectedLeads();
      const res = await fetch("/api/outreach/smartlead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads,
          product,
          keys: { SMARTLEAD_API_KEY: settings.SMARTLEAD_API_KEY },
        }),
      });
      const data = await res.json();
      for (const lead of leads) upsertLead({ ...lead, status: "OUTREACH_ACTIVE" });
      setMessage(data.message || "Smartlead launched");
    } finally {
      setBusy(false);
    }
  }

  async function launchHeyReach() {
    setBusy(true);
    try {
      const leads = selectedLeads();
      const res = await fetch("/api/outreach/heyreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads,
          keys: { HEYREACH_API_KEY: settings.HEYREACH_API_KEY },
        }),
      });
      const data = await res.json();
      setMessage(data.message || "HeyReach launched");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Outreach Campaigns</h1>
        <p className="mt-1 text-sm text-slate-400">
          Smartlead email sequences · HeyReach LinkedIn DMs · n8n orchestration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Launch from Lead Finder selection</CardTitle>
          <CardDescription>{count} lead(s) selected</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label>Smartlead product track</Label>
            <Select value={product} onChange={(e) => setProduct(e.target.value as "REACH" | "PRIME")}>
              <option value="REACH">Practo Reach sequence</option>
              <option value="PRIME">Practo Prime sequence</option>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !count} onClick={launchSmartlead}>
              Push to Smartlead
            </Button>
            <Button variant="navy" disabled={busy || !count} onClick={launchHeyReach}>
              Launch HeyReach LinkedIn
            </Button>
          </div>
          {message ? <p className="text-sm text-teal-200">{message}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
