"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/input";
import { useLeadsStore } from "@/lib/store/leads";
import { useSettingsStore } from "@/lib/store/settings";

export default function PitchStudioPage() {
  const leads = useLeadsStore((s) => s.leads);
  const upsertLead = useLeadsStore((s) => s.upsertLead);
  const settings = useSettingsStore((s) => s.settings);
  const [leadId, setLeadId] = useState(leads[0]?.id || "");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "linkedin">("whatsapp");
  const [script, setScript] = useState("");
  const [message, setMessage] = useState("");
  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);

  async function generateDeck() {
    if (!lead) return;
    const res = await fetch("/api/pitch/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead,
        keys: {
          GAMMA_API_KEY: settings.GAMMA_API_KEY,
          ELEVENLABS_API_KEY: settings.ELEVENLABS_API_KEY,
          ANTHROPIC_API_KEY: settings.ANTHROPIC_API_KEY,
        },
        channel,
      }),
    });
    const data = await res.json();
    if (data.pitchDeckUrl) upsertLead({ ...lead, pitchDeckUrl: data.pitchDeckUrl });
    if (data.script) setScript(data.script);
    setMessage(data.message || "Generated");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Pitch Deck Studio</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gamma 1-pagers · ElevenLabs voice notes · Claude scripts (email / WhatsApp / LinkedIn)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate collateral</CardTitle>
          <CardDescription>Personalized to specialty + locality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Lead</Label>
              <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.clinicName} · {l.locality}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Script channel</Label>
              <Select
                value={channel}
                onChange={(e) => setChannel(e.target.value as "email" | "whatsapp" | "linkedin")}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Cold email</option>
                <option value="linkedin">LinkedIn</option>
              </Select>
            </div>
          </div>
          {lead?.pitchHook ? (
            <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">
              Hook: {lead.pitchHook}
            </p>
          ) : null}
          <Button onClick={generateDeck}>Generate deck + script + voice note</Button>
          {message ? <p className="text-sm text-teal-200">{message}</p> : null}
          <div>
            <Label>Claude content studio output</Label>
            <Textarea value={script} onChange={(e) => setScript(e.target.value)} rows={10} />
          </div>
          {settings.WISPR_ENABLED ? (
            <p className="text-xs text-slate-500">
              Wispr Flow enabled in Settings — paste voice-to-text drafts into the script box.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
