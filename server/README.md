# NexusTalk Server (Stage 1)

Real backend for NexusTalk — accounts, chats, messages, live updates.

## Run

```bash
npm install
npm run dev
```

Server runs on `http://localhost:4000`. The web UI (nexustalk folder) proxies
`/api` and `/socket.io` here automatically.

## What works now

- `POST /api/auth/register` — create account (name, email, password)
- `POST /api/auth/login` — login, returns JWT token (30 days)
- `GET  /api/me` — current user
- `GET  /api/chats` — your chats with last message + unread count
- `POST /api/chats/dm` — open a 1:1 chat by the other person's email
- `GET  /api/chats/:id/messages` — conversation history
- `POST /api/chats/:id/messages` — send a message (also broadcasts live)
- `GET  /api/users/search?q=` — find users by email

## Realtime (Socket.IO)

Connect with `auth: { token }`. Events:

- `chat:join` `{ chatId }` — join a chat room
- `message:send` `{ chatId, body }` — send live (persisted + broadcast)
- `message:new` — new message arrives (all members of the room)
- `typing` `{ chatId, isTyping }` — typing indicator

## Storage

SQLite database file `server/nexustalk.db` (zero setup). When we deploy to a
server, this swaps to PostgreSQL with the same schema.

## Before public deployment

- Change the JWT secret in `src/jwt.js`
- Put the server behind HTTPS
