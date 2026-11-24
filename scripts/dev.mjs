import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { handleApi } from '../server.js'
import { createSqliteStore } from '../sqlite.js'
import { handleAdmin } from '../admin.js'

const store = createSqliteStore()
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }
const vendor = new Set(['/vendor/three.module.min.js', '/vendor/three.core.min.js'])
const root = resolve('public')
const portArg = process.argv.findIndex(value => value === '--port' || value === '-p')
const port = Number((portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT) ?? 3000)
const server = createServer(async (incoming, outgoing) => {
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
        ? await handleAdmin(request) : await handleApi(request, store, Date.now, incoming.socket.remoteAddress)
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

server.once('close', () => store.close())
