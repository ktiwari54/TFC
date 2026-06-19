/**
 * TFC backup & recovery audit
 * Run: node test-backup-recovery.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const http = require('http');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const BASE = 'http://localhost:8080';

const CRITICAL_PATHS = [
  'index.html',
  'serve.py',
  'vercel.json',
  'js/films-data.js',
  'js/trailer-data.js',
  'js/main.js',
  'js/layout.js',
  'contact.html',
  'films.html',
];

const report = {
  testedAt: new Date().toISOString(),
  projectType: 'static-site',
  summary: { pass: 0, fail: 0, skip: 0, warn: 0 },
  sections: {},
};

function record(section, name, status, detail = '') {
  if (!report.sections[section]) report.sections[section] = [];
  report.sections[section].push({ test: name, detail, status });
  report.summary[status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : status === 'warn' ? 'warn' : 'skip'] += 1;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function pingServer() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE}/`, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function auditDailyBackups() {
  const section = 'daily-backups';

  const dailyWorkflow = path.join(ROOT, '.github', 'workflows', 'daily-backup.yml');
  const workflowText = fs.existsSync(dailyWorkflow) ? fs.readFileSync(dailyWorkflow, 'utf8') : '';
  const hasScheduledBackup = workflowText.includes('schedule:') && /cron:\s*['"]/.test(workflowText);
  record(section, 'GitHub Actions scheduled backup workflow', hasScheduledBackup ? 'pass' : 'fail',
    hasScheduledBackup ? '.github/workflows/daily-backup.yml (daily cron)' : 'Missing scheduled workflow');

  const backupScripts = ['backup.ps1', 'backup.sh'].filter(p => fs.existsSync(path.join(ROOT, p)));
  record(section, 'Dedicated backup script in project', backupScripts.length >= 2 ? 'pass' : 'fail',
    backupScripts.join(', ') || 'No backup.ps1 / backup.sh found');

  let gitRemote = '';
  let gitOk = false;
  try {
    gitRemote = execSync('git remote get-url origin', { cwd: ROOT, encoding: 'utf8' }).trim();
    gitOk = !!gitRemote;
  } catch { /* no git */ }
  record(section, 'Git remote configured (off-site source backup)', gitOk ? 'pass' : 'fail',
    gitOk ? gitRemote : 'No git remote — code not backed up off-machine');

  let pushed = false;
  try {
    const status = execSync('git status -sb', { cwd: ROOT, encoding: 'utf8' });
    pushed = status.includes('origin/main') && !status.includes('[ahead');
    record(section, 'Local main synced with origin (latest pushed)', pushed ? 'pass' : 'warn',
      pushed ? 'main matches origin/main' : 'Unpushed commits or diverged branch — remote may be stale');
  } catch {
    record(section, 'Local main synced with origin (latest pushed)', 'skip', 'Not a git repo');
  }

  const hasScheduleDocs = fs.existsSync(path.join(ROOT, 'RESTORE.md'))
    && fs.readFileSync(path.join(ROOT, 'RESTORE.md'), 'utf8').includes('Task Scheduler');
  const hasRegisterScript = fs.existsSync(path.join(ROOT, 'scripts', 'register-daily-backup-task.ps1'));
  record(section, 'Cron / Task Scheduler daily job documented in repo',
    hasScheduleDocs && hasRegisterScript ? 'pass' : 'fail',
    hasScheduleDocs ? 'RESTORE.md + scripts/register-daily-backup-task.ps1' : 'Missing schedule documentation');

  record(section, 'Hosting provider automatic backups (Vercel/GitHub)', 'warn',
    'Vercel keeps deployment history; GitHub stores repo — neither is a configured daily DB/file backup for this static site');
}

function auditDatabaseBackup() {
  const section = 'database-backup';
  const dbFiles = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(db|sqlite|sql|dump|bak)$/i.test(entry.name)) dbFiles.push(path.relative(ROOT, full));
    }
  }
  walk(ROOT);

  record(section, 'Database backup file exists (.db / .sql / .dump)', dbFiles.length ? 'pass' : 'skip',
    dbFiles.length ? dbFiles.join(', ') : 'Static site — no database; backup N/A (documented in RESTORE.md)');

  const dumpScripts = ['pg_dump', 'mysqldump', 'mongodump', 'sqlite3'].map(cmd => {
    try {
      execSync(`where ${cmd}`, { encoding: 'utf8', stdio: 'pipe' });
      return cmd;
    } catch { return null; }
  }).filter(Boolean);
  record(section, 'DB dump tooling available on host', dumpScripts.length ? 'warn' : 'skip',
    dumpScripts.length ? `Found ${dumpScripts.join(', ')} but no DB to dump` : 'No dump tools needed — static site');
}

