import { NextResponse } from "next/server";
import { sourceAndEnrich } from "@/lib/services/sourcing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.city) {
      return NextResponse.json({ error: "city is required" }, { status: 400 });
    }
    const result = await sourceAndEnrich(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sourcing failed" },
      { status: 500 }
    );
  }
}
