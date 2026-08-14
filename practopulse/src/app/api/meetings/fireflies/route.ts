import { NextResponse } from "next/server";
import { fetchFirefliesSummary } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await fetchFirefliesSummary({
    apiKey: body.keys?.FIREFLIES_API_KEY,
    leadId: body.leadId,
    meetingId: body.meetingId,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ...result.data, message: "Fireflies summary attached to lead" });
}
