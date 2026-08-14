"use client";

import { useMemo, useState } from "react";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadTable } from "@/components/leads/LeadTable";
import { Badge } from "@/components/ui/badge";
import type { PractoLead } from "@/lib/types";
import { filterLeads, useLeadsStore } from "@/lib/store/leads";
import { useSettingsStore } from "@/lib/store/settings";

export default function LeadsPage() {
  const { leads, filters, setLeads, upsertLead, sourcing, setSourcing, lastMessage, setMessage } =
    useLeadsStore();
  const settings = useSettingsStore((s) => s.settings);
  const [busyId, setBusyId] = useState("");

  const rows = useMemo(() => filterLeads(leads, filters), [leads, filters]);

  async function runSourcing() {
    setSourcing(true);
    setMessage("");
    try {
      const res = await fetch("/api/leads/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: filters.city,
          locality: filters.locality,
          specialties: filters.specialties,
          product: filters.product,
          keys: {
            APIFY_API_KEY: settings.APIFY_API_KEY,
            CLAY_API_KEY: settings.CLAY_API_KEY,
            ANTHROPIC_API_KEY: settings.ANTHROPIC_API_KEY,
            N8N_WEBHOOK_URL: settings.N8N_WEBHOOK_URL,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sourcing failed");
      if (Array.isArray(data.leads)) setLeads(data.leads);
      setMessage(data.message || "Sourcing complete");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sourcing failed");
    } finally {
      setSourcing(false);
    }
  }

  async function onSendDeck(lead: PractoLead) {
    setBusyId(lead.id);
    try {
      const res = await fetch("/api/pitch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead,
          keys: { GAMMA_API_KEY: settings.GAMMA_API_KEY, ELEVENLABS_API_KEY: settings.ELEVENLABS_API_KEY },
        }),
      });
      const data = await res.json();
      if (data.pitchDeckUrl) {
        upsertLead({ ...lead, pitchDeckUrl: data.pitchDeckUrl });
      }
      setMessage(data.message || "Deck generated");
    } finally {
      setBusyId("");
    }
  }

  async function onBookCall(lead: PractoLead) {
    setBusyId(lead.id);
    try {
      const start = new Date(Date.now() + 86400000);
      start.setHours(11, 0, 0, 0);
      const res = await fetch("/api/webhooks/demo-booked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          title: `Practo demo · ${lead.clinicName}`,
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
      setMessage(data.message || "Demo booked");
    } finally {
      setBusyId("");
    }
  }

  async function onPushSmartlead(lead: PractoLead) {
    setBusyId(lead.id);
    try {
      const product = lead.recommendedProduct === "REACH" ? "REACH" : "PRIME";
      const res = await fetch("/api/outreach/smartlead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: [lead],
          product,
          keys: { SMARTLEAD_API_KEY: settings.SMARTLEAD_API_KEY },
        }),
      });
      const data = await res.json();
      upsertLead({ ...lead, status: "OUTREACH_ACTIVE" });
      setMessage(data.message || "Pushed to Smartlead");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Finder</h1>
          <p className="mt-1 text-sm text-slate-400">
            City &amp; specialty engine · Apify sourcing · Clay enrich · Claude product-fit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="slate">{rows.length} shown</Badge>
          {sourcing || busyId ? <Badge tone="amber">Working…</Badge> : null}
        </div>
      </div>

      <LeadFilters onRun={runSourcing} />

      {lastMessage ? (
        <div className="rounded-lg border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">
          {lastMessage}
        </div>
      ) : null}

      <LeadTable
        rows={rows}
        onSendDeck={onSendDeck}
        onBookCall={onBookCall}
        onPushSmartlead={onPushSmartlead}
      />
    </div>
  );
}
