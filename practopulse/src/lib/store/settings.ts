"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IntegrationSettings } from "@/lib/types";

const EMPTY: IntegrationSettings = {
  APIFY_API_KEY: "",
  CLAY_API_KEY: "",
  SMARTLEAD_API_KEY: "",
  HEYREACH_API_KEY: "",
  N8N_WEBHOOK_URL: "",
  ANTHROPIC_API_KEY: "",
  GAMMA_API_KEY: "",
  ELEVENLABS_API_KEY: "",
  FIREFLIES_API_KEY: "",
  NOTION_API_KEY: "",
  GOOGLE_CALENDAR_CLIENT_ID: "",
  WISPR_ENABLED: false,
};

type SettingsState = {
  settings: IntegrationSettings;
  setSetting: <K extends keyof IntegrationSettings>(key: K, value: IntegrationSettings[K]) => void;
  setAll: (next: Partial<IntegrationSettings>) => void;
  reset: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: EMPTY,
      setSetting: (key, value) =>
        set((s) => ({ settings: { ...s.settings, [key]: value } })),
      setAll: (next) => set((s) => ({ settings: { ...s.settings, ...next } })),
      reset: () => set({ settings: EMPTY }),
    }),
    { name: "practopulse-settings" }
  )
);
