const calendar = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric'
})
export const messageLifetime = 60000

export function getSeason(now = Date.now()) {
  const parts = Object.fromEntries(calendar.formatToParts(now).map(({ type, value }) => [type, value]))
  const month = Number(parts.month)
  const year = Number(parts.year)
  const season = month % 12 < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'autumn'
  const nextMonth = { winter: 2, spring: 5, summer: 8, autumn: 11 }[season]
  const nextYear = year + Number(month === 12)
  return { season, now, nextChange: Date.UTC(nextYear, nextMonth, 1) - 9 * 3600000 }
}

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store' }
})

async function readPayload(request) {
  const reader = request.body?.getReader()
  if (!reader) return { error: 400 }
  const decoder = new TextDecoder()
  let size = 0
  let raw = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 4096) {
      await reader.cancel()
      return { error: 413 }
    }
    raw += decoder.decode(value, { stream: true })
  }
  try { return { payload: JSON.parse(raw + decoder.decode()) } }
  catch { return { error: 400 } }
}

export async function handleApi(request, store, clock = Date.now) {
  const url = new URL(request.url)
  const state = getSeason(clock())
  if (url.pathname === '/api/season') {
    return request.method === 'GET' ? json(state) : json({ error: 'Method not allowed' }, 405)
  }
  if (url.pathname !== '/api/chat') return json({ error: 'Not found' }, 404)
  if (request.method === 'GET') {
    try {
      return json({ ...state, messages: await store.list(state.season, state.now) })
    } catch {
      return json({ ...state, error: 'Chat unavailable' }, 503)
    }
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const origin = request.headers.get('Origin')
  if (origin && origin !== url.origin) return json({ error: 'Invalid origin' }, 403)
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') {
    return json({ error: 'Expected JSON' }, 415)
  }
  const { error, payload } = await readPayload(request)
  if (error) return json({ error: 'Invalid body' }, error)
  const name = typeof payload?.name === 'string' ? payload.name.trim() : ''
  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  if (!name || name.length > 20 || !message || message.length > 300) {
    return json({ error: 'Invalid message' }, 400)
  }
  const current = getSeason(clock())
  if (payload.season !== current.season) return json(current, 409)
  const entry = { id: crypto.randomUUID(), name, message, created: current.now }
  const sender = request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'local'
  try {
    if (!await store.add(current.season, entry, sender)) return json({ error: 'Slow down' }, 429)
    return json({ id: entry.id }, 201)
  } catch {
    return json({ error: 'Chat unavailable' }, 503)
  }
}
