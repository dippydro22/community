import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { readFile, mkdir } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { createApp } from '../server.js'
import { loadAssets } from './assets.mjs'

await mkdir('.local', {recursive:true})
const sqlite = new DatabaseSync('.local/chat.sqlite')
const schemaApplied = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'messages'").get()
if (!schemaApplied) sqlite.exec(await readFile('drizzle/0001_chat.sql', 'utf8'))
const DB = {
  prepare(sql) {
    return {
      bind(...values) {
        return {
          all: () => ({results:sqlite.prepare(sql).all(...values)}),
          run: () => ({meta:sqlite.prepare(sql).run(...values)})
        }
      }
    }
  }
}
const portArg = process.argv.findIndex(value => value === '--port' || value === '-p')
const port = Number((portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT) ?? 3000)
createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method
    const origin = (incoming.headers['x-forwarded-proto'] ?? 'http') + '://' + incoming.headers.host
    const request = new Request(new URL(incoming.url, origin), {
      method,
      headers: incoming.headers,
      ...(method !== 'GET' && method !== 'HEAD' ? {body:Readable.toWeb(incoming), duplex:'half'} : {})
    })
    const response = await createApp(await loadAssets()).fetch(request, {DB})
    outgoing.writeHead(response.status, Object.fromEntries(response.headers))
    outgoing.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error(error)
    outgoing.writeHead(500).end()
  }
}).listen(port, '0.0.0.0', () => console.log('Listening on port ' + port))
