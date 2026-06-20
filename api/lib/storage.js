const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ALLOWED = new Set(['homepage.json', 'films.json']);

function resolveContentPath(name) {
  if (!ALLOWED.has(name)) throw new Error('Invalid content file');
  return path.join(ROOT, 'content', name);
}

function readContent(name) {
  const file = resolveContentPath(name);
  if (!fs.existsSync(file)) throw new Error('Not found');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function writeContentGithub(name, data) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN required for saves on Vercel');
  const repo = process.env.GITHUB_REPO || 'ktiwari54/TFC';
  const [owner, repoName] = repo.split('/');
  const filePath = `content/${name}`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const apiBase = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`;

  const getRes = await fetch(apiBase, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  const existing = getRes.ok ? await getRes.json() : null;

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `CMS: update ${name}`,
      content,
      sha: existing?.sha,
    }),
  });
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || 'GitHub save failed');
  }
}

function writeContentLocal(name, data) {
  const file = resolveContentPath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

async function writeContent(name, data) {
  if (process.env.VERCEL || process.env.GITHUB_TOKEN) {
    return writeContentGithub(name, data);
  }
  return writeContentLocal(name, data);
}

function saveUpload(folder, filename, buffer) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = path.join(ROOT, 'uploads', folder);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, safeName);
  fs.writeFileSync(dest, buffer);
  return `/uploads/${folder}/${safeName}`;
}

module.exports = { readContent, writeContent, saveUpload, ALLOWED };