import { createHash } from 'node:crypto'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { ChatStoreError, messageLifetime } from './server.js'

export function createFirebaseStore(env = process.env) {
  const databaseURL = env.FIREBASE_DATABASE_URL?.trim()
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  const namespace = env.VERCEL_ENV === 'production' ? 'production' : 'preview'
  let database

  function room(season) {
    if (!databaseURL || !serviceAccountJson) throw new ChatStoreError('CHAT_NOT_CONFIGURED')
    if (!database) {
      try {
        const appName = 'season-campfire'
        const app = getApps().find(item => item.name === appName) ??
          initializeApp({ databaseURL, credential: cert(JSON.parse(serviceAccountJson)) }, appName)
        database = getDatabase(app)
      } catch {
        throw new ChatStoreError('FIREBASE_CONFIG_INVALID')
      }
    }
    return database.ref('seasonCampfire/' + namespace + '/' + season)
  }

  return {
    async list(season, now) {
      const ref = room(season)
      const snapshot = await ref.get()
      const expired = {}
      const messages = []
      snapshot.forEach(child => {
        const { name, message, created } = child.val()
        if (created <= now - messageLifetime) expired[child.key] = null
        else messages.push({ id: child.key, name, message, created })
      })
      if (Object.keys(expired).length) await ref.update(expired)
      return messages.sort((a, b) => a.created - b.created || a.id.localeCompare(b.id)).slice(-100)
    },
    async add(season, entry, sender) {
      const senderHash = createHash('sha256').update(sender).digest('hex')
      const { id, name, message, created } = entry
      const result = await room(season).transaction(current => {
        const active = Object.entries(current ?? {}).filter(([, row]) => row.created > created - messageLifetime)
        const sentRecently = active.filter(([, row]) => row.sender === senderHash && row.created > created - 10000)
        if (sentRecently.length >= 8) return undefined
        return { ...Object.fromEntries(active), [id]: { name, message, created, sender: senderHash } }
      }, undefined, false)
      return result.committed
    }
  }
}
