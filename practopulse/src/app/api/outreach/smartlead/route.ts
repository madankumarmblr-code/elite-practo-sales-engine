import { NextResponse } from "next/server";
import { launchSmartleadCampaign } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await launchSmartleadCampaign({
    apiKey: body.keys?.SMARTLEAD_API_KEY,
    leads: body.leads || [],
    product: body.product === "REACH" ? "REACH" : "PRIME",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result.data);
}
