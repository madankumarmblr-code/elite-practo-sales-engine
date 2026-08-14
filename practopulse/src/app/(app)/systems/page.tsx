"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { selectedLeads } from "@/lib/store/leads";
import { useSettingsStore } from "@/lib/store/settings";

export default function SystemsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const [message, setMessage] = useState("");

  async function syncNotion() {
    const leads = selectedLeads();
    const targets = leads.length ? leads : [];
    if (!targets.length) {
      setMessage("Select leads in Lead Finder first (or sync will no-op).");
      return;
    }
    const res = await fetch("/api/systems/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leads: targets,
        keys: { NOTION_API_KEY: settings.NOTION_API_KEY },
      }),
    });
    const data = await res.json();
    setMessage(data.message || "Notion sync done");
  }

  async function syncObsidian() {
    const leads = selectedLeads();
    const res = await fetch("/api/systems/obsidian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leads: leads.length ? leads : [],
      }),
    });
    const data = await res.json();
    setMessage(data.message || "Obsidian notes staged");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Systems &amp; Vault Sync</h1>
        <p className="mt-1 text-sm text-slate-400">
          Notion Second Brain · Obsidian markdown vault · n8n bi-directional events
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notion</CardTitle>
            <CardDescription>Leads, habit trackers, content calendars</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={syncNotion}>Sync selected leads to Notion</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Obsidian</CardTitle>
            <CardDescription>Research notes, call summaries, objection logs</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={syncObsidian}>
              Stage Obsidian notes
            </Button>
          </CardContent>
        </Card>
      </div>
      {message ? <p className="text-sm text-teal-200">{message}</p> : null}
    </div>
  );
}
