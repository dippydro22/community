CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  room TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created INTEGER NOT NULL,
  sender TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX messages_room_created ON messages (room, created);
--> statement-breakpoint
CREATE INDEX messages_created ON messages (created);
--> statement-breakpoint
CREATE INDEX messages_sender_created ON messages (sender, created);
