import { DatabaseSync } from 'node:sqlite'
import { messageLifetime } from './server.js'

export function createSqliteStore() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      season TEXT NOT NULL,
      sender TEXT NOT NULL,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      created INTEGER NOT NULL
    );
    CREATE INDEX messages_created ON messages(created);
    CREATE INDEX messages_season_created ON messages(season, created);
    CREATE INDEX messages_sender_created ON messages(sender, created);
  `)
  const expire = db.prepare('DELETE FROM messages WHERE created <= ?')
  const recent = db.prepare(`
    SELECT id, name, message, created FROM messages
    WHERE season = ? AND created > ? ORDER BY created DESC, rowid DESC LIMIT 100
  `)
  const insert = db.prepare(`
    INSERT INTO messages (id, season, sender, name, message, created)
    SELECT ?, ?, ?, ?, ?, ? WHERE (
      SELECT COUNT(*) FROM messages WHERE sender = ? AND created > ?
    ) < 8
  `)
  const prune = now => expire.run(now - messageLifetime)
  const cleanup = setInterval(() => prune(Date.now()), 1000)
  cleanup.unref()
  return {
    list(season, now) {
      return recent.all(season, now - messageLifetime).reverse()
    },
    add(season, entry, sender) {
      prune(entry.created)
      return insert.run(entry.id, season, sender, entry.name, entry.message,
        entry.created, sender, entry.created - 10000).changes === 1
    },
    close() {
      clearInterval(cleanup)
      db.close()
    }
  }
}
