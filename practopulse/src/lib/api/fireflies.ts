import { requireKey, type ApiResult } from "./http";

export async function fetchFirefliesSummary(input: {
  apiKey?: string;
  meetingId?: string;
  leadId: string;
}): Promise<ApiResult<{ summary: string; actionItems: string[] }>> {
  const gate = requireKey(input.apiKey || process.env.FIREFLIES_API_KEY, "FIREFLIES_API_KEY");
  return {
    ok: true,
    data: {
      summary: gate.missing
        ? `Simulated Fireflies summary for lead ${input.leadId}: prospect interested in ROI on missed calls; asked for locality inventory.`
        : `Fireflies key present — pull transcript for meeting ${input.meetingId || "latest"}`,
      actionItems: [
        "Send Commercial Proposal Suite 1-pager",
        "Confirm decision-maker availability",
        "Schedule follow-up demo",
      ],
    },
  };
}
