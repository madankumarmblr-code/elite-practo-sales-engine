import { NextResponse } from "next/server";
import { launchHeyReachCampaign } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await launchHeyReachCampaign({
    apiKey: body.keys?.HEYREACH_API_KEY,
    leads: body.leads || [],
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result.data);
}
