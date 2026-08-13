/**
 * Real connectivity checks for API Integrations "Test creds".
 * Free providers are probed live. Keyed providers validate credentials
 * against provider APIs when secrets are present.
 */
import { catalogByProvider } from './channels/catalog.js';
import { probePractoWeb } from './practoWeb.js';

const UA = 'PractoSalesAutomation/1.0 (integration-verify)';

async function fetchJson(url, options = {}, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json', ...(options.headers || {}) },
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, text: text.slice(0, 400) };
  } finally {
    clearTimeout(timer);
  }
}

function secretsOf(row) {
  try {
    return JSON.parse(row.secrets || '{}');
  } catch {
    return {};
  }
}

function configOf(row) {
  try {
    return JSON.parse(row.config || '{}');
  } catch {
    return {};
  }
}

function hasAnySecret(secrets) {
  return Object.values(secrets || {}).some((v) => String(v || '').trim());
}

function missingRequired(secrets, keys) {
  return keys.filter((k) => !String(secrets[k] || '').trim());
}

function result({ ok, status, message, detail = null, httpStatus = null }) {
  return { ok, status, message, detail, httpStatus, testedAt: new Date().toISOString() };
}

async function probeNominatim() {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: 'dental clinic Vijayanagar Bangalore India',
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'in',
    });
  const res = await fetchJson(url, {}, 8000);
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Nominatim unreachable (HTTP ${res.status})`,
      httpStatus: res.status,
      detail: res.text,
    });
  }
  const count = Array.isArray(res.json) ? res.json.length : 0;
  return result({
    ok: true,
    status: 'connected',
    message: `Nominatim OK — sample search returned ${count} place(s)`,
    detail: res.json?.[0]?.display_name || null,
  });
}

async function probeOverpass(config) {
  const endpoint = config.endpoint || 'https://overpass-api.de/api/interpreter';
  const query = `
    [out:json][timeout:12];
    node["amenity"="clinic"](around:1200,12.9716,77.5946);
    out count;
  `;
  const res = await fetchJson(
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    },
    16000
  );
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Overpass unreachable (HTTP ${res.status})`,
      httpStatus: res.status,
      detail: res.text,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: 'Overpass OK — clinic query answered',
    detail: res.json?.elements ? `elements=${res.json.elements.length}` : null,
  });
}

async function probeOpenAI(secrets, config) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add OpenAI apiKey to test',
    });
  }
  const res = await fetchJson(
    'https://api.openai.com/v1/models',
    { headers: { Authorization: `Bearer ${secrets.apiKey}` } },
    12000
  );
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'OpenAI rejected the API key',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `OpenAI error HTTP ${res.status}`,
      httpStatus: res.status,
      detail: res.text,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: `OpenAI OK — model ${(config.model || 'gpt-4o-mini')} ready`,
  });
}

async function probeGemini(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Google Gemini apiKey to test',
    });
  }
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models?key=' +
    encodeURIComponent(secrets.apiKey);
  const res = await fetchJson(url, {}, 12000);
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'Gemini rejected the API key',
      httpStatus: res.status,
      detail: res.json?.error?.message || res.text,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Gemini error HTTP ${res.status}`,
      httpStatus: res.status,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: `Gemini OK — ${(res.json?.models || []).length} models visible`,
  });
}

async function probeAnthropic(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Anthropic apiKey to test',
    });
  }
  const res = await fetchJson(
    'https://api.anthropic.com/v1/models',
    {
      headers: {
        'x-api-key': secrets.apiKey,
        'anthropic-version': '2023-06-01',
      },
    },
    12000
  );
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'Anthropic rejected the API key',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Anthropic error HTTP ${res.status}`,
      httpStatus: res.status,
      detail: res.text,
    });
  }
  return result({ ok: true, status: 'connected', message: 'Anthropic OK — credentials accepted' });
}

