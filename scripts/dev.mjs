import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { handleApi, messageLifetime } from '../server.js'
import { handleAdmin } from '../admin.js'

const messages = []
const prune = (now) => {
  while (messages.length && messages[0].entry.created <= now - messageLifetime) messages.shift()
}
const store = {
  list(season, now) {
    prune(now)
    return messages.filter(item => item.season === season).slice(-100).map(item => item.entry)
  },
  add(season, entry, sender) {
    prune(entry.created)
    if (messages.filter(item => item.sender === sender && item.entry.created > entry.created - 10000).length >= 8) return false
    messages.push({ season, entry, sender })
    return true
  }
}
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }
const vendor = new Set(['/vendor/three.module.min.js', '/vendor/three.core.min.js'])
const root = resolve('public')
const portArg = process.argv.findIndex(value => value === '--port' || value === '-p')
const port = Number((portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT) ?? 3000)
createServer(async (incoming, outgoing) => {
  try {
    const origin = (incoming.headers['x-forwarded-proto'] ?? 'http') + '://' + incoming.headers.host
    const url = new URL(incoming.url, origin)
    const method = incoming.method
    let response
    if (url.pathname === '/admin' || url.pathname === '/api/admin' || url.pathname.startsWith('/api/')) {
      const request = new Request(url, {
        method, headers: incoming.headers,
        ...(method !== 'GET' && method !== 'HEAD' ? { body: Readable.toWeb(incoming), duplex: 'half' } : {})
      })
      response = url.pathname === '/admin' || url.pathname === '/api/admin'
        ? await handleAdmin(request) : await handleApi(request, store)
    } else {
      const file = url.pathname === '/' ? '/index.html' : url.pathname
      const path = resolve(root, '.' + file)
      const type = types[extname(file)]
      const body = type && path.startsWith(root + sep) && await readFile(
        vendor.has(file) ? 'node_modules/three/build/' + file.split('/').at(-1) : path
      ).catch(() => null)
      response = body ? new Response(method === 'HEAD' ? null : body, {
        headers: { 'Content-Type': type + '; charset=utf-8' }
      }) : new Response('Not found', { status: 404 })
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers))
    outgoing.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error(error)
    outgoing.writeHead(500).end()
  }
}).listen(port, '0.0.0.0', () => console.log('Listening on port ' + port))
