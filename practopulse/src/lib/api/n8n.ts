import { requireKey, type ApiResult } from "./http";

/** Forward events to n8n orchestration hub. */
export async function triggerN8nWebhook(input: {
  webhookUrl?: string;
  event: string;
  payload: Record<string, unknown>;
}): Promise<ApiResult<{ delivered: boolean; message: string }>> {
  const url = input.webhookUrl || process.env.N8N_WEBHOOK_URL;
  const gate = requireKey(url, "N8N_WEBHOOK_URL");
  if (gate.missing) {
    return {
      ok: true,
      data: {
        delivered: false,
        message: `Simulated n8n event '${input.event}' (configure N8N_WEBHOOK_URL)`,
      },
    };
  }
  try {
    const res = await fetch(url!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: input.event, ...input.payload }),
    });
    return {
      ok: true,
      data: {
        delivered: res.ok,
        message: res.ok ? `n8n accepted '${input.event}'` : `n8n HTTP ${res.status}`,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "n8n webhook failed",
    };
  }
}