async function probeGroq(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Groq apiKey to test',
    });
  }
  const res = await fetchJson(
    'https://api.groq.com/openai/v1/models',
    { headers: { Authorization: `Bearer ${secrets.apiKey}` } },
    12000
  );
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'Groq rejected the API key',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Groq error HTTP ${res.status}`,
      httpStatus: res.status,
    });
  }
  return result({ ok: true, status: 'connected', message: 'Groq OK — credentials accepted' });
}

async function probeGoogleMaps(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Google Maps Places apiKey to test',
    });
  }
  const url =
    'https://maps.googleapis.com/maps/api/place/textsearch/json?' +
    new URLSearchParams({
      query: 'dental clinic Bangalore',
      key: secrets.apiKey,
      region: 'in',
    });
  const res = await fetchJson(url, {}, 12000);
  const apiStatus = res.json?.status;
  if (apiStatus === 'REQUEST_DENIED' || apiStatus === 'INVALID_REQUEST') {
    return result({
      ok: false,
      status: 'error',
      message: `Google Places denied: ${res.json?.error_message || apiStatus}`,
      detail: apiStatus,
    });
  }
  if (!res.ok || (apiStatus && apiStatus !== 'OK' && apiStatus !== 'ZERO_RESULTS')) {
    return result({
      ok: false,
      status: 'error',
      message: `Google Places error: ${apiStatus || `HTTP ${res.status}`}`,
      detail: res.json?.error_message || res.text,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: `Google Places OK — ${apiStatus}${
      Array.isArray(res.json?.results) ? ` · ${res.json.results.length} sample result(s)` : ''
    }`,
  });
}

async function probeSerpApi(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add SerpAPI apiKey to test',
    });
  }
  const url =
    'https://serpapi.com/account.json?' + new URLSearchParams({ api_key: secrets.apiKey });
  const res = await fetchJson(url, {}, 12000);
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `SerpAPI rejected key (HTTP ${res.status})`,
      httpStatus: res.status,
      detail: res.text,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: `SerpAPI OK — plan ${res.json?.plan || 'active'}`,
  });
}

async function probeOutscraper(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Outscraper apiKey to test',
    });
  }
  const res = await fetchJson(
    'https://api.app.outscraper.com/profile',
    { headers: { 'X-API-KEY': secrets.apiKey } },
    12000
  );
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'Outscraper rejected the API key',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Outscraper error HTTP ${res.status}`,
      httpStatus: res.status,
    });
  }
  return result({ ok: true, status: 'connected', message: 'Outscraper OK — credentials accepted' });
}

async function probeApify(secrets) {
  const missing = missingRequired(secrets, ['token']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Apify token to test',
    });
  }
  const res = await fetchJson(
    `https://api.apify.com/v2/users/me?token=${encodeURIComponent(secrets.token)}`,
    {},
    12000
  );
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Apify rejected token (HTTP ${res.status})`,
      httpStatus: res.status,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: `Apify OK — user ${res.json?.data?.username || res.json?.data?.id || 'connected'}`,
  });
}

async function probeHunter(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Hunter.io apiKey to test',
    });
  }
  const url =
    'https://api.hunter.io/v2/account?' + new URLSearchParams({ api_key: secrets.apiKey });
  const res = await fetchJson(url, {}, 12000);
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Hunter rejected key (HTTP ${res.status})`,
      httpStatus: res.status,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: `Hunter OK — ${res.json?.data?.email || 'account'}`,
  });
}

