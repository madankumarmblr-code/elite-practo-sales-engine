import { requireKey, type ApiResult } from "./http";

export async function createGoogleCalendarDemo(input: {
  clientId?: string;
  title: string;
  startIso: string;
  attendeeEmail?: string;
}): Promise<ApiResult<{ eventId: string; htmlLink: string; message: string }>> {
  const gate = requireKey(
    input.clientId || process.env.GOOGLE_CALENDAR_CLIENT_ID,
    "GOOGLE_CALENDAR_CLIENT_ID"
  );
  const eventId = `gcal_${Date.now()}`;
  return {
    ok: true,
    data: {
      eventId,
      htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}`,
      message: gate.missing
        ? `Simulated GCal hold: ${input.title} @ ${input.startIso}`
        : `Google Calendar client configured — create event OAuth flow for ${input.title}`,
    },
  };
}
