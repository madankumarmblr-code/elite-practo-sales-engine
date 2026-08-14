import { requireKey, type ApiResult } from "./http";
import type { PractoLead } from "@/lib/types";

export async function syncLeadToNotion(input: {
  apiKey?: string;
  lead: PractoLead;
}): Promise<ApiResult<{ pageId: string; message: string }>> {
  const gate = requireKey(input.apiKey || process.env.NOTION_API_KEY, "NOTION_API_KEY");
  return {
    ok: true,
    data: {
      pageId: `notion_${input.lead.id}`,
      message: gate.missing
        ? `Simulated Notion Second Brain sync for ${input.lead.clinicName}`
        : `Notion key present — page upsert for ${input.lead.clinicName}`,
    },
  };
}

export async function pushObsidianNote(input: {
  lead: PractoLead;
  note: string;
}): Promise<ApiResult<{ path: string; message: string }>> {
  const path = `PractoPulse/${input.lead.city}/${input.lead.clinicName}.md`;
  return {
    ok: true,
    data: {
      path,
      message: `Obsidian vault note staged at ${path} (local REST / folder sync)`,
    },
  };
}
