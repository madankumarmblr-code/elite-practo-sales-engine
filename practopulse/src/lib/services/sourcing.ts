import { MOCK_LEADS } from "@/lib/mock/leads";
import { runApifyLeadScrape, pushLeadsToClay, classifyLeadWithClaude, triggerN8nWebhook } from "@/lib/api";
import type { PractoLead } from "@/lib/types";

export async function sourceAndEnrich(body: {
  city: string;
  locality?: string;
  specialties?: string[];
  product?: string;
  keys?: Record<string, string>;
}) {
  const specialty = body.specialties?.[0] || "General Physician";
  const apify = await runApifyLeadScrape({
    apiKey: body.keys?.APIFY_API_KEY,
    city: body.city,
    specialty,
    locality: body.locality,
  });

  let leads: PractoLead[] = MOCK_LEADS.filter((l) => {
    if (l.city !== body.city) return false;
    if (body.specialties?.length && !body.specialties.includes(l.specialty)) return false;
    return true;
  });

  if (body.locality) {
    const localityHits = leads.filter((l) =>
      l.locality.toLowerCase().includes(String(body.locality).toLowerCase())
    );
    if (localityHits.length) leads = localityHits;
  }

  if (!leads.length) {
    const id = `lead_${body.city}_${specialty}_${Date.now()}`.toLowerCase().replace(/\s+/g, "_");
    leads = [
      {
        id,
        doctorName: "Dr. Prospect",
        clinicName: `${specialty} Care · ${body.city}`,
        specialty,
        city: body.city,
        locality: body.locality || "City Center",
        address: `${body.locality || "City Center"}, ${body.city}`,
        phone: "+919999000111",
        email: "prospect@clinic.example",
        googleRating: 4.0,
        reviewCount: 40,
        practoProfileStatus: "Unclaimed",
        recommendedProduct: "REACH",
        status: "NEW",
        leadScore: 60,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const clay = await pushLeadsToClay({ apiKey: body.keys?.CLAY_API_KEY, leads });

  const enriched: PractoLead[] = [];
  for (const lead of leads) {
    const classified = await classifyLeadWithClaude({
      apiKey: body.keys?.ANTHROPIC_API_KEY,
      lead,
    });
    if (classified.ok) {
      enriched.push({
        ...lead,
        status: "ENRICHED",
        recommendedProduct: classified.data.recommendedProduct,
        pitchHook: classified.data.pitchHook,
        leadScore: classified.data.leadScore,
        decisionMaker: lead.decisionMaker || "Managing Doctor",
      });
    } else {
      enriched.push({ ...lead, status: "ENRICHED" });
    }
  }

  const byId = new Map(MOCK_LEADS.map((l) => [l.id, l]));
  for (const l of enriched) byId.set(l.id, l);
  const merged = Array.from(byId.values());

  await triggerN8nWebhook({
    webhookUrl: body.keys?.N8N_WEBHOOK_URL,
    event: "lead-scraped",
    payload: { city: body.city, specialty, count: enriched.length },
  });

  return {
    leads: merged,
    enrichedCount: enriched.length,
    message: [
      apify.ok ? apify.data.message : apify.error,
      clay.ok ? clay.data.message : clay.error,
      `Classified ${enriched.length} lead(s) for ${body.city}`,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}
