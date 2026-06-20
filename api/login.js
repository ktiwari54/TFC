const { checkPassword, signToken, setSessionCookie, clearSessionCookie } = require('./lib/auth');

module.exports = async (req, res) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://tfc-mauve.vercel.app';
  const origin = req.headers.origin || '';
  if (!origin || origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true }));
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  let body = '';
  for await (const chunk of req) body += chunk;
  let data = {};
  try { data = JSON.parse(body || '{}'); } catch { /* empty */ }

  let passwordOk = false;
  try {
    passwordOk = await checkPassword(data.password);
  } catch (e) {
    console.error('[login] checkPassword error:', e.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Auth error: ' + e.message }));
  }

  if (!passwordOk) {
    await new Promise(r => setTimeout(r, 1500)); // slow brute-force
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Invalid password' }));
  }

  try {
    const token = signToken();
    setSessionCookie(res, token);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error('[login] signToken error:', e.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server config error: ' + e.message }));
  }
};
