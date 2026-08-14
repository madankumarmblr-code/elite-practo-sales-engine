import { requireKey, type ApiResult } from "./http";
import type { PractoLead } from "@/lib/types";

/** Clay — enrich emails/phones + decision-maker roles. */
export async function pushLeadsToClay(input: {
  apiKey?: string;
  leads: PractoLead[];
}): Promise<ApiResult<{ enriched: number; message: string }>> {
  const gate = requireKey(input.apiKey || process.env.CLAY_API_KEY, "CLAY_API_KEY");
  if (gate.missing) {
    return {
      ok: true,
      data: {
        enriched: input.leads.length,
        message: `Simulated Clay enrichment for ${input.leads.length} lead(s)`,
      },
    };
  }
  return {
    ok: true,
    data: {
      enriched: input.leads.length,
      message: "Clay key present — connect table webhook URL for live sync",
    },
  };
}
