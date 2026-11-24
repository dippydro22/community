const rooms = new Set(['winter', 'spring', 'summer', 'autumn'])
const ttl = 60000

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store' }
})

export function createApp(assets) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url)
      if (url.pathname !== '/api/chat') {
        const asset = assets[url.pathname === '/' ? '/index.html' : url.pathname]
        if (!asset || !Object.hasOwn(assets, url.pathname === '/' ? '/index.html' : url.pathname)) {
          return new Response('Not found', { status: 404 })
        }
        return new Response(request.method === 'HEAD' ? null : asset.body, {
          headers: { 'Content-Type': asset.type, 'Cache-Control': 'no-cache' }
        })
      }

      const room = url.searchParams.get('room')
      if (!rooms.has(room)) return json({error:'Unknown room'}, 400)
      const db = env.DB
      const now = Date.now()
      try {
        await db.prepare('DELETE FROM messages WHERE created <= ?').bind(now - ttl).run()
        if (request.method === 'GET') {
          const {results} = await db.prepare(
            'SELECT id, name, message, created FROM (SELECT id, name, message, created FROM messages WHERE room = ? AND created > ? ORDER BY created DESC, id DESC LIMIT 100) ORDER BY created, id'
          ).bind(room, now - ttl).all()
          return json({now, messages:results})
        }
        if (request.method !== 'POST') return json({error:'Method not allowed'}, 405)
        if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({error:'Invalid origin'}, 403)
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Expected JSON'}, 415)
        const reader = request.body?.getReader()
        if (!reader) return json({error:'Missing body'}, 400)
        let size = 0
        let raw = ''
        const decoder = new TextDecoder()
        while (true) {
          const {done, value} = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > 4096) {
            await reader.cancel()
            return json({error:'Body too large'}, 413)
          }
          raw += decoder.decode(value, {stream:true})
        }
        raw += decoder.decode()
        let payload
        try { payload = JSON.parse(raw) } catch { return json({error:'Invalid JSON'}, 400) }
        const name = typeof payload?.name === 'string' ? payload.name.trim() : ''
        const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
        if (!name || name.length > 20 || !message || message.length > 300) return json({error:'Invalid message'}, 400)
        const id = crypto.randomUUID()
        const sender = request.headers.get('CF-Connecting-IP') ?? 'local'
        const result = await db.prepare(
          'INSERT INTO messages (id, room, name, message, created, sender) SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM messages WHERE sender = ? AND created > ?) < 8'
        ).bind(id, room, name, message, now, sender, sender, now - 10000).run()
        if (!result.meta.changes) return json({error:'Too many messages'}, 429)
        return json({id}, 201)
      } catch (error) {
        console.error('Chat database error', error)
        return json({error:'Chat unavailable'}, 503)
      }
    }
  }
}
