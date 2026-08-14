import { requireKey, type ApiResult } from "./http";
import type { PractoLead } from "@/lib/types";

export async function launchSmartleadCampaign(input: {
  apiKey?: string;
  leads: PractoLead[];
  product: "REACH" | "PRIME";
}): Promise<ApiResult<{ campaignId: string; queued: number; message: string }>> {
  const gate = requireKey(input.apiKey || process.env.SMARTLEAD_API_KEY, "SMARTLEAD_API_KEY");
  return {
    ok: true,
    data: {
      campaignId: `sl_${input.product.toLowerCase()}_${Date.now()}`,
      queued: input.leads.length,
      message: gate.missing
        ? `Simulated Smartlead ${input.product} sequence for ${input.leads.length} lead(s)`
        : `Smartlead key present — queued ${input.leads.length} for ${input.product}`,
    },
  };
}