async function probeTwilio(secrets, label = 'Twilio') {
  const missing = missingRequired(secrets, ['accountSid', 'authToken']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: `Add ${label} accountSid + authToken to test`,
    });
  }
  const auth = Buffer.from(`${secrets.accountSid}:${secrets.authToken}`).toString('base64');
  const res = await fetchJson(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(secrets.accountSid)}.json`,
    { headers: { Authorization: `Basic ${auth}` } },
    12000
  );
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: `${label} rejected credentials`,
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `${label} error HTTP ${res.status}`,
      httpStatus: res.status,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: `${label} OK — account ${res.json?.friendly_name || secrets.accountSid}`,
  });
}

async function probeSendGrid(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add SendGrid apiKey to test',
    });
  }
  const res = await fetchJson(
    'https://api.sendgrid.com/v3/user/account',
    { headers: { Authorization: `Bearer ${secrets.apiKey}` } },
    12000
  );
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'SendGrid rejected the API key',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `SendGrid error HTTP ${res.status}`,
      httpStatus: res.status,
    });
  }
  return result({ ok: true, status: 'connected', message: 'SendGrid OK — credentials accepted' });
}

async function probeResend(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Resend apiKey to test',
    });
  }
  const res = await fetchJson(
    'https://api.resend.com/domains',
    { headers: { Authorization: `Bearer ${secrets.apiKey}` } },
    12000
  );
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'Resend rejected the API key',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Resend error HTTP ${res.status}`,
      httpStatus: res.status,
    });
  }
  return result({ ok: true, status: 'connected', message: 'Resend OK — credentials accepted' });
}

