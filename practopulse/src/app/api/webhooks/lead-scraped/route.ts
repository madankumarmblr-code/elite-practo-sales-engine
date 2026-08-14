import { NextResponse } from "next/server";
import { pushLeadsToClay, triggerN8nWebhook } from "@/lib/api";
import { MOCK_LEADS } from "@/lib/mock/leads";

/** n8n → Clay enrichment trigger */
export async function POST(req: Request) {
  const body = await req.json();
  const leadIds: string[] = body.leadIds || [];
  const leads = MOCK_LEADS.filter((l) => leadIds.includes(l.id));
  const clay = await pushLeadsToClay({
    apiKey: body.keys?.CLAY_API_KEY || process.env.CLAY_API_KEY,
    leads: leads.length ? leads : MOCK_LEADS.slice(0, 3),
  });
  await triggerN8nWebhook({
    webhookUrl: body.keys?.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL,
    event: "clay-enrichment-started",
    payload: body,
  });
  return NextResponse.json({
    status: "ok",
    message: clay.ok ? clay.data.message : clay.error,
  });
}
