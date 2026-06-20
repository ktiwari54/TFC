const crypto = require('crypto');

const COOKIE_NAME = 'tfc_cms_session';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('JWT_SECRET or ADMIN_PASSWORD must be set');
  return secret;
}

function signToken() {
  const exp = Date.now() + MAX_AGE_MS;
  const payload = Buffer.from(JSON.stringify({ exp, role: 'admin' })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp && data.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    }).filter(([k]) => k),
  );
}

function getSession(req) {
  const cookies = parseCookies(req);
  return verifyToken(cookies[COOKIE_NAME]) ? { role: 'admin' } : null;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_MS / 1000}${secure}`,
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}

function requireAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return null;
  }
  return session;
}

module.exports = {
  COOKIE_NAME,
  signToken,
  verifyToken,
  getSession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  checkPassword: (pw) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!pw || !expected) return false;
    const a = Buffer.from(pw);
    const b = Buffer.from(expected);
    if (a.length !== b.length) {
      crypto.timingSafeEqual(Buffer.alloc(b.length), b);
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  },
};