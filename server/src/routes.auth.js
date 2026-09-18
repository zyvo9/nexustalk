import bcrypt from 'bcryptjs';
import db, { uuid, genNexId } from './db.js';
import jwt from './jwt.js';
import { requireAuth } from './auth.js';

// ---------------------------------------------------------------------------
// Google OAuth (sign-in only)
// ---------------------------------------------------------------------------

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    publicBase: (process.env.PUBLIC_BASE || 'http://localhost:4000').replace(/\/$/, ''),
    frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, ''),
  };
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    nexId: u.nex_id,
    onboarded: !!u.onboarded,
    hasGoogle: !!u.google_id,
  };
}

/** Usernames: 3–20 chars, lowercase letters, numbers, underscores. */
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function registerAuthRoutes(app) {
  // ---- Email + password ----
  app.post('/api/auth/register', async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password are required' });
    }
    if (password.length < 6) {
      return reply.code(400).send({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return reply.code(409).send({ error: 'An account with this email already exists' });
    }

    const id = uuid();
    const passwordHash = await bcrypt.hash(password, 10);
    await db.prepare(
      'INSERT INTO users (id, name, email, password_hash, nex_id) VALUES (?, ?, ?, ?, ?)'
    ).run(id, 'NexusTalk user', normalizedEmail, passwordHash, await genNexId());

    const token = await jwt.sign({ sub: id, email: normalizedEmail });
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return reply.code(201).send({ token, user: publicUser(user) });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ error: 'Wrong email or password' });
    }

    const token = await jwt.sign({ sub: user.id, name: user.name, email: user.email });
    return reply.send({ token, user: publicUser(user) });
  });

  // ---- Current user ----
  app.get('/api/me', { preHandler: requireAuth }, async (request) => {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(request.user.id);
    return { user: publicUser(user) };
  });

  /** Onboarding / profile updates: name, username, avatar (data URL). */
  app.patch('/api/me', { preHandler: requireAuth }, async (request, reply) => {
    const { name, username, avatar } = request.body ?? {};
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(request.user.id);

    let newName = user.name;
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2 || trimmed.length > 40) {
        return reply.code(400).send({ error: 'Name must be 2–40 characters' });
      }
      newName = trimmed;
    }

    let newUsername = user.username;
    if (username !== undefined) {
      const normalized = String(username).trim().toLowerCase();
      if (!USERNAME_RE.test(normalized)) {
        return reply.code(400).send({ error: 'Username: 3–20 characters, only a-z, 0-9 and _' });
      }
      const taken = await db
        .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
        .get(normalized, user.id);
      if (taken) {
        return reply.code(409).send({ error: `"${normalized}" is already taken` });
      }
      newUsername = normalized;
    }

    let newAvatar = user.avatar;
    if (avatar !== undefined) {
      if (avatar === null || avatar === '') {
        newAvatar = null;
      } else if (typeof avatar === 'string' && avatar.startsWith('data:image/') && avatar.length < 300000) {
        newAvatar = avatar;
      } else {
        return reply.code(400).send({ error: 'Avatar must be a small image (data URL)' });
      }
    }

    if (newUsername === null || newUsername === undefined) {
      return reply.code(400).send({ error: 'A username is required to finish setting up' });
    }

    await db.prepare('UPDATE users SET name = ?, username = ?, avatar = ?, onboarded = 1 WHERE id = ?')
      .run(newName, newUsername, newAvatar, user.id);
    const fresh = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    return { user: publicUser(fresh) };
  });

  registerGoogleRoutes(app);
}

// ---------------------------------------------------------------------------
// Google Sign-In (Authorization Code flow, handled server-side)
// ---------------------------------------------------------------------------

const oauthStates = new Map(); // state -> createdAt (single-use, 10 min)

