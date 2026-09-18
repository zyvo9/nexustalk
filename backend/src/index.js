import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as ServerIO } from 'socket.io';
import { config } from './config.js';
import { migrate, db } from './db.js';
import { verify } from './jwt.js';
import { registerRoutes } from './routes.js';
import { bindRealtime } from './realtime.js';

await migrate();

const app = Fastify({ logger: { level: 'warn' } });

await app.register(cors, {
  origin: (origin, cb) => {
    if (config.allowedOrigins.includes('*') || !origin) return cb(null, true);
    if (config.allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
});

// Attach req.user for /api routes (public paths stay open)
app.addHook('onRequest', async (req, reply) => {
  if (!req.url.startsWith('/api/')) return;
  if (req.url.startsWith('/api/health')) return;
  if (req.url.startsWith('/api/auth/login') || req.url.startsWith('/api/auth/register')) return;
  const header = req.headers.authorization;
  const queryToken = req.query?.token;
  if (!header?.startsWith('Bearer ') && !queryToken) return reply.code(401).send({ error: 'Not logged in' });
  try {
    const payload = await verify(header?.startsWith('Bearer ') ? header.slice(7) : String(queryToken));
    req.user = await db.get('SELECT * FROM users WHERE id = ?', [payload.sub]);
    if (!req.user) return reply.code(401).send({ error: 'Account not found' });
  } catch {
    return reply.code(401).send({ error: 'Invalid session' });
  }
});

await registerRoutes(app);

const io = new ServerIO(app.server, { cors: { origin: true } });
bindRealtime(io);

await app.listen({ port: config.port, host: config.host });
console.log(`NexusTalk backend v2 running on http://${config.host}:${config.port}`);