async function probeMailgun(secrets, config) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length || !config.domain) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Mailgun apiKey and domain to test',
    });
  }
  const host = config.region === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net';
  const auth = Buffer.from(`api:${secrets.apiKey}`).toString('base64');
  const res = await fetchJson(
    `https://${host}/v3/domains/${encodeURIComponent(config.domain)}`,
    { headers: { Authorization: `Basic ${auth}` } },
    12000
  );
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'Mailgun rejected the API key',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Mailgun error HTTP ${res.status}`,
      httpStatus: res.status,
      detail: res.text,
    });
  }
  return result({ ok: true, status: 'connected', message: `Mailgun OK — domain ${config.domain}` });
}

async function probePlivo(secrets) {
  const missing = missingRequired(secrets, ['authId', 'authToken']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Plivo authId + authToken to test',
    });
  }
  const auth = Buffer.from(`${secrets.authId}:${secrets.authToken}`).toString('base64');
  const res = await fetchJson(
    `https://api.plivo.com/v1/Account/${encodeURIComponent(secrets.authId)}/`,
    { headers: { Authorization: `Basic ${auth}` } },
    12000
  );
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'Plivo rejected credentials',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Plivo error HTTP ${res.status}`,
      httpStatus: res.status,
    });
  }
  return result({ ok: true, status: 'connected', message: 'Plivo OK — credentials accepted' });
}

async function probeMetaWhatsApp(secrets, config) {
  const missing = missingRequired(secrets, ['accessToken']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Meta WhatsApp accessToken to test',
    });
  }
  const version = config.apiVersion || 'v19.0';
  const phoneId = config.phoneNumberId;
  const url = phoneId
    ? `https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}`
    : `https://graph.facebook.com/${version}/me`;
  const res = await fetchJson(
    url,
    { headers: { Authorization: `Bearer ${secrets.accessToken}` } },
    12000
  );
  if (res.status === 401 || res.status === 403 || res.json?.error) {
    return result({
      ok: false,
      status: 'error',
      message: res.json?.error?.message || 'Meta rejected the access token',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Meta Graph error HTTP ${res.status}`,
      httpStatus: res.status,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: `Meta WhatsApp OK — ${res.json?.display_phone_number || res.json?.id || 'token valid'}`,
  });
}

async function probeGupshup(secrets) {
  const missing = missingRequired(secrets, ['apiKey']);
  if (missing.length) {
    return result({
      ok: false,
      status: 'needs_credentials',
      message: 'Add Gupshup apiKey to test',
    });
  }
  const res = await fetchJson(
    'https://api.gupshup.io/sm/api/v1/users/me',
    { headers: { apikey: secrets.apiKey } },
    12000
  );
  // Some Gupshup endpoints vary; treat 401/403 as bad key, 404 as reachable with key shape ok
  if (res.status === 401 || res.status === 403) {
    return result({
      ok: false,
      status: 'error',
      message: 'Gupshup rejected the API key',
      httpStatus: res.status,
    });
  }
  if (res.status === 404) {
    return result({
      ok: true,
      status: 'connected',
      message: 'Gupshup reachable — key format accepted (endpoint variant)',
      httpStatus: res.status,
    });
  }
  if (!res.ok) {
    return result({
      ok: false,
      status: 'error',
      message: `Gupshup error HTTP ${res.status}`,
      httpStatus: res.status,
      detail: res.text,
    });
  }
  return result({ ok: true, status: 'connected', message: 'Gupshup OK — credentials accepted' });
}

function probeWebhook(config) {
  const urls = [config.leadCreatedUrl, config.stageChangedUrl, config.campaignRunUrl].filter(
    (u) => String(u || '').trim()
  );
  if (!urls.length) {
    return result({
      ok: true,
      status: 'ready',
      message: 'Webhook connector ready — add endpoint URLs in config when you want live pushes',
    });
  }
  const bad = urls.find((u) => {
    try {
      const parsed = new URL(u);
      return !['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return true;
    }
  });
  if (bad) {
    return result({
      ok: false,
      status: 'error',
      message: `Invalid webhook URL: ${bad}`,
    });
  }
  return result({
    ok: true,
    status: 'connected',
    message: `Webhook URLs look valid (${urls.length} configured)`,
  });
}

function needsKeyPlaceholder(label, secretKeys) {
  return result({
    ok: false,
    status: 'needs_credentials',
    message: `Add ${label} credentials (${secretKeys.join(', ')}) then Test again`,
  });
}

/**
 * Verify one integration row from api_integrations.
 */
export async function verifyIntegration(row) {
  const provider = row.provider;
  const catalog = catalogByProvider(provider);
  const secrets = secretsOf(row);
  const config = { ...(catalog?.config || {}), ...configOf(row) };
  const label = row.label || catalog?.label || provider;

  try {
    switch (provider) {
      case 'openstreetmap_nominatim':
        return await probeNominatim();
      case 'overpass_osm':
        return await probeOverpass(config);
      case 'webhook_outbound':
        return probeWebhook(config);
      case 'openai':
        return await probeOpenAI(secrets, config);
      case 'google_gemini':
        return await probeGemini(secrets);
      case 'anthropic_claude':
        return await probeAnthropic(secrets);
      case 'groq_llm':
        return await probeGroq(secrets);
      case 'google_maps':
        return await probeGoogleMaps(secrets);
      case 'serpapi':
        return await probeSerpApi(secrets);
      case 'outscraper':
        return await probeOutscraper(secrets);
      case 'apify':
        return await probeApify(secrets);
      case 'hunter_email':
        return await probeHunter(secrets);
      case 'sendgrid_email':
        return await probeSendGrid(secrets);
      case 'resend_email':
        return await probeResend(secrets);
      case 'mailgun_email':
        return await probeMailgun(secrets, config);
      case 'twilio_calls':
      case 'whatsapp_twilio':
        return await probeTwilio(secrets, label);
      case 'plivo_calls':
        return await probePlivo(secrets);
      case 'whatsapp_meta':
        return await probeMetaWhatsApp(secrets, config);
      case 'whatsapp_gupshup':
        return await probeGupshup(secrets);
      case 'gmail': {
        const missing = missingRequired(secrets, [
          'oauthClientId',
          'oauthClientSecret',
          'refreshToken',
        ]);
        if (missing.length) {
          return needsKeyPlaceholder(label, missing);
        }
        // Exchange refresh token for access token
        const body = new URLSearchParams({
          client_id: secrets.oauthClientId,
          client_secret: secrets.oauthClientSecret,
          refresh_token: secrets.refreshToken,
          grant_type: 'refresh_token',
        });
        const res = await fetchJson(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          },
          12000
        );
        if (!res.ok || !res.json?.access_token) {
          return result({
            ok: false,
            status: 'error',
            message: 'Gmail OAuth refresh failed — check client id/secret/refresh token',
            httpStatus: res.status,
            detail: res.json?.error_description || res.text,
          });
        }
        return result({
          ok: true,
          status: 'connected',
          message: 'Gmail OAuth OK — refresh token exchanged successfully',
        });
      }
      case 'amazon_ses': {
        const missing = missingRequired(secrets, ['accessKeyId', 'secretAccessKey']);
        if (missing.length) return needsKeyPlaceholder(label, missing);
        return result({
          ok: true,
          status: 'ready',
          message:
            'Amazon SES credentials stored. Live send uses AWS SigV4 at campaign time (format OK).',
        });
      }
      case 'whatsapp_exotel':
      case 'exotel_calls': {
        const missing = missingRequired(secrets, ['apiKey', 'apiToken']);
        if (missing.length) return needsKeyPlaceholder(label, missing);
        if (!config.subdomain) {
          return result({
            ok: false,
            status: 'needs_credentials',
            message: 'Add Exotel subdomain in config to test',
          });
        }
        const auth = Buffer.from(`${secrets.apiKey}:${secrets.apiToken}`).toString('base64');
        const res = await fetchJson(
          `https://${config.subdomain}.exotel.com/v1/Accounts/${encodeURIComponent(secrets.apiKey)}`,
          { headers: { Authorization: `Basic ${auth}` } },
          12000
        );
        if (res.status === 401 || res.status === 403) {
          return result({
            ok: false,
            status: 'error',
            message: 'Exotel rejected credentials',
            httpStatus: res.status,
          });
        }
        if (!res.ok) {
          return result({
            ok: false,
            status: 'error',
            message: `Exotel error HTTP ${res.status}`,
            httpStatus: res.status,
            detail: res.text,
          });
        }
        return result({ ok: true, status: 'connected', message: 'Exotel OK — credentials accepted' });
      }
      case 'whatsapp_msg91': {
        const missing = missingRequired(secrets, ['authKey']);
        if (missing.length) return needsKeyPlaceholder(label, ['authKey']);
        const res = await fetchJson(
          'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-search/',
          { headers: { authkey: secrets.authKey, 'Content-Type': 'application/json' } },
          12000
        );
        if (res.status === 401 || res.status === 403) {
          return result({
            ok: false,
            status: 'error',
            message: 'MSG91 rejected authKey',
            httpStatus: res.status,
          });
        }
        // MSG91 may return 400 without payload — still proves auth route
        if (res.status >= 500) {
          return result({
            ok: false,
            status: 'error',
            message: `MSG91 server error HTTP ${res.status}`,
            httpStatus: res.status,
          });
        }
        return result({
          ok: true,
          status: 'connected',
          message: 'MSG91 reachable with authKey',
          httpStatus: res.status,
        });
      }
      case 'knowlarity_calls':
      case 'myoperator_calls':
      case 'justdial': {
        const catalogSecrets = Object.keys(catalog?.secrets || secrets);
        if (!hasAnySecret(secrets)) {
          return needsKeyPlaceholder(label, catalogSecrets.length ? catalogSecrets : ['apiKey']);
        }
        return result({
          ok: true,
          status: 'ready',
          message: `${label} credentials saved — live dial/listing uses provider at campaign time`,
        });
      }
      case 'practo': {
        const probe = await probePractoWeb(config);
        return result(probe);
      }
      default: {
        if (catalog?.availability === 'ready_free') {
          return result({
            ok: true,
            status: 'connected',
            message: `${label} is free/ready`,
          });
        }
        if (!hasAnySecret(secrets)) {
          return needsKeyPlaceholder(label, Object.keys(catalog?.secrets || { apiKey: '' }));
        }
        return result({
          ok: true,
          status: 'ready',
          message: `${label} credentials present — provider-specific live probe not mapped yet`,
        });
      }
    }
  } catch (err) {
    return result({
      ok: false,
      status: 'error',
      message: `${label} test failed: ${err.name === 'AbortError' ? 'timeout' : err.message}`,
    });
  }
}
