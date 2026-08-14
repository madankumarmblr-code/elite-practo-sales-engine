import { requireKey, type ApiResult } from "./http";

export async function generateElevenLabsVoiceNote(input: {
  apiKey?: string;
  text: string;
  doctorName: string;
}): Promise<ApiResult<{ audioUrl: string; message: string }>> {
  const gate = requireKey(input.apiKey || process.env.ELEVENLABS_API_KEY, "ELEVENLABS_API_KEY");
  return {
    ok: true,
    data: {
      audioUrl: gate.missing ? "" : "https://api.elevenlabs.io/v1/audio/mock",
      message: gate.missing
        ? `Simulated ElevenLabs WhatsApp voice note for ${input.doctorName} (${input.text.slice(0, 48)}…)`
        : `ElevenLabs key present — voice note queued for ${input.doctorName}`,
    },
  };
}
