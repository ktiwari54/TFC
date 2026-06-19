/**
 * Writes a SHA-256 manifest for backup verification.
 * Usage: node scripts/build-backup-manifest.js [output-path]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const out = process.argv[2] || path.join(ROOT, 'backup-manifest.json');

const INCLUDE = [
  'index.html', 'serve.py', 'vercel.json',
  'js/films-data.js', 'js/trailer-data.js', 'js/main.js', 'js/layout.js',
  'contact.html', 'films.html',
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const files = [];
for (const rel of INCLUDE) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  files.push({ file: rel.replace(/\\/g, '/'), sha256: sha256(full), bytes: fs.statSync(full).size });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  project: 'TFC',
  files,
};

fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${files.length} entries to ${out}`);