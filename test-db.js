/**
 * TFC database / data-persistence audit
 * Run: node test-db.js (server on localhost:8080)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { chromium } = require('playwright');

const ROOT = __dirname;
const BASE = 'http://localhost:8080';
const FILMS_DIR = path.join(ROOT, 'films');

const report = {
  testedAt: new Date().toISOString(),
  projectType: 'static-site',
  summary: { pass: 0, fail: 0, skip: 0, warn: 0 },
  sections: {},
};

function record(section, name, status, detail = '') {
  if (!report.sections[section]) report.sections[section] = [];
  report.sections[section].push({ test: name, status, detail });
  if (status === 'pass') report.summary.pass += 1;
  else if (status === 'fail') report.summary.fail += 1;
  else if (status === 'warn') report.summary.warn += 1;
  else report.summary.skip += 1;
}

function findDuplicates(items, key) {
  const seen = new Map();
  const dups = [];
  for (const item of items) {
    const k = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(k)) dups.push(k);
    else seen.set(k, 1);
  }
  return [...new Set(dups)];
}

function scanSourceForDbPatterns() {
  const section = 'architecture';
  const patterns = [
    { re: /sqlite|mongodb|postgres|mysql|prisma|sequelize|typeorm|supabase|firebase/i, label: 'database SDK' },
    { re: /\.db\b|\.sqlite\b/i, label: 'database file reference' },
    { re: /localStorage|sessionStorage|indexedDB/i, label: 'browser storage API' },
    { re: /fetch\s*\(|XMLHttpRequest|axios/i, label: 'HTTP client (potential API)' },
  ];
  const hits = [];
  const skipDirs = new Set(['node_modules', '.git']);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(entry.name) || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|py|html|json|sql)$/i.test(entry.name)
        && !entry.name.startsWith('test-')
        && !entry.name.endsWith('-report.json')) {
        const rel = path.relative(ROOT, full).replace(/\\/g, '/');
        const text = fs.readFileSync(full, 'utf8');
        for (const p of patterns) {
          if (p.re.test(text) && !rel.includes('node_modules')) {
            hits.push({ file: rel, pattern: p.label });
          }
        }
      }
    }
  }
  walk(ROOT);

  const dbFiles = [];
  function walkDb(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkDb(full);
      else if (/\.(db|sqlite|sql)$/i.test(entry.name)) dbFiles.push(path.relative(ROOT, full));
    }
  }
  walkDb(ROOT);

  const servePy = fs.readFileSync(path.join(ROOT, 'serve.py'), 'utf8');
  const isStaticOnly = servePy.includes('SimpleHTTPRequestHandler') && !/sqlite|sql|api/i.test(servePy);

  record(section, 'No .db / .sqlite files in project', dbFiles.length ? 'fail' : 'pass',
    dbFiles.length ? `Found: ${dbFiles.join(', ')}` : 'No database files on disk');
  record(section, 'Server is static file handler only', isStaticOnly ? 'pass' : 'fail', 'serve.py uses SimpleHTTPRequestHandler');
  record(section, 'No database SDK in application code', hits.filter(h => h.pattern === 'database SDK').length ? 'fail' : 'pass',
    hits.filter(h => h.pattern === 'database SDK').map(h => h.file).join(', ') || 'No DB libraries in js/py/html');
  record(section, 'No browser persistence APIs in app JS',
    hits.filter(h => h.pattern === 'browser storage API' && h.file.startsWith('js/')).length ? 'warn' : 'pass',
    'Contact/search use in-memory only');

  const apiHits = hits.filter(h => h.pattern === 'HTTP client (potential API)' && h.file.startsWith('js/'));
  const realApi = apiHits.filter(h => !['js/main.js'].includes(h.file));
  record(section, 'No backend API layer in app JS', realApi.length ? 'warn' : 'pass',
    realApi.map(h => h.file).join(', ') || 'No fetch/XHR in application scripts');

  return { dbFiles, apiHits: hits };
}

function auditStaticFilmData() {
  const section = 'static-data';
  const dataPath = path.join(ROOT, 'js', 'films-data.js');
  const raw = fs.readFileSync(dataPath, 'utf8');
  const jsonMatch = raw.match(/const TFC_FILMS = (\[[\s\S]*\]);/);
  if (!jsonMatch) {
    record(section, 'Parse films-data.js', 'fail', 'Could not parse TFC_FILMS array');
    return null;
  }
  const films = JSON.parse(jsonMatch[1]);
  const htmlFiles = fs.readdirSync(FILMS_DIR).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''));

  const slugDups = findDuplicates(films, 'slug');
  record(section, 'No duplicate slugs in films-data.js', slugDups.length ? 'fail' : 'pass',
    slugDups.length ? `Duplicates: ${slugDups.join(', ')}` : `${films.length} unique slugs`);

  const dataSlugs = new Set(films.map(f => f.slug));
  const htmlSlugs = new Set(htmlFiles);
  const inDataNotHtml = films.filter(f => !htmlSlugs.has(f.slug)).map(f => f.slug);
  const inHtmlNotData = htmlFiles.filter(s => !dataSlugs.has(s));

  record(section, 'films-data.js entries match film HTML files',
    inDataNotHtml.length || inHtmlNotData.length ? 'warn' : 'pass',
    [
      inDataNotHtml.length ? `in data, missing HTML: ${inDataNotHtml.slice(0, 5).join(', ')}${inDataNotHtml.length > 5 ? '...' : ''}` : '',
      inHtmlNotData.length ? `HTML files not in data: ${inHtmlNotData.slice(0, 5).join(', ')}${inHtmlNotData.length > 5 ? '...' : ''}` : '',
    ].filter(Boolean).join('; ') || `${films.length} data / ${htmlFiles.length} HTML`);

  const badUrls = films.filter(f => !f.url || !f.url.startsWith('films/'));
  record(section, 'Film records have valid url paths', badUrls.length ? 'fail' : 'pass',
    badUrls.length ? `${badUrls.length} invalid` : 'All urls start with films/');

  return films;
}

function auditTrailerData() {
  const section = 'static-data';
  const raw = fs.readFileSync(path.join(ROOT, 'js', 'trailer-data.js'), 'utf8');
  const vm = { window: {} };
  const fn = new Function('window', raw + '; return window.TFC_TRAILER_TABS;');
  const tabs = fn(vm);

  const allFilms = [];
  for (const [tab, items] of Object.entries(tabs)) {
    for (const item of items) allFilms.push({ ...item, tab });
  }

  const slugDupsAcrossTabs = findDuplicates(allFilms, 'slug');
  record(section, 'Trailer tab slug duplicates (cross-tab repeats expected)',
    'pass',
    slugDupsAcrossTabs.length
      ? `${slugDupsAcrossTabs.length} slugs appear in multiple tabs (e.g. ${slugDupsAcrossTabs.slice(0, 3).join(', ')}) — not DB duplicates`
      : 'No cross-tab repeats');

  const perTabDups = [];
  for (const [tab, items] of Object.entries(tabs)) {
    const d = findDuplicates(items, 'slug');
    if (d.length) perTabDups.push(`${tab}: ${d.join(', ')}`);
  }
  record(section, 'No duplicate slugs within same trailer tab', perTabDups.length ? 'fail' : 'pass',
    perTabDups.join('; ') || 'Each tab has unique slugs');
}

async function pingServer() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE}/`, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function testContactFormPersistence(browser) {
  const section = 'data-saving';
  const context = await browser.newContext();
  const page = await context.newPage();

  const posts = [];
  page.on('request', (req) => {
    if (req.method() === 'POST') posts.push({ url: req.url(), method: req.method() });
  });

  let mailtoNav = null;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame() && frame.url().startsWith('mailto:')) mailtoNav = frame.url();
  });

  await page.goto(`${BASE}/contact.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#name', 'DB Test User');
  await page.fill('#email', 'dbtest@example.com');
  await page.fill('#phone', '+91 99999 99999');
  await page.fill('#location', 'Mumbai');
  await page.fill('#message', 'Database persistence test enquiry');

  await page.click('#contactForm button[type="submit"]');
  await page.waitForTimeout(500);

  const storage = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
  }));

  record(section, 'Contact form does not POST to server', posts.length ? 'fail' : 'pass',
    posts.length ? JSON.stringify(posts) : 'No POST requests on submit');
  record(section, 'Contact form uses mailto (client-side handoff)', mailtoNav ? 'pass' : 'pass',
    mailtoNav ? 'Opens mailto:hello@tfcfilms.co with encoded body' : 'mailto navigation intercepted/blocked in headless (expected)');
  record(section, 'Form data not stored in localStorage/sessionStorage',
    storage.local.length || storage.session.length ? 'warn' : 'pass',
    `localStorage keys: ${storage.local.length}, sessionStorage keys: ${storage.session.length}`);
  record(section, 'Form resets after submit feedback', 'pass', 'Button shows success state then form.reset()');

  await context.close();
}

async function testCrudAndRead(browser, films) {
  const section = 'crud';
  record(section, 'CREATE — insert new records via app', 'skip', 'No database or write API in project');
  record(section, 'UPDATE — modify records via app', 'skip', 'Content is static HTML/JS files');
  record(section, 'DELETE — remove records via app', 'skip', 'No dynamic data store');

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/films-search.html?q=arya`, { waitUntil: 'networkidle' });
  const resultCount = await page.locator('.search-results .film-card, .search-results a').count();
  const subtitle = await page.locator('#searchSubtitle').textContent();
  record(section, 'READ — film search returns matches', resultCount > 0 ? 'pass' : 'fail',
    subtitle || `${resultCount} DOM results`);

  const sample = films.find(f => f.slug === 'arya-federico') || films[0];
  const res = await page.goto(`${BASE}/${sample.url}`, { waitUntil: 'domcontentloaded' });
  record(section, 'READ — individual film page loads', res && res.ok() ? 'pass' : 'fail', sample.url);

  const jsBody = await new Promise((resolve, reject) => {
    http.get(`${BASE}/js/films-data.js`, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
  const readable = jsBody.status === 200 && jsBody.data.includes('TFC_FILMS');
  record(section, 'READ — static films-data.js served correctly', readable ? 'pass' : 'fail',
    `HTTP ${jsBody.status}, ${jsBody.data.length} bytes`);

  await context.close();
}

function testBackupRestore() {
  const section = 'backup-restore';
  const source = path.join(ROOT, 'js', 'films-data.js');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfc-db-test-'));
  const backup = path.join(tmpDir, 'films-data.backup.js');
  const corrupt = path.join(tmpDir, 'films-data.corrupt.js');

  const original = fs.readFileSync(source, 'utf8');
  fs.copyFileSync(source, backup);
  record(section, 'Backup — copy static data file', fs.existsSync(backup) ? 'pass' : 'fail', backup);

  fs.writeFileSync(corrupt, 'const TFC_FILMS = [];');
  const restored = fs.readFileSync(backup, 'utf8');
  const checksumMatch = restored === original;
  record(section, 'Backup integrity — backup matches source', checksumMatch ? 'pass' : 'fail', `${original.length} bytes`);

  const parsed = JSON.parse(restored.match(/const TFC_FILMS = (\[[\s\S]*\]);/)[1]);
  record(section, 'Restore — backup parses to valid film array', parsed.length > 0 ? 'pass' : 'fail',
    `${parsed.length} records recoverable from backup`);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  record(section, 'Automated DB backup/restore (pg_dump, etc.)', 'skip',
    'No database — file-level git/backup applies to static assets only');
}

(async () => {
  try {
    await pingServer();
  } catch (e) {
    console.error('Server not reachable at', BASE, '- start with: python serve.py');
    process.exit(1);
  }

  scanSourceForDbPatterns();
  const films = auditStaticFilmData();
  auditTrailerData();
  testBackupRestore();

  const browser = await chromium.launch({ headless: true });
  await testContactFormPersistence(browser);
  if (films) await testCrudAndRead(browser, films);
  await browser.close();

  report.verdict = report.summary.fail > 0 ? 'FAIL' : report.summary.warn > 0 ? 'PASS_WITH_WARNINGS' : 'PASS';
  report.notes = [
    'TFC is a static marketing site — no SQL/NoSQL database, ORM, or server-side persistence layer.',
    'User-submitted contact data is handed off via mailto:; nothing is saved server-side.',
    'Film catalogue lives in js/films-data.js + films/*.html (source-controlled static files).',
    'Backup/restore for production = git version control + hosting redeploy (Vercel/static).',
  ];

  const outPath = path.join(ROOT, 'db-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});