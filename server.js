/**
 * TFC local dev server with CMS API
 * Run: ADMIN_PASSWORD=yourpass node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

if (!process.env.ADMIN_PASSWORD) {
  console.warn('Warning: ADMIN_PASSWORD not set. CMS login disabled until you set it.');
  console.warn('  PowerShell: $env:ADMIN_PASSWORD="your-password"; node server.js');
}

const loginHandler = require('./api/login');
const contentHandler = require('./api/content');
const uploadHandler = require('./api/upload');
const sessionHandler = require('./api/session');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
};

function serveStatic(filePath, res) {
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(filePath).pipe(res);
}

function toReqRes(nodeReq, nodeRes) {
  const req = Object.assign(nodeReq, {
    query: Object.fromEntries(new URL(nodeReq.url, `http://localhost:${PORT}`).searchParams),
  });
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; nodeRes.setHeader(k, v); },
    end(body) {
      nodeRes.statusCode = this.statusCode;
      nodeRes.end(body);
    },
  };
  return { req, res };
}

const server = http.createServer(async (nodeReq, nodeRes) => {
  const url = new URL(nodeReq.url, `http://localhost:${PORT}`);
  const { req, res } = toReqRes(nodeReq, nodeRes);

  try {
    if (url.pathname === '/api/login') return loginHandler(req, res);
    if (url.pathname === '/api/session') return sessionHandler(req, res);
    if (url.pathname === '/api/content') return contentHandler(req, res);
    if (url.pathname === '/api/upload') return uploadHandler(req, res);

    let filePath = path.join(ROOT, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) filePath = path.join(filePath, 'index.html');
    if (url.pathname === '/') filePath = path.join(ROOT, 'index.html');
    if (url.pathname === '/admin') filePath = path.join(ROOT, 'admin', 'index.html');
    serveStatic(filePath, nodeRes);
  } catch (e) {
    nodeRes.statusCode = 500;
    nodeRes.end(e.message);
  }
});

server.listen(PORT, () => {
  console.log(`TFC + CMS running at http://localhost:${PORT}/`);
  console.log(`Editor: http://localhost:${PORT}/admin`);
});