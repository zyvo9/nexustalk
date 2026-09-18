import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketServer } from 'socket.io';
import jwt from './jwt.js';
import db from './db.js';
import { registerAuthRoutes } from './routes.auth.js';
import { registerChatRoutes } from './routes.chats.js';

const PORT = Number(process.env.PORT || 4000);

// Never let an unexpected error kill the whole server
process.on('uncaughtException', (err) => console.error('uncaughtException (server kept alive):', err && err.message));
process.on('unhandledRejection', (err) => console.error('unhandledRejection (server kept alive):', err && (err.message ?? err)));

// userId → agent socket id (the remote-control host agent)
const agentSockets = new Map();

// CORS: localhost for dev + extra origins (comma separated) for deploy
const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', ...extraOrigins];

const app = Fastify({ logger: { transport: undefined, level: 'info' } });

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});

registerAuthRoutes(app);
registerChatRoutes(app);

app.get('/api/health', async () => ({ ok: true, service: 'nexustalk-server', time: new Date().toISOString() }));

// ---------- Realtime (Socket.IO) ----------
const io = new SocketServer(app.server, {
  cors: { origin: allowedOrigins, credentials: true },
});
app.io = io;

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing token'));
    const payload = await jwt.verify(token);
    socket.data.user = { id: payload.sub, name: payload.name, email: payload.email };
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const me = socket.data.user;
  app.log.info({ user: me.email }, 'socket connected');

  // Personal room — used for calls invites, notifications etc. later.
  socket.join(`user:${me.id}`);

  socket.on('chat:join', ({ chatId }) => {
    if (!chatId) return;
    db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?')
      .get(chatId, me.id)
      .then((member) => {
        if (member) socket.join(`chat:${chatId}`);
      })
      .catch(() => undefined);
  });

  socket.on('chat:leave', ({ chatId }) => {
    if (chatId) socket.leave(`chat:${chatId}`);
  });

  socket.on('message:send', ({ chatId, body }, ack) => {
    (async () => {
      try {
        if (!chatId || !body || !String(body).trim()) throw new Error('chatId and body required');

        const member = await db
          .prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?')
          .get(chatId, me.id);
        if (!member) throw new Error('Not a member of this chat');

        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO messages (id, chat_id, sender_id, body) VALUES (?, ?, ?, ?)')
          .run(id, chatId, me.id, String(body).trim());

        const message = {
          id,
          chatId,
          body: String(body).trim(),
          at: new Date().toISOString(),
          senderId: me.id,
          senderName: me.name,
        };

        io.to(`chat:${chatId}`).emit('message:new', { chatId, message });
        ack?.({ ok: true, message: { ...message, mine: true } });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    })();
  });

  socket.on('typing', ({ chatId, isTyping }) => {
    if (!chatId) return;
    socket.to(`chat:${chatId}`).emit('typing', { chatId, user: { id: me.id, name: me.name }, isTyping: !!isTyping });
  });

  // ---- Call signaling (WebRTC P2P): the server only relays, media is peer-to-peer ----
  const relayTo = (event) => {
    socket.on(event, (data = {}) => {
      if (!data.to) return;
      socket.to(`user:${data.to}`).emit(event, { ...data, from: me.id });
    });
  };
  [
    'call:invite',    // { to, callType, fromName }      → ring the callee
    'call:accepted',  // { to }                          → caller starts offer
    'call:rejected',  // { to, reason? }                 → caller stops
    'call:offer',     // { to, sdp }                     → WebRTC offer
    'call:answer',    // { to, sdp }                     → WebRTC answer
    'call:ice',       // { to, candidate }               → ICE candidates
    'call:end',       // { to }                          → hang up
    'call:sharing',   // { to, sharing }                 → screen share state
    'call:control',   // { to, on }                      → grant/revoke remote control
  ].forEach(relayTo);

  // ---- Remote control (host agent registry + relay) ----
  socket.on('agent:hello', () => {
    agentSockets.set(me.id, socket.id);
    socket.emit('agent:hello-ack');
    socket.to(`user:${me.id}`).emit('agent:status', { online: true });
  });

  socket.on('agent:status-check', () => {
    socket.emit('agent:status', { online: agentSockets.has(me.id) });
  });

  socket.on('remote:request', () => {
    const agentSocketId = agentSockets.get(me.id);
    if (!agentSocketId) {
      socket.emit('remote:agent-offline');
      return;
    }
    io.to(agentSocketId).emit('remote:session-request', { from: socket.id, fromName: me.name });
  });

  const relayRemote = (event) => {
    socket.on(event, (data = {}) => {
      if (!data.to) return;
      io.to(data.to).emit(event, { ...data, from: socket.id });
    });
  };
  ['remote:offer', 'remote:answer', 'remote:ice', 'remote:end'].forEach(relayRemote);

  socket.on('disconnect', () => {
    if (!me) return;
    if (agentSockets.get(me.id) === socket.id) {
      agentSockets.delete(me.id);
      io.to(`user:${me.id}`).emit('agent:status', { online: false });
    }
  });
});

try {
  await app.listen({ port: PORT, host: process.env.HOST || '127.0.0.1' });
  app.log.info(`NexusTalk server running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
