import { createHash } from 'node:crypto'
import { ChatStoreError, messageLifetime } from './server.js'

const post = `
local count = redis.call('INCR', KEYS[2])
if count == 1 then redis.call('PEXPIRE', KEYS[2], 10000) end
if count > 8 then return 0 end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[3])
redis.call('ZREMRANGEBYRANK', KEYS[1], 0, -101)
redis.call('PEXPIRE', KEYS[1], ARGV[4])
return 1
`

export function createRedisStore(env = process.env) {
  const credentials = [
    [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN],
    [env.KV_REST_API_URL, env.KV_REST_API_TOKEN]
  ].map(pair => pair.map(value => value?.trim()))
    .find(([url, token]) => url && token)
  const prefix = 'hearth:' + (env.VERCEL_ENV ?? 'production')
  async function command(...args) {
    if (!credentials) throw new ChatStoreError('CHAT_NOT_CONFIGURED')
    const [url, token] = credentials
    let result
    try {
      result = await fetch(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(4500)
      })
    } catch {
      throw new ChatStoreError('REDIS_REQUEST_FAILED')
    }
    if (!result.ok) throw new ChatStoreError('REDIS_HTTP_' + result.status)
    const data = await result.json()
    if (data.error) throw new ChatStoreError('REDIS_COMMAND_FAILED')
    return data.result
  }
  return {
    async list(season, now) {
      const entries = await command('ZREVRANGEBYSCORE', prefix + ':room:' + season, '+inf', '(' + (now - messageLifetime), 'LIMIT', 0, 100)
      return entries.reverse().map(entry => JSON.parse(entry))
    },
    async add(season, entry, sender) {
      const senderKey = createHash('sha256').update(sender).digest('hex')
      const result = await command('EVAL', post, 2, prefix + ':room:' + season, prefix + ':rate:' + senderKey,
        entry.created - messageLifetime, entry.created, JSON.stringify(entry), messageLifetime)
      return result === 1
    }
  }
}
