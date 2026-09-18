import db, { uuid, dmKeyFor } from './db.js';
import { requireAuth } from './auth.js';

/** All chats the logged-in user belongs to, with the other member and last message. */
export function registerChatRoutes(app) {
  // ---- File upload (images/documents as data URLs, stored in DB) ----
  app.post('/api/upload', { preHandler: requireAuth }, async (request, reply) => {
    const { name, dataUrl } = request.body ?? {};
    if (!name || !dataUrl || typeof dataUrl !== 'string') {
      return reply.code(400).send({ error: 'name and dataUrl are required' });
    }
    const match = /^data:([\w./+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return reply.code(400).send({ error: 'dataUrl must be base64 image/file data' });
    const mime = match[1];
    const size = Math.floor((match[2].length * 3) / 4);
    if (size > 8 * 1024 * 1024) {
      return reply.code(413).send({ error: 'File too large (max 8 MB)' });
    }
    const id = uuid();
    await db.prepare('INSERT INTO files (id, name, mime, size, data, uploader_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, String(name).slice(0, 200), mime, size, Buffer.from(match[2], 'base64'), request.user.id);
    return reply.code(201).send({ file: { id, name: String(name).slice(0, 200), mime, size, url: `/api/files/${id}` } });
  });

  // Serve an uploaded file (IDs are unguessable UUIDs)
  app.get('/api/files/:fileId', async (request, reply) => {
    const file = await db.prepare('SELECT name, mime, data FROM files WHERE id = ?').get(request.params.fileId);
    if (!file) return reply.code(404).send({ error: 'Not found' });
    reply.header('Content-Type', file.mime);
    reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    return reply.send(file.data);
  });

  // ---- Groups ----
  app.post('/api/groups', { preHandler: requireAuth }, async (request, reply) => {
    const { name, usernames } = request.body ?? {};
    const groupName = String(name ?? '').trim();
    if (groupName.length < 2 || groupName.length > 50) {
      return reply.code(400).send({ error: 'Group name must be 2–50 characters' });
    }

    const chatId = uuid();
    await db.prepare("INSERT INTO chats (id, type, name) VALUES (?, 'group', ?)").run(chatId, groupName);

    const ins = db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)');
    await ins.run(chatId, request.user.id);

    const added = [{ id: request.user.id, name: request.user.name }];
    const findByName = db.prepare('SELECT id, name FROM users WHERE username = ?');
    for (const un of Array.isArray(usernames) ? usernames.slice(0, 50) : []) {
      const u = await findByName.get(String(un).toLowerCase());
      if (u && u.id !== request.user.id) {
        await ins.run(chatId, u.id);
        added.push({ id: u.id, name: u.name });
      }
    }

    return reply.code(201).send({ chatId, name: groupName, members: added });
  });

  app.get('/api/groups/:chatId/members', { preHandler: requireAuth }, async (request, reply) => {
    const { chatId } = request.params;
    const member = await db
      .prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?')
      .get(chatId, request.user.id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this chat' });
    const members = await db
      .prepare(
        `SELECT u.id, u.name, u.username, u.avatar
         FROM chat_members cm JOIN users u ON u.id = cm.user_id
         WHERE cm.chat_id = ?`
      )
      .all(chatId);
    return { members };
  });

  app.get('/api/chats', { preHandler: requireAuth }, async (request) => {
    const myId = request.user.id;

    const chats = await db
      .prepare(
        `
        SELECT c.id, c.type, c.name, c.created_at
        FROM chats c
        JOIN chat_members m ON m.chat_id = c.id
        WHERE m.user_id = ?
        ORDER BY c.created_at DESC
        `
      )
      .all(myId);

    const out = [];
    for (const c of chats) {
      const others = await db
        .prepare(
          `
          SELECT u.id, u.name, u.email, u.avatar, u.username
          FROM chat_members cm JOIN users u ON u.id = cm.user_id
          WHERE cm.chat_id = ? AND cm.user_id != ?
          `
        )
        .all(c.id, myId);
      const last = await db
        .prepare(
          `
          SELECT body, sender_id, created_at FROM messages
          WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1
          `
        )
        .get(c.id) ?? null;
      const unread = (
        await db
          .prepare('SELECT COUNT(*) AS n FROM messages WHERE chat_id = ? AND sender_id != ?')
          .get(c.id, myId)
      ).n;

      const isDm = c.type === 'dm';
      out.push({
        id: c.id,
        type: c.type,
        title: isDm ? (others[0]?.name ?? 'Saved messages') : (c.name ?? 'Group'),
        other: isDm ? (others[0] ?? null) : null,
        lastMessage: last ? { body: last.body, senderId: last.sender_id, at: last.created_at } : null,
        unread,
      });
    }

    return { chats: out };
  });

  /** Open (or create) a 1:1 chat with another user, found by username. */
  app.post('/api/chats/dm', { preHandler: requireAuth }, async (request, reply) => {
    const { username } = request.body ?? {};
    if (!username) return reply.code(400).send({ error: 'username is required' });

    const normalized = String(username).trim().toLowerCase();
    const other = await db
      .prepare('SELECT id, name, email, username FROM users WHERE username = ?')
      .get(normalized);
    if (!other) return reply.code(404).send({ error: `No user found with @${normalized}` });
    if (other.id === request.user.id) {
      return reply.code(400).send({ error: 'That is your own username' });
    }

    const key = dmKeyFor(request.user.id, other.id);
    let chat = await db.prepare('SELECT id FROM chats WHERE dm_key = ?').get(key);
    if (!chat) {
      const chatId = uuid();
      await db.prepare("INSERT INTO chats (id, type, dm_key) VALUES (?, 'dm', ?)").run(chatId, key);
      const ins = db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)');
      await ins.run(chatId, request.user.id);
      await ins.run(chatId, other.id);
      chat = { id: chatId };
    }

    return reply.code(201).send({ chatId: chat.id, other });
  });

  app.get('/api/chats/:chatId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { chatId } = request.params;

    const member = await db
      .prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?')
      .get(chatId, request.user.id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this chat' });

    const rows = await db
      .prepare(
        `
        SELECT m.id, m.body, m.created_at, m.sender_id, m.attachments, u.name AS sender_name
        FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC, m.id ASC
        `
      )
      .all(chatId);

    return {
      messages: rows.map((r) => ({
        id: r.id,
        body: r.body,
        at: r.created_at,
        senderId: r.sender_id,
        senderName: r.sender_name,
        attachments: r.attachments ? JSON.parse(r.attachments) : [],
        mine: r.sender_id === request.user.id,
      })),
    };
  });

  /** REST send (the socket path is preferred for live chats). */
  app.post('/api/chats/:chatId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { chatId } = request.params;
    const { body, attachments } = request.body ?? {};
    if ((!body || !String(body).trim()) && !(Array.isArray(attachments) && attachments.length)) {
      return reply.code(400).send({ error: 'Message body or attachments required' });
    }

    const member = await db
      .prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?')
      .get(chatId, request.user.id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this chat' });

    // Keep only file refs that actually exist in the files table
    const cleanAttachments = [];
    for (const a of Array.isArray(attachments) ? attachments.slice(0, 6) : []) {
      if (!a?.id) continue;
      const f = await db.prepare('SELECT id, name, mime, size FROM files WHERE id = ?').get(a.id);
      if (f) cleanAttachments.push(f);
    }

    const text = String(body ?? '').trim();
    const id = uuid();
    await db.prepare('INSERT INTO messages (id, chat_id, sender_id, body, attachments) VALUES (?, ?, ?, ?, ?)')
      .run(id, chatId, request.user.id, text || '', cleanAttachments.length ? JSON.stringify(cleanAttachments) : null);

    const msg = await db
      .prepare(
        `SELECT m.id, m.body, m.created_at, m.sender_id, m.attachments, u.name AS sender_name
         FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
      )
      .get(id);

    const broadcast = {
      id: msg.id,
      body: msg.body,
      at: msg.created_at,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
    };

    const io = app.io;
    if (io) {
      io.to(`chat:${chatId}`).emit('message:new', { chatId, message: broadcast });
    }

    return reply.code(201).send({ message: { ...broadcast, mine: true } });
  });

  /** Search people by username (used to add friends). */
  app.get('/api/users/search', { preHandler: requireAuth }, async (request) => {
    const q = String(request.query.q ?? '').trim().toLowerCase().replace(/^@/, '');
    if (q.length < 2) return { users: [] };
    const users = await db
      .prepare(
        `SELECT id, name, email, avatar, username FROM users
         WHERE username LIKE ? AND id != ? LIMIT 10`
      )
      .all(`${q}%`, request.user.id);
    // Exact username match first
    users.sort((a, b) => (a.username === q ? -1 : b.username === q ? 1 : 0));
    return { users };
  });
}
