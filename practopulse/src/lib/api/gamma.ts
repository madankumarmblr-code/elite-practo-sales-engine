import { requireKey, type ApiResult } from "./http";
import type { PractoLead } from "@/lib/types";

export async function generateGammaDeck(input: {
  apiKey?: string;
  lead: PractoLead;
}): Promise<ApiResult<{ url: string; message: string }>> {
  const gate = requireKey(input.apiKey || process.env.GAMMA_API_KEY, "GAMMA_API_KEY");
  const url = `https://gamma.app/docs/practopulse-${input.lead.city}-${input.lead.specialty}-${input.lead.id}`.toLowerCase().replace(/\s+/g, "-");
  return {
    ok: true,
    data: {
      url,
      message: gate.missing
        ? `Simulated Gamma 1-pager for ${input.lead.clinicName} (${input.lead.specialty} · ${input.lead.locality})`
        : `Gamma key present — deck URL reserved for ${input.lead.clinicName}`,
    },
  };
}
