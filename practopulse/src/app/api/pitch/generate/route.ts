import { NextResponse } from "next/server";
import { generateGammaDeck, generateElevenLabsVoiceNote, generateOutreachScripts } from "@/lib/api";
import type { PractoLead } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lead = body.lead as PractoLead;
    if (!lead?.id) {
      return NextResponse.json({ error: "lead is required" }, { status: 400 });
    }
    const deck = await generateGammaDeck({ apiKey: body.keys?.GAMMA_API_KEY, lead });
    const scripts = await generateOutreachScripts({
      apiKey: body.keys?.ANTHROPIC_API_KEY,
      lead,
      channel: body.channel || "whatsapp",
    });
    const voice = await generateElevenLabsVoiceNote({
      apiKey: body.keys?.ELEVENLABS_API_KEY,
      doctorName: lead.doctorName,
      text: scripts.ok ? scripts.data.script : lead.pitchHook || "",
    });

    return NextResponse.json({
      pitchDeckUrl: deck.ok ? deck.data.url : undefined,
      script: scripts.ok ? scripts.data.script : "",
      voiceMessage: voice.ok ? voice.data.message : "",
      message: [
        deck.ok ? deck.data.message : deck.error,
        voice.ok ? voice.data.message : voice.error,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pitch generation failed" },
      { status: 500 }
    );
  }
}
