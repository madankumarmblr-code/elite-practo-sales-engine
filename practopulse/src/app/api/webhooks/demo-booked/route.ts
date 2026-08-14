import { NextResponse } from "next/server";
import { createGoogleCalendarDemo, syncLeadToNotion, pushObsidianNote, triggerN8nWebhook } from "@/lib/api";
import { MOCK_LEADS } from "@/lib/mock/leads";

export async function POST(req: Request) {
  const body = await req.json();
  const lead = MOCK_LEADS.find((l) => l.id === body.leadId) || MOCK_LEADS[0];

  const gcal = await createGoogleCalendarDemo({
    clientId: body.keys?.GOOGLE_CALENDAR_CLIENT_ID,
    title: body.title || `Practo demo · ${lead.clinicName}`,
    startIso: body.startIso || new Date(Date.now() + 86400000).toISOString(),
    attendeeEmail: body.attendeeEmail || lead.email,
  });

  await syncLeadToNotion({
    apiKey: body.keys?.NOTION_API_KEY,
    lead: { ...lead, status: "DEMO_SCHEDULED" },
  });

  await pushObsidianNote({
    lead,
    note: `# Demo booked\n\n${body.title || lead.clinicName}\n\n${gcal.ok ? gcal.data.message : ""}`,
  });

  await triggerN8nWebhook({
    webhookUrl: body.keys?.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL,
    event: "demo-booked",
    payload: body,
  });

  return NextResponse.json({
    status: "ok",
    calendar: gcal.ok ? gcal.data : null,
    message: gcal.ok ? gcal.data.message : gcal.error,
  });
}
