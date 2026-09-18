import jwt from './jwt.js';

/** Verify the JWT and attach the user to the request. */
export async function requireAuth(request, reply) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return reply.code(401).send({ error: 'Missing token' });
  }
  try {
    const payload = await jwt.verify(token);
    request.user = { id: payload.sub, name: payload.name, email: payload.email };
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}
