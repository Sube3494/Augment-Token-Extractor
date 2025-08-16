export interface Env {
  ALLOWED_ORIGINS: string
  TENANT_URL_WHITELIST: string
}

function corsHeaders(origin: string | null, env: Env) {
  const allowed = env.ALLOWED_ORIGINS || '*'
  return {
    'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin && allowed.split(',').map(s => s.trim()).includes(origin) ? origin : 'null'),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Max-Age': '600'
  }
}

function json(body: unknown, init: ResponseInit = {}, extra: Record<string, string> = {}) {
  const he = new Headers(init.headers)
  he.set('content-type', 'application/json')
  for (const [k, v] of Object.entries(extra)) he.set(k, v)
  return new Response(JSON.stringify(body), { ...init, headers: he })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const origin = req.headers.get('origin')

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin, env) })
    }

    if (url.pathname !== '/token-proxy' || req.method !== 'POST') {
      return json({ error: 'not_found' }, { status: 404 }, corsHeaders(origin, env))
    }

    try {
      const { tenant_url, payload } = (await req.json()) as { tenant_url?: string; payload?: unknown }
      if (!tenant_url || typeof tenant_url !== 'string') return json({ error: 'tenant_url required' }, { status: 400 }, corsHeaders(origin, env))
      if (!payload || typeof payload !== 'object') return json({ error: 'payload required' }, { status: 400 }, corsHeaders(origin, env))

      if (!/^https:\/\/.+\/$/.test(tenant_url)) return json({ error: 'invalid tenant_url' }, { status: 400 }, corsHeaders(origin, env))

      const wl = (env.TENANT_URL_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean)
      if (wl.length && !wl.some(prefix => tenant_url.startsWith(prefix))) {
        return json({ error: 'tenant_url not allowed' }, { status: 400 }, corsHeaders(origin, env))
      }

      const upstreamUrl = tenant_url.replace(/\/$/, '') + '/token'
      const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const text = await upstream.text()
      const he = corsHeaders(origin, env)
      return new Response(text, {
        status: upstream.status,
        headers: { ...he, 'content-type': upstream.headers.get('content-type') || 'application/json' }
      })
    } catch (e: any) {
      return json({ error: 'proxy_error', message: e.message || String(e) }, { status: 500 }, corsHeaders(origin, env))
    }
  }
}

