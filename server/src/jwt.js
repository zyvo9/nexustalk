import { SignJWT, jwtVerify } from 'jose';

// Dev secret — rotate before deploying to a public server.
const secret = new TextEncoder().encode(
  'nexustalk-dev-secret-change-me-in-production-0123456789'
);

const EXPIRES = '30d';

export async function sign(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES)
    .sign(secret);
}

/** Short-lived signed token (e.g. the "choose your name" Google signup step). */
export async function signWithExpiry(payload, expiresIn = '10m') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verify(token) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

export default { sign, signWithExpiry, verify };
