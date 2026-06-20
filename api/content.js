const { requireAuth } = require('./lib/auth');
const { readContent, writeContent, ALLOWED } = require('./lib/storage');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const name = url.searchParams.get('file');

  if (!name || !ALLOWED.has(name)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Invalid file', allowed: [...ALLOWED] }));
  }

  if (req.method === 'GET') {
    try {
      const data = readContent(name);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    } catch (e) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === 'PUT') {
    if (!requireAuth(req, res)) return;
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const data = JSON.parse(body);
      await writeContent(name, data);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method not allowed' }));
};