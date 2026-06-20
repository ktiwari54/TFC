const { requireAuth } = require('./lib/auth');
const { supabase } = require('./lib/db');

module.exports = async (req, res) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://tfc-mauve.vercel.app';
  const origin = req.headers.origin || '';
  if (!origin || origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const page = url.searchParams.get('page');

  if (!page || !/^[a-z0-9_-]+$/.test(page)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Invalid page name' }));
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('page_content')
      .select('selector, type, value')
      .eq('page', page);
    if (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: error.message }));
    }
    const result = {};
    (data || []).forEach(({ selector, type, value }) => {
      result[selector] = { type, value };
    });
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(result));
  }

  if (req.method === 'PUT') {
    if (!requireAuth(req, res)) return;

    let body = '';
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        res.statusCode = 413;
        return res.end(JSON.stringify({ error: 'Payload too large' }));
      }
      body += chunk;
    }

    let payload;
    try { payload = JSON.parse(body); } catch {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const rows = Object.entries(payload).map(([selector, { type, value }]) => ({
      page, selector, type: type || 'text', value: value || '',
    }));

    if (rows.length === 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true }));
    }

    const { error } = await supabase
      .from('page_content')
      .upsert(rows, { onConflict: 'page,selector' });

    if (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: error.message }));
    }

    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true }));
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method not allowed' }));
};
