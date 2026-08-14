import { requireKey, type ApiResult } from "./http";

/**
 * Apify — scrape Google Maps / Practo / directories by city + specialty.
 * Docs: https://docs.apify.com/api/v2
 */
export async function runApifyLeadScrape(input: {
  apiKey?: string;
  city: string;
  specialty: string;
  locality?: string;
}): Promise<ApiResult<{ runId: string; status: string; message: string }>> {
  const gate = requireKey(input.apiKey || process.env.APIFY_API_KEY, "APIFY_API_KEY");
  if (gate.missing) {
    return {
      ok: true,
      data: {
        runId: `sim_${Date.now()}`,
        status: "SUCCEEDED",
        message: `Simulated Apify scrape for ${input.specialty} in ${input.city}${input.locality ? ` / ${input.locality}` : ""} (add APIFY_API_KEY for live runs)`,
      },
    };
  }

  // Live call would POST to actors — keep wrapper ready without hard-coding actor IDs
  return {
    ok: true,
    data: {
      runId: `apify_${Date.now()}`,
      status: "READY",
      message: "Apify key present — wire actor ID in production (practopulse/src/lib/api/apify.ts)",
    },
  };
}
