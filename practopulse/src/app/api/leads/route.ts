import { NextResponse } from "next/server";
import { MOCK_LEADS } from "@/lib/mock/leads";

export async function GET() {
  return NextResponse.json({ leads: MOCK_LEADS, count: MOCK_LEADS.length });
}
