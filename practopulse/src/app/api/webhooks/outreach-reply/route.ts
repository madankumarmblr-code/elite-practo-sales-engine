import { NextResponse } from "next/server";
import { triggerN8nWebhook } from "@/lib/api";

/** Update lead status when prospect replies / clicks */
export async function POST(req: Request) {
  const body = await req.json();
  await triggerN8nWebhook({
    webhookUrl: body.keys?.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL,
    event: "outreach-reply",
    payload: body,
  });
  return NextResponse.json({
    status: "ok",
    leadId: body.leadId,
    nextStatus: body.nextStatus || "OUTREACH_ACTIVE",
    message: `Lead ${body.leadId || "unknown"} marked from outreach reply — notify AE/SDR`,
  });
}
