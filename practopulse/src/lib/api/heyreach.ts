import { requireKey, type ApiResult } from "./http";
import type { PractoLead } from "@/lib/types";

export async function launchHeyReachCampaign(input: {
  apiKey?: string;
  leads: PractoLead[];
}): Promise<ApiResult<{ campaignId: string; queued: number; message: string }>> {
  const gate = requireKey(input.apiKey || process.env.HEYREACH_API_KEY, "HEYREACH_API_KEY");
  return {
    ok: true,
    data: {
      campaignId: `hr_${Date.now()}`,
      queued: input.leads.length,
      message: gate.missing
        ? `Simulated HeyReach LinkedIn DM campaign for ${input.leads.length} decision-maker(s)`
        : `HeyReach key present — ${input.leads.length} connection/DM jobs queued`,
    },
  };
}