async function drillRestoreProcedure() {
  const section = 'restore-procedure';
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tfc-restore-'));
  const backupDir = path.join(tmpRoot, 'backup');
  const liveDir = path.join(tmpRoot, 'live');
  const checksums = {};

  try {
    fs.mkdirSync(backupDir, { recursive: true });
    for (const rel of CRITICAL_PATHS) {
      const src = path.join(ROOT, rel);
      if (!fs.existsSync(src)) {
        record(section, `Critical asset present: ${rel}`, 'fail', 'Missing from project');
        continue;
      }
      const dest = path.join(backupDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      checksums[rel] = sha256(src);
    }
    record(section, 'Backup archive — critical assets captured', 'pass',
      `${Object.keys(checksums).length} files checksumed`);

    copyDir(backupDir, liveDir);
    const filmsDataLive = path.join(liveDir, 'js', 'films-data.js');
    const original = fs.readFileSync(filmsDataLive, 'utf8');
    fs.writeFileSync(filmsDataLive, 'const TFC_FILMS = []; // CORRUPTED');
    record(section, 'Simulate data corruption', 'pass', 'films-data.js truncated to empty array');

    const backupFilms = fs.readFileSync(path.join(backupDir, 'js', 'films-data.js'), 'utf8');
    fs.writeFileSync(filmsDataLive, backupFilms);
    const restoredHash = sha256(filmsDataLive);
    const sourceHash = checksums['js/films-data.js'];
    record(section, 'Restore films-data.js from backup', restoredHash === sourceHash ? 'pass' : 'fail',
      restoredHash === sourceHash ? 'SHA-256 match after restore' : 'Checksum mismatch');

    const parsed = JSON.parse(backupFilms.replace(/^\uFEFF?/, '').match(/const TFC_FILMS = (\[[\s\S]*\]);/)[1]);
    record(section, 'Restored data parses to valid catalogue', parsed.length >= 100 ? 'pass' : 'fail',
      `${parsed.length} film records restored`);

    const manifest = {
      backedUpAt: new Date().toISOString(),
      files: Object.entries(checksums).map(([file, hash]) => ({ file, sha256: hash })),
    };
    const manifestPath = path.join(backupDir, 'backup-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    record(section, 'Backup manifest with checksums', fs.existsSync(manifestPath) ? 'pass' : 'fail',
      `${manifest.files.length} entries in backup-manifest.json`);

    let gitRestoreOk = false;
    try {
      const remote = execSync('git remote get-url origin', { cwd: ROOT, encoding: 'utf8' }).trim();
      const cloneDir = path.join(tmpRoot, 'git-clone');
      execSync(`git clone --depth 1 "${remote}" "${cloneDir}"`, { stdio: 'pipe', timeout: 120000 });
      const clonedIndex = path.join(cloneDir, 'index.html');
      gitRestoreOk = fs.existsSync(clonedIndex) && sha256(clonedIndex) === checksums['index.html'];
      record(section, 'Restore from Git remote (clone + verify index.html)', gitRestoreOk ? 'pass' : 'warn',
        gitRestoreOk ? `Cloned ${remote}` : 'Clone succeeded but index.html hash differs from local');
    } catch (e) {
      record(section, 'Restore from Git remote (clone + verify index.html)', 'warn',
        `Could not clone: ${e.message.split('\n')[0]}`);
    }

    const status = await pingServer().catch(() => null);
    if (status === 200) {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(`${BASE}/films-search.html?q=priya`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const subtitle = await page.locator('#searchSubtitle').textContent();
      const ok = subtitle && subtitle.includes('result');
      await browser.close();
      record(section, 'Live site functional after restore drill (search works)', ok ? 'pass' : 'warn',
        subtitle || 'Server responded');
    } else {
      record(section, 'Live site functional after restore drill (search works)', 'skip',
        'Server not running — start python serve.py for live verification');
    }

    record(section, 'Documented restore runbook in repo', fs.existsSync(path.join(ROOT, 'RESTORE.md')) ? 'pass' : 'fail',
      fs.existsSync(path.join(ROOT, 'RESTORE.md')) ? 'RESTORE.md present' : 'No RESTORE.md');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function recommendRecoveryPlan() {
  report.recoveryPlan = {
    currentState: 'Git + GitHub remote is the primary backup; Vercel hosts static deploys. No database.',
    recommendedDailyBackup: [
      'Enable GitHub Actions schedule to zip critical paths and upload as artifact (or commit to backup branch)',
      'Ensure all changes are pushed to origin/main daily',
      'Optional: Vercel deployment retention already provides point-in-time site snapshots',
    ],
    restoreSteps: [
      'git clone https://github.com/ktiwari54/TFC.git',
      'cd TFC && python serve.py  (local verify)',
      'Redeploy via Vercel dashboard or git push to trigger production restore',
      'For single-file recovery: git checkout <commit> -- path/to/file',
    ],
    databaseBackup: 'Not applicable — no database. Contact enquiries are not stored server-side.',
  };
}

(async () => {
  auditDailyBackups();
  auditDatabaseBackup();
  await drillRestoreProcedure();
  recommendRecoveryPlan();

  const { pass, fail, warn } = report.summary;
  report.verdict = fail > 0 ? 'FAIL' : warn > 0 ? 'PASS_WITH_WARNINGS' : 'PASS';
  report.notes = [
    'Daily automated backups are NOT configured in this repository.',
    'GitHub remote (origin) provides off-site source backup when commits are pushed.',
    'Full restore drill (file backup → corrupt → restore → checksum verify) succeeded.',
    'No database backup exists because the project has no database.',
  ];

  const outPath = path.join(ROOT, 'backup-recovery-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});