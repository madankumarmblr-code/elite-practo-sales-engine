import { NextResponse } from "next/server";
import { syncLeadToNotion } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json();
  const leads = body.leads || [];
  const results = [];
  for (const lead of leads) {
    const r = await syncLeadToNotion({ apiKey: body.keys?.NOTION_API_KEY, lead });
    results.push(r);
  }
  return NextResponse.json({
    synced: results.filter((r) => r.ok).length,
    message: `Notion sync attempted for ${leads.length} lead(s)`,
  });
}
