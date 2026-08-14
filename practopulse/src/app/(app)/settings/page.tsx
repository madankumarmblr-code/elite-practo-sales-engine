"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { IntegrationSettings } from "@/lib/types";
import { useSettingsStore } from "@/lib/store/settings";

const FIELDS: { key: keyof IntegrationSettings; label: string; type?: string }[] = [
  { key: "APIFY_API_KEY", label: "APIFY_API_KEY" },
  { key: "CLAY_API_KEY", label: "CLAY_API_KEY" },
  { key: "SMARTLEAD_API_KEY", label: "SMARTLEAD_API_KEY" },
  { key: "HEYREACH_API_KEY", label: "HEYREACH_API_KEY" },
  { key: "N8N_WEBHOOK_URL", label: "N8N_WEBHOOK_URL" },
  { key: "ANTHROPIC_API_KEY", label: "ANTHROPIC_API_KEY" },
  { key: "GAMMA_API_KEY", label: "GAMMA_API_KEY" },
  { key: "ELEVENLABS_API_KEY", label: "ELEVENLABS_API_KEY" },
  { key: "FIREFLIES_API_KEY", label: "FIREFLIES_API_KEY" },
  { key: "NOTION_API_KEY", label: "NOTION_API_KEY" },
  { key: "GOOGLE_CALENDAR_CLIENT_ID", label: "GOOGLE_CALENDAR_CLIENT_ID" },
];

export default function SettingsPage() {
  const { settings, setSetting, reset } = useSettingsStore();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          API keys stored locally in your browser (Zustand persist). Prefer server env for production.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration keys</CardTitle>
          <CardDescription>Apify · Clay · Smartlead · HeyReach · n8n · Claude · Gamma · ElevenLabs · Fireflies · Notion · GCal</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <Label>{field.label}</Label>
              <Input
                type={field.type || "password"}
                autoComplete="off"
                value={String(settings[field.key] ?? "")}
                onChange={(e) => setSetting(field.key, e.target.value)}
                placeholder={`Enter ${field.label}`}
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-slate-300 md:col-span-2">
            <input
              type="checkbox"
              checked={settings.WISPR_ENABLED}
              onChange={(e) => setSetting("WISPR_ENABLED", e.target.checked)}
            />
            Enable Wispr Flow / speech-to-text drafting in Pitch Studio
          </label>
          <div className="md:col-span-2">
            <Button variant="secondary" onClick={reset}>
              Clear local keys
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
