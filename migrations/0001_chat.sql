CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  room TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created INTEGER NOT NULL,
  sender TEXT NOT NULL
);
CREATE INDEX messages_room_created ON messages (room, created);
CREATE INDEX messages_created ON messages (created);
CREATE INDEX messages_sender_created ON messages (sender, created);
