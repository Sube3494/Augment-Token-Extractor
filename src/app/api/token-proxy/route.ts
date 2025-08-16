import { NextRequest, NextResponse } from 'next/server'

function corsResponse(body: BodyInit | null, status = 200) {
  const AO = process.env.ALLOWED_ORIGINS || '*'
  const res = new NextResponse(body, { status })
  res.headers.set('Access-Control-Allow-Origin', AO)
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  res.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.headers.set('Access-Control-Max-Age', '600')
  return res
}

export async function OPTIONS() {
  return corsResponse(null, 200)
}

export async function POST(req: NextRequest) {
  try {
    const { tenant_url, payload } = await req.json()
    if (!tenant_url || typeof tenant_url !== 'string') return corsResponse(JSON.stringify({ error: 'tenant_url required' }), 400)
    if (!payload || typeof payload !== 'object') return corsResponse(JSON.stringify({ error: 'payload required' }), 400)

    if (!/^https:\/\/.+\/$/.test(tenant_url)) return corsResponse(JSON.stringify({ error: 'invalid tenant_url' }), 400)

    const wl = (process.env.TENANT_URL_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean)
    if (wl.length && !wl.some(prefix => tenant_url.startsWith(prefix))) {
      return corsResponse(JSON.stringify({ error: 'tenant_url not allowed' }), 400)
    }

    const url = tenant_url.replace(/\/$/, '') + '/token'
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await upstream.text()
    const res = corsResponse(text, upstream.status)
    res.headers.set('content-type', upstream.headers.get('content-type') || 'application/json')
    return res
  } catch (e: any) {
    return corsResponse(JSON.stringify({ error: 'proxy_error', message: e.message || String(e) }), 500)
  }
}

