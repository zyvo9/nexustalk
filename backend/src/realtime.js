import { db, genId } from './db.js';
import { verify } from './jwt.js';

/**
 * Realtime layer (Socket.IO).
 * Wire protocol notes:
 *  - The Python host agent speaks: agent:hello, agent:status-check,
 *    remote:session-request / offer / answer / ice / end — keep stable.
 *  - Clients get presence (online + last seen), chat, calls + call history.
 */

export const agentSockets = new Map(); // userId -> agent socket id
export const userSockets = new Map(); // userId -> socket id (latest)

export function bindRealtime(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing token'));
      const payload = await verify(token);
      socket.data.user = { id: payload.sub, name: payload.name, email: payload.email };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const me = socket.data.user;
    userSockets.set(me.id, socket.id);
    socket.join(`user:${me.id}`);

    // ---------- presence ----------
    (async () => {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      await db.run('UPDATE users SET last_seen = ? WHERE id = ?', [now, me.id]);
      const contacts = await db.all(
        `SELECT DISTINCT u2.id FROM chat_members m1
         JOIN chat_members m2 ON m2.chat_id = m1.chat_id
         JOIN users u2 ON u2.id = m2.user_id
         WHERE m1.user_id = ? AND u2.id != ?`,
        [me.id, me.id]
      );
      for (const c of contacts) {
        io.to(`user:${c.id}`).emit('presence:update', { userId: me.id, online: true, lastSeen: now });
      }
    })();

    // ---------- chat ----------
    socket.on('chat:join', ({ chatId } = {}) => {
      if (chatId) socket.join(`chat:${chatId}`);
    });
    socket.on('chat:leave', ({ chatId } = {}) => {
      if (chatId) socket.leave(`chat:${chatId}`);
    });
    socket.on('typing', ({ chatId, isTyping } = {}) => {
      if (!chatId) return;
      socket.to(`chat:${chatId}`).emit('typing', { chatId, userId: me.id, name: me.name, isTyping: !!isTyping });
    });
    socket.on('message:send', async (data = {}, ack) => {
      const { chatId, body, attachmentIds } = data;
      if (!chatId || (!body && !(attachmentIds?.length))) return;
      const member = await db.get('SELECT 1 AS ok FROM chat_members WHERE chat_id = ? AND user_id = ?', [chatId, me.id]);
      if (!member) return;
      const msgId = genId('m_');
      await db.run('INSERT INTO messages (id, chat_id, sender_id, body) VALUES (?, ?, ?, ?)', [
        msgId, chatId, me.id, String(body ?? '').slice(0, 8000),
      ]);
      const cleanIds = (attachmentIds ?? []).slice(0, 8);
      for (const fid of cleanIds) {
        await db.run('UPDATE attachments SET message_id = ? WHERE id = ? AND owner_id = ? AND message_id IS NULL', [msgId, fid, me.id]);
      }
      const atts = [];
      for (const fid of cleanIds) {
        const a = await db.get('SELECT id, name, mime, size FROM attachments WHERE id = ? AND message_id = ?', [fid, msgId]);
        if (a) atts.push({ id: a.id, name: a.name, mime: a.mime, size: a.size });
      }
      const payload = {
        id: msgId,
        chatId,
        senderId: me.id,
        senderName: me.name,
        body: String(body ?? ''),
        attachments: atts,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      io.to(`chat:${chatId}`).emit('message:new', payload);
      // notify members who are not in the room (for chat list updates)
      const members = await db.all('SELECT user_id AS id FROM chat_members WHERE chat_id = ?', [chatId]);
      for (const m of members) {
        io.to(`user:${m.id}`).emit('chat:update', { chatId });
      }
      ack?.({ ok: true, id: msgId });
    });

    // ---------- calls (P2P; server relays signaling only) ----------
    const relayTo = (event) => {
      socket.on(event, (data = {}) => {
        if (!data.to) return;
        io.to(`user:${data.to}`).emit(event, { ...data, from: me.id, fromName: me.name });
      });
    };
    ['call:invite', 'call:accepted', 'call:rejected', 'call:offer', 'call:answer', 'call:ice', 'call:end', 'call:sharing']
      .forEach(relayTo);

    // Persist a call record when a call ends
    socket.on('call:end', async (data = {}) => {
      // caller records: { to, meta } — meta from caller keeps it simple
      if (data.meta && data.to) {
        const { callType, status, duration, calleeId } = data.meta;
        await db.run(
          'INSERT INTO calls (id, caller_id, callee_id, type, status, duration) VALUES (?, ?, ?, ?, ?, ?)',
          [genId('k_'), me.id, String(calleeId || data.to), String(callType || 'audio'),
           String(status || 'answered'), Number(duration || 0)]
        );
      }
    });

    // ---------- remote control (host agent registry + CRD sessions) ----------
    socket.on('agent:hello', () => {
      agentSockets.set(me.id, socket.id);
      socket.emit('agent:hello-ack');
      io.to(`user:${me.id}`).emit('agent:status', { online: true });
    });

    socket.on('agent:status-check', () => {
      socket.emit('agent:status', { online: agentSockets.has(me.id) });
    });

    // Devices-tab self session
    socket.on('remote:request', () => {
      const agentSocketId = agentSockets.get(me.id);
      if (!agentSocketId) return socket.emit('remote:agent-offline');
      io.to(agentSocketId).emit('remote:session-request', { from: socket.id, fromName: me.name });
    });

    // In-call grant: the HOST's agent streams to the selected peer
    socket.on('agent:start-session', (data = {}) => {
      const agentSocketId = agentSockets.get(me.id);
      const controllerSocketId = userSockets.get(data.to);
      if (!agentSocketId) return socket.emit('remote:agent-offline');
      if (!controllerSocketId) return socket.emit('remote:peer-offline');
      io.to(agentSocketId).emit('remote:session-request', { from: controllerSocketId, fromName: data.toName || '' });
      io.to(controllerSocketId).emit('remote:session-started', { hostName: me.name, hostId: me.id });
    });

    socket.on('agent:stop-session', (data = {}) => {
      const agentSocketId = agentSockets.get(me.id);
      const controllerSocketId = userSockets.get(data.by);
      if (agentSocketId) io.to(agentSocketId).emit('remote:end', { to: controllerSocketId });
      if (controllerSocketId) io.to(controllerSocketId).emit('remote:session-ended', { hostName: me.name });
    });

    const relayRemote = (event) => {
      socket.on(event, (data = {}) => {
        if (!data.to) return;
        io.to(data.to).emit(event, { ...data, from: socket.id });
      });
    };
    ['remote:offer', 'remote:answer', 'remote:ice', 'remote:end'].forEach(relayRemote);

    socket.on('disconnect', async () => {
      if (agentSockets.get(me.id) === socket.id) {
        agentSockets.delete(me.id);
        io.to(`user:${me.id}`).emit('agent:status', { online: false });
      }
      if (userSockets.get(me.id) === socket.id) {
        userSockets.delete(me.id);
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        await db.run('UPDATE users SET last_seen = ? WHERE id = ?', [now, me.id]);
        const contacts = await db.all(
          `SELECT DISTINCT u2.id FROM chat_members m1
           JOIN chat_members m2 ON m2.chat_id = m1.chat_id
           JOIN users u2 ON u2.id = m2.user_id
           WHERE m1.user_id = ? AND u2.id != ?`,
          [me.id, me.id]
        );
        for (const c of contacts) {
          io.to(`user:${c.id}`).emit('presence:update', { userId: me.id, online: false, lastSeen: now });
        }
      }
    });
  });
}
