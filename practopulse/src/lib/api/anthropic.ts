import { requireKey, type ApiResult } from "./http";
import type { PractoLead, ProductFit } from "@/lib/types";

/** Anthropic Claude — product-fit classifier + pitch hooks. */
export async function classifyLeadWithClaude(input: {
  apiKey?: string;
  lead: Pick<
    PractoLead,
    "clinicName" | "specialty" | "city" | "locality" | "googleRating" | "reviewCount" | "practoProfileStatus"
  >;
}): Promise<
  ApiResult<{ recommendedProduct: ProductFit; pitchHook: string; leadScore: number }>
> {
  const gate = requireKey(input.apiKey || process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY");
  const { lead } = input;

  // Heuristic classifier used when Claude key missing or as fallback
  let recommendedProduct: ProductFit = "REACH";
  if (lead.reviewCount >= 200 || lead.googleRating >= 4.5) recommendedProduct = "PRIME";
  if (lead.practoProfileStatus === "Ray User" || lead.practoProfileStatus === "Reach Active") {
    recommendedProduct = "HYBRID";
  }
  const pitchHook = `${lead.specialty} in ${lead.locality}, ${lead.city}: ${
    recommendedProduct === "PRIME"
      ? "strong reviews — pitch Prime booking + smart number"
      : recommendedProduct === "HYBRID"
        ? "existing Practo footprint — bundle Reach visibility + Prime conversion"
        : "low discovery — pitch Reach locality/specialty slots"
  }.`;

  if (gate.missing) {
    return {
      ok: true,
      data: {
        recommendedProduct,
        pitchHook: `[Simulated Claude] ${pitchHook}`,
        leadScore: Math.min(99, 55 + Math.round(lead.googleRating * 6) + Math.min(30, Math.floor(lead.reviewCount / 20))),
      },
    };
  }

  // Live Anthropic Messages API can be wired here
  return {
    ok: true,
    data: {
      recommendedProduct,
      pitchHook: `[Claude-ready] ${pitchHook}`,
      leadScore: Math.min(99, 60 + Math.round(lead.googleRating * 5)),
    },
  };
}

export async function generateOutreachScripts(input: {
  apiKey?: string;
  lead: PractoLead;
  channel: "email" | "whatsapp" | "linkedin";
}): Promise<ApiResult<{ script: string }>> {
  const product = input.lead.recommendedProduct;
  const script =
    input.channel === "email"
      ? `Subject: ${input.lead.specialty} growth in ${input.lead.locality}\n\nHi ${input.lead.doctorName},\n\nClinics like ${input.lead.clinicName} in ${input.lead.city} are using Practo ${product === "PRIME" ? "Prime" : product === "REACH" ? "Reach" : "Reach + Prime"} to drive patient discovery and bookings.\n\n${input.lead.pitchHook || ""}\n\nOpen to a 12-min walkthrough this week?\n\n— Practo Inside Sales`
      : input.channel === "whatsapp"
        ? `Hi ${input.lead.doctorName}, quick note from Practo for ${input.lead.clinicName} (${input.lead.locality}). ${input.lead.pitchHook || ""} Can I share a 1-pager on ${product}?`
        : `Hi ${input.lead.doctorName} — helping ${input.lead.specialty} practices in ${input.lead.city} with Practo ${product}. ${input.lead.pitchHook || ""} Worth a short chat?`;

  return { ok: true, data: { script } };
}
