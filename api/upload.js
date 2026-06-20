const { requireAuth } = require('./lib/auth');
const { saveUpload } = require('./lib/storage');

module.exports = async (req, res) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://tfc-mauve.vercel.app';
  const origin = req.headers.origin || "";
  if (!origin || origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  if (!requireAuth(req, res)) return;

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Expected multipart/form-data' }));
  }

  const boundary = contentType.split('boundary=')[1];
  if (!boundary) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing boundary' }));
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const parts = raw.toString('binary').split(`--${boundary}`);

  let filename = `upload-${Date.now()}`;
  let fileBuffer = null;
  let folder = 'images';

  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;
    const nameMatch = part.match(/filename="([^"]+)"/);
    const fieldMatch = part.match(/name="([^"]+)"/);
    if (fieldMatch?.[1] === 'folder') {
      const val = part.split('\r\n\r\n')[1]?.trim().replace(/--$/, '');
      if (val === 'videos' || val === 'images') folder = val;
      continue;
    }
    if (nameMatch) {
      filename = nameMatch[1];
      const dataStart = part.indexOf('\r\n\r\n') + 4;
      const dataEnd = part.lastIndexOf('\r\n');
      fileBuffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
    }
  }

  if (!fileBuffer?.length) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'No file received' }));
  }

  if (fileBuffer.length > 50 * 1024 * 1024) {
    res.statusCode = 413;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'File too large (max 50MB)' }));
  }

  try {
    const url = saveUpload(folder, filename, fileBuffer);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, url }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e.message }));
  }
};