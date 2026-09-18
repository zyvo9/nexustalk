import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { db, genId } from './db.js';
import { sign } from './jwt.js';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const publicUser = (u) =>
  u && {
    id: u.id,
    name: u.name,
    username: u.username,
    avatar: u.avatar,
    onboarded: !!u.onboarded,
  };

async function uniqueUsername(base) {
  let candidate = (base || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
  for (let i = 0; i < 20; i++) {
    const taken = await db.get('SELECT id FROM users WHERE username = ?', [candidate]);
    if (!taken) return candidate;
    candidate = `${candidate}${Math.floor(Math.random() * 99)}`.slice(0, 20);
  }
  return `user${Date.now() % 100000}`;
}

export async function registerRoutes(app) {
  // ---------------- health (public — the apps probe the server address) ----------------
  app.get('/api/health', async () => ({ ok: true, name: 'NexusTalk', version: 2 }));

  // ---------------- auth ----------------
  app.post('/api/auth/register', async (req, reply) => {
    const { email, password, name } = req.body ?? {};
    if (!email || !password) return reply.code(400).send({ error: 'Email and password required' });
    const exists = await db.get('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase()]);
    if (exists) return reply.code(409).send({ error: 'Email already registered' });
    const id = genId('u_');
    const hash = bcrypt.hashSync(String(password), 10);
    await db.run(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [id, String(email).toLowerCase(), hash, String(name || 'New user').slice(0, 60)]
    );
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    const token = await sign({ sub: id, name: user.name, email: user.email });
    return { token, user: publicUser(user) };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) return reply.code(400).send({ error: 'Email and password required' });
    const user = await db.get('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]);
    if (!user || !user.password_hash || !bcrypt.compareSync(String(password), user.password_hash)) {
      return reply.code(401).send({ error: 'Wrong email or password' });
    }
    const token = await sign({ sub: user.id, name: user.name, email: user.email });
    return { token, user: publicUser(user) };
  });

  app.get('/api/me', async (req) => ({ user: publicUser(req.user) }));

  app.patch('/api/me', async (req, reply) => {
    const { name, username, avatar } = req.body ?? {};
    const updates = [];
    const params = [];
    if (name !== undefined) {
      const n = String(name).trim().slice(0, 60);
      if (!n) return reply.code(400).send({ error: 'Name cannot be empty' });
      updates.push('name = ?');
      params.push(n);
    }
    if (username !== undefined) {
      const u = String(username).toLowerCase().trim();
      if (!USERNAME_RE.test(u)) {
        return reply.code(400).send({ error: 'Username: 3-20 chars, a-z 0-9 _ only' });
      }
      const taken = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [u, req.user.id]);
      if (taken) return reply.code(409).send({ error: 'Username already taken' });
      updates.push('username = ?', 'onboarded = 1');
      params.push(u);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(avatar === null ? null : String(avatar).slice(0, 300));
    }
    if (!updates.length) return { user: publicUser(req.user) };
    params.push(req.user.id);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return { user: publicUser(user) };
  });

  // ---------------- users ----------------
  app.get('/api/users/search', async (req) => {
    const q = String(req.query.q || '').toLowerCase().replace(/^@/, '').trim();
    if (q.length < 2) return { users: [] };
    const rows = await db.all(
      `SELECT id, name, username, avatar FROM users
       WHERE (username LIKE ? OR LOWER(name) LIKE ?) AND id != ?
       LIMIT 10`,
      [`${q}%`, `%${q}%`, req.user.id]
    );
    return { users: rows.map(publicUser) };
  });

  // ---------------- chats ----------------
  app.get('/api/chats', async (req) => {
    const memberships = await db.all(
      `SELECT c.* FROM chats c
       JOIN chat_members m ON m.chat_id = c.id
       WHERE m.user_id = ?`,
      [req.user.id]
    );
    const chats = [];
    for (const c of memberships) {
      const other = c.type === 'dm'
        ? await db.get(
            `SELECT u.id, u.name, u.username, u.avatar, u.last_seen FROM users u
             JOIN chat_members m2 ON m2.user_id = u.id
             WHERE m2.chat_id = ? AND u.id != ?`,
            [c.id, req.user.id]
          )
        : null;
      const last = await db.get(
        `SELECT body, created_at, sender_id FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1`,
        [c.id]
      );
      const unread = await db.get(
        `SELECT COUNT(*) AS n FROM messages WHERE chat_id = ? AND sender_id != ? AND created_at > COALESCE(?, '1970-01-01')`,
        [c.id, req.user.id, req.user.last_seen || '1970-01-01']
      );
      chats.push({
        id: c.id,
        type: c.type,
        title: c.type === 'group' ? c.title : other?.name ?? 'Chat',
        other,
        lastMessage: last ? { body: last.body, createdAt: last.created_at, mine: last.sender_id === req.user.id } : null,
        unread: unread?.n ?? 0,
      });
    }
    chats.sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''));
    return { chats };
  });

  app.post('/api/chats/dm', async (req, reply) => {
    const { username } = req.body ?? {};
    const target = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [String(username || '').toLowerCase().replace(/^@/, ''), String(username || '').toLowerCase()]
    );
    if (!target) return reply.code(404).send({ error: 'No user with that username' });
    if (target.id === req.user.id) return reply.code(400).send({ error: "That's you" });
    const existing = await db.get(
      `SELECT c.id FROM chats c
       JOIN chat_members a ON a.chat_id = c.id AND a.user_id = ?
       JOIN chat_members b ON b.chat_id = c.id AND b.user_id = ?
       WHERE c.type = 'dm'`,
      [req.user.id, target.id]
    );
    if (existing) return { chatId: existing.id, existing: true };
    const chatId = genId('c_');
    await db.batch([
      { sql: "INSERT INTO chats (id, type, created_by) VALUES (?, 'dm', ?)", params: [chatId, req.user.id] },
      { sql: 'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)', params: [chatId, req.user.id] },
      { sql: 'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)', params: [chatId, target.id] },
    ]);
    return { chatId, existing: false };
  });

  app.post('/api/chats/group', async (req, reply) => {
    const { title, usernames } = req.body ?? {};
    if (!title) return reply.code(400).send({ error: 'Group title required' });
    const members = Array.isArray(usernames) ? usernames : [];
    const ids = [req.user.id];
    for (const uname of members) {
      const u = await db.get('SELECT id FROM users WHERE username = ?', [String(uname).toLowerCase().replace(/^@/, '')]);
      if (u && !ids.includes(u.id)) ids.push(u.id);
    }
    if (ids.length < 3) return reply.code(400).send({ error: 'A group needs you + 2 members' });
    const chatId = genId('c_');
    await db.run("INSERT INTO chats (id, type, title, created_by) VALUES (?, 'group', ?, ?)", [chatId, String(title).slice(0, 80), req.user.id]);
    for (const uid of ids) {
      await db.run('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)', [chatId, uid]);
    }
    return { chatId };
  });

  app.get('/api/chats/:id/messages', async (req) => {
    const member = await db.get('SELECT 1 AS ok FROM chat_members WHERE chat_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!member) return { messages: [] };
    const rows = await db.all(
      `SELECT m.id, m.sender_id AS senderId, m.body, m.created_at AS createdAt,
              u.name AS senderName, u.avatar AS senderAvatar
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = ? ORDER BY m.created_at ASC LIMIT 200`,
      [req.params.id]
    );
    const atts = await db.all(
      `SELECT a.id, a.message_id AS messageId, a.name, a.mime, a.size FROM attachments a
       JOIN messages m2 ON m2.id = a.message_id WHERE m2.chat_id = ?`,
      [req.params.id]
    );
    const byMsg = {};
    for (const a of atts) (byMsg[a.messageId] ??= []).push({ id: a.id, name: a.name, mime: a.mime, size: a.size });
    return {
      messages: rows.map((r) => ({ ...r, attachments: byMsg[r.id] ?? [] })),
    };
  });

  // ---------------- files ----------------
  app.post('/api/uploads', async (req, reply) => {
    const { dataUrl, name, mime } = req.body ?? {};
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return reply.code(400).send({ error: 'dataUrl required' });
    }
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > config.maxUploadBytes) return reply.code(413).send({ error: 'File too large (max 8MB)' });
    const id = genId('f_');
    await db.run(
      'INSERT INTO attachments (id, owner_id, name, mime, size, data) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, String(name || 'file').slice(0, 120), String(mime || 'application/octet-stream'), buf.length, buf]
    );
    return { id, name: name ?? 'file', mime: mime ?? 'application/octet-stream', size: buf.length };
  });

  app.get('/api/files/:id', async (req, reply) => {
    const f = await db.get('SELECT name, mime, data FROM attachments WHERE id = ?', [req.params.id]);
    if (!f) return reply.code(404).send({ error: 'Not found' });
    reply.header('content-type', f.mime).header('content-disposition', `inline; filename="${encodeURIComponent(f.name)}"`);
    return reply.send(Buffer.from(f.data));
  });

  // ---------------- calls (history) ----------------
  app.get('/api/calls', async (req) => {
    const rows = await db.all(
      `SELECT c.id, c.type, c.status, c.duration, c.created_at AS createdAt,
              cu.name AS callerName, cu.username AS callerUsername, cu.avatar AS callerAvatar,
              ca.id AS calleeId, ca.name AS calleeName, ca.username AS calleeUsername, ca.avatar AS calleeAvatar
       FROM calls c
       JOIN users cu ON cu.id = c.caller_id
       JOIN users ca ON ca.id = c.callee_id
       WHERE c.caller_id = ? OR c.callee_id = ?
       ORDER BY c.created_at DESC LIMIT 50`,
      [req.user.id, req.user.id]
    );
    return {
      calls: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        duration: r.duration,
        createdAt: r.createdAt,
        outgoing: r.callerName === req.user.name || r.callerUsername === req.user.username,
        peer: r.callerName === req.user.name || r.callerUsername === req.user.username
          ? { id: r.calleeId, name: r.calleeName, username: r.calleeUsername, avatar: r.calleeAvatar }
          : { id: null, name: r.callerName, username: r.callerUsername, avatar: r.callerAvatar },
      })),
    };
  });
}