function registerGoogleRoutes(app) {
  app.get('/api/auth/google/status', async () => {
    const { clientId, clientSecret } = googleConfig();
    return { enabled: !!(clientId && clientSecret) };
  });

  app.get('/api/auth/google/start', async (request, reply) => {
    const { clientId, publicBase } = googleConfig();
    if (!clientId) {
      return reply
        .code(500)
        .send({ error: 'Google login is not configured yet (missing GOOGLE_CLIENT_ID in server/.env)' });
    }

    const state = crypto.randomUUID();
    oauthStates.set(state, Date.now());

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', `${publicBase}/api/auth/google/callback`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'select_account');

    return reply.redirect(url.toString());
  });

  app.get('/api/auth/google/callback', async (request, reply) => {
    const { clientId, clientSecret, publicBase, frontendUrl } = googleConfig();
    const { code, state, error } = request.query ?? {};

    if (error) return reply.redirect(`${frontendUrl}/?authError=${encodeURIComponent(error)}`);
    if (!code || !state || !oauthStates.has(state)) {
      return reply.redirect(`${frontendUrl}/?authError=invalid_state`);
    }
    oauthStates.delete(state);
    for (const [s, t] of oauthStates) {
      if (Date.now() - t > 10 * 60 * 1000) oauthStates.delete(s);
    }

    // Exchange the code for tokens (any failure → back to the app with an error flag)
    let tokens, profile;
    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${publicBase}/api/auth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenRes.ok) {
        return reply.redirect(`${frontendUrl}/?authError=token_exchange_failed`);
      }
      tokens = await tokenRes.json();

      const profileRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!profileRes.ok) {
        return reply.redirect(`${frontendUrl}/?authError=profile_failed`);
      }
      profile = await profileRes.json();
    } catch {
      return reply.redirect(`${frontendUrl}/?authError=network_error`);
    }
    if (!profile.email) {
      return reply.redirect(`${frontendUrl}/?authError=no_email`);
    }

    // Link by google_id first, then by email (returning user → straight in)
    let user = await db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.sub);
    if (!user) {
      user = await db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(String(profile.email).toLowerCase());
    }

    if (user) {
      await db.prepare('UPDATE users SET google_id = ?, name = ?, avatar = ? WHERE id = ?')
        .run(profile.sub, profile.name ?? user.name, profile.picture ?? user.avatar, user.id);
      const fresh = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      const token = await jwt.sign({
        sub: fresh.id, name: fresh.name, email: fresh.email, avatar: fresh.avatar ?? null,
      });
      return reply.redirect(`${frontendUrl}/?authToken=${encodeURIComponent(token)}`);
    }

    // New user → short-lived signup token; the app asks for name + username + photo
    const signupToken = await jwt.signWithExpiry({
      purpose: 'google-signup',
      gid: profile.sub,
      email: String(profile.email).toLowerCase(),
      name: profile.name ?? '',
      picture: profile.picture ?? null,
    }, '10m');
    return reply.redirect(`${frontendUrl}/?googleSignup=${encodeURIComponent(signupToken)}`);
  });

  // Finish a Google signup: pick name + username + optional photo → account is created
  app.post('/api/auth/google/complete', async (request, reply) => {
    const { signupToken, name, username, avatar } = request.body ?? {};
    if (!signupToken || !name || !String(name).trim() || !username) {
      return reply.code(400).send({ error: 'signupToken, name and username are required' });
    }

    let payload;
    try {
      payload = await jwt.verify(signupToken);
    } catch {
      return reply.code(400).send({ error: 'Signup link expired — sign in with Google again' });
    }
    if (payload.purpose !== 'google-signup' || !payload.gid || !payload.email) {
      return reply.code(400).send({ error: 'Invalid signup token' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    if (!USERNAME_RE.test(normalizedUsername)) {
      return reply.code(400).send({ error: 'Username: 3–20 characters, only a-z, 0-9 and _' });
    }
    const usernameTaken = await db
      .prepare('SELECT id FROM users WHERE username = ? AND google_id != ?')
      .get(normalizedUsername, payload.gid);
    if (usernameTaken) {
      return reply.code(409).send({ error: `"${normalizedUsername}" is already taken` });
    }

    const email = String(payload.email).toLowerCase();
    const displayName = String(name).trim().slice(0, 40);
    const avatarValue =
      typeof avatar === 'string' && avatar.startsWith('data:image/') && avatar.length < 300000
        ? avatar
        : (payload.picture ?? null);

    let user = await db.prepare('SELECT * FROM users WHERE google_id = ?').get(payload.gid);
    if (!user) {
      user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }

    if (user) {
      await db.prepare('UPDATE users SET google_id = ?, username = ?, avatar = COALESCE(?, avatar), onboarded = 1 WHERE id = ?')
        .run(payload.gid, normalizedUsername, avatarValue, user.id);
    } else {
      const id = uuid();
      await db.prepare(
        'INSERT INTO users (id, name, email, password_hash, google_id, avatar, nex_id, username, onboarded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
      ).run(id, displayName, email, '-', payload.gid, avatarValue, await genNexId(), normalizedUsername);
      user = { id };
    }

    const fresh = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    const token = await jwt.sign({
      sub: fresh.id, name: fresh.name, email: fresh.email, avatar: fresh.avatar ?? null,
    });
    return reply.send({ token, user: publicUser(fresh) });
  });
}
