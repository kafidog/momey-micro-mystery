const ALLOWED_ORIGIN = 'https://kafidog.github.io';
const ALLOWED_SOURCES = new Set(['threads_h1', 'threads_h2', 'threads_h3']);
const ALLOWED_EVENTS = new Set([
  'qa_valid_visit',
  'qa_gr_now',
  'qa_gr_today',
  'qa_solo_browse',
  'qa_pull_serious',
  'qa_pull_playful',
  'qa_pull_none',
  'sr_valid_visit',
  'sr_gr_now',
  'sr_gr_today',
  'sr_solo_browse',
  'sr_pull_serious',
  'sr_pull_playful',
  'sr_pull_none'
]);

function corsHeaders(origin) {
  if (origin !== ALLOWED_ORIGIN) return {};
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function emptyResponse(status, origin) {
  return new Response(null, {
    status,
    headers: {
      ...corsHeaders(origin),
      'Cache-Control': 'no-store',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  });
}

function taipeiDay() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (url.pathname !== '/collect') return emptyResponse(404, origin);
    if (request.method === 'OPTIONS') {
      return emptyResponse(origin === ALLOWED_ORIGIN ? 204 : 403, origin);
    }
    if (request.method !== 'POST') return emptyResponse(405, origin);
    if (origin !== ALLOWED_ORIGIN) return emptyResponse(403, origin);

    const body = await request.text();
    if (body.length === 0 || body.length > 256) return emptyResponse(400, origin);

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return emptyResponse(400, origin);
    }

    if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
      return emptyResponse(400, origin);
    }

    const keys = Object.keys(payload).sort();
    if (keys.length !== 2 || keys[0] !== 'event_name' || keys[1] !== 'source') {
      return emptyResponse(400, origin);
    }

    const { source, event_name: eventName } = payload;
    if (!ALLOWED_SOURCES.has(source) || !ALLOWED_EVENTS.has(eventName)) {
      return emptyResponse(400, origin);
    }

    await env.COUNTS.prepare(
      `INSERT INTO event_counts (day, source, event_name, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (day, source, event_name)
       DO UPDATE SET count = count + 1`
    ).bind(taipeiDay(), source, eventName).run();

    return emptyResponse(204, origin);
  }
};
