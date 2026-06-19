/**
 * TFC SEO audit — meta, sitemap, robots, canonical, schema, links, redirects
 * Run: node test-seo.js (server on localhost:8080)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = __dirname;
const BASE = 'http://localhost:8080';

const MAIN_PAGES = [
  '/',
  '/index.html',
  '/films.html',
  '/about-us.html',
  '/contact.html',
  '/pricing.html',
  '/crew.html',
  '/workshop.html',
  '/blogs.html',
  '/faqs.html',
  '/tales-from-the-culture.html',
  '/films-search.html',
  '/films/arya-federico.html',
  '/films/priya-akshay.html',
];

function walkHtml(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, list);
    else if (entry.name.endsWith('.html') && entry.name !== 'tfc.html') list.push(full);
  }
  return list;
}

function parseHead(html, file) {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const schemaBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const lang = html.match(/<html[^>]+lang=["']([^"']*)["']/i);

  const issues = [];
  const t = title ? title[1].trim() : '';
  const d = desc ? desc[1].trim() : '';

  if (!t) issues.push('missing <title>');
  else if (t.length < 10) issues.push(`title too short (${t.length} chars)`);
  else if (t.length > 60) issues.push(`title too long (${t.length} chars)`);

  if (!d) issues.push('missing meta description');
  else if (d.length < 50) issues.push(`description too short (${d.length} chars)`);
  else if (d.length > 160) issues.push(`description too long (${d.length} chars)`);

  if (!canonical) issues.push('missing canonical');
  if (!ogTitle) issues.push('missing og:title');
  if (!ogDesc) issues.push('missing og:description');
  if (!ogImage) issues.push('missing og:image');
  if (!schemaBlocks.length) issues.push('missing JSON-LD schema');
  if (h1Count === 0) issues.push('missing h1');
  else if (h1Count > 1) issues.push(`multiple h1 (${h1Count})`);
  if (!lang) issues.push('missing html lang');

  return {
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    title: t,
    descriptionLen: d.length,
    hasCanonical: !!canonical,
    hasSchema: schemaBlocks.length > 0,
    hasOg: !!(ogTitle && ogDesc),
    h1Count,
    issues,
  };
}

function httpCheck(url, maxRedirects = 5) {
  return new Promise((resolve) => {
    const chain = [];
    const go = (current, hops) => {
      if (hops > maxRedirects) {
        resolve({ url, status: 'redirect-loop', chain });
        return;
      }
      const req = http.get(current, (res) => {
        const loc = res.headers.location;
        chain.push({ url: current, status: res.statusCode, location: loc || null });
        if ([301, 302, 307, 308].includes(res.statusCode) && loc) {
          const next = new URL(loc, current).href;
          res.resume();
          go(next, hops + 1);
        } else {
          res.resume();
          resolve({ url, finalStatus: res.statusCode, chain });
        }
      });
      req.on('error', (e) => resolve({ url, error: e.message, chain }));
      req.setTimeout(10000, () => { req.destroy(); resolve({ url, error: 'timeout', chain }); });
    };
    go(url, 0);
  });
}

async function crawlLinks(page, startPath) {
  await page.goto(`${BASE}${startPath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(800);
  return page.evaluate((origin) => {
    const links = [...document.querySelectorAll('a[href]')].map((a) => {
      const href = a.getAttribute('href');
      return { href, text: (a.textContent || '').trim().slice(0, 60) };
    });
    return links.filter((l) => l.href && !l.href.startsWith('mailto:') && !l.href.startsWith('tel:') && !l.href.startsWith('javascript:'));
  }, BASE);
}

(async () => {
  const report = {
    testedAt: new Date().toISOString(),
    meta: { total: 0, withIssues: 0, missingDescription: 0, missingCanonical: 0, missingSchema: 0, missingOg: 0 },
    files: [],
    infrastructure: {},
    links: { checked: 0, broken: [], redirects: [], external: 0 },
    redirects: [],
    summary: { pass: 0, fail: 0, warnings: [] },
  };

  const htmlFiles = walkHtml(ROOT);
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const parsed = parseHead(html, file);
    report.files.push(parsed);
    report.meta.total += 1;
    if (parsed.issues.length) report.meta.withIssues += 1;
    if (parsed.issues.some((i) => i.includes('description'))) report.meta.missingDescription += 1;
    if (parsed.issues.some((i) => i.includes('canonical'))) report.meta.missingCanonical += 1;
    if (parsed.issues.some((i) => i.includes('schema'))) report.meta.missingSchema += 1;
    if (parsed.issues.some((i) => i.includes('og:'))) report.meta.missingOg += 1;
  }

  const infraRoutes = ['/robots.txt', '/sitemap.xml', '/sitemap_index.xml'];
  for (const route of infraRoutes) {
    const res = await httpCheck(`${BASE}${route}`);
    report.infrastructure[route] = res;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const seen = new Set();
  const toCheck = [];

  for (const p of MAIN_PAGES) {
    const links = await crawlLinks(page, p);
    for (const l of links) {
      let target;
      try {
        if (l.href.startsWith('http')) {
          if (!l.href.includes('localhost')) {
            report.links.external += 1;
            continue;
          }
          target = l.href;
        } else if (l.href.startsWith('#') || l.href === '') continue;
        else target = new URL(l.href, `${BASE}${p}`).href;
      } catch { continue; }
      if (seen.has(target)) continue;
      seen.add(target);
      toCheck.push({ from: p, href: l.href, target, text: l.text });
    }
  }

  for (const item of toCheck.slice(0, 120)) {
    report.links.checked += 1;
    const res = await httpCheck(item.target);
    if (res.error) {
      report.links.broken.push({ ...item, error: res.error });
    } else if (res.chain.length > 1) {
      report.links.redirects.push({ ...item, chain: res.chain });
    } else if (res.finalStatus >= 400) {
      report.links.broken.push({ ...item, status: res.finalStatus });
    }
  }

  const redirectTests = [
    { from: '/index.html', note: 'homepage alias' },
    { from: '/home', note: 'common alias (may 404)' },
    { from: '/about', note: 'short alias (may 404)' },
  ];
  for (const t of redirectTests) {
    report.redirects.push({ ...t, ...(await httpCheck(`${BASE}${t.from}`)) });
  }

  await browser.close();

  if (!report.infrastructure['/robots.txt'].finalStatus || report.infrastructure['/robots.txt'].finalStatus === 404) {
    report.summary.fail += 1;
    report.summary.warnings.push('robots.txt missing (404)');
  } else report.summary.pass += 1;

  if (!report.infrastructure['/sitemap.xml'].finalStatus || report.infrastructure['/sitemap.xml'].finalStatus === 404) {
    report.summary.fail += 1;
    report.summary.warnings.push('sitemap.xml missing (404)');
  } else report.summary.pass += 1;

  if (report.meta.missingCanonical === report.meta.total) {
    report.summary.fail += 1;
    report.summary.warnings.push(`canonical tags missing on all ${report.meta.total} pages`);
  }

  if (report.meta.missingSchema === report.meta.total) {
    report.summary.fail += 1;
    report.summary.warnings.push(`JSON-LD schema missing on all ${report.meta.total} pages`);
  }

  if (report.meta.missingOg >= report.meta.total * 0.9) {
    report.summary.fail += 1;
    report.summary.warnings.push('Open Graph tags missing on most pages');
  }

  if (report.links.broken.length) {
    report.summary.fail += report.links.broken.length;
    report.summary.warnings.push(`${report.links.broken.length} broken internal link(s)`);
  } else if (report.links.checked) {
    report.summary.pass += 1;
    report.summary.warnings.push(`Internal links OK (${report.links.checked} checked)`);
  }

  const pagesWithTitleDesc = report.files.filter((f) => !f.issues.some((i) => i.startsWith('missing <title>') || i.startsWith('missing meta'))).length;
  report.summary.warnings.push(`Title + description present on ${pagesWithTitleDesc}/${report.meta.total} pages`);

  const longTitles = report.files.filter((f) => f.issues.some((i) => i.includes('title too long')));
  if (longTitles.length) report.summary.warnings.push(`${longTitles.length} page(s) with titles > 60 chars`);

  const shortDesc = report.files.filter((f) => f.issues.some((i) => i.includes('description too short')));
  if (shortDesc.length) report.summary.warnings.push(`${shortDesc.length} page(s) with descriptions < 50 chars`);

  const multiH1 = report.files.filter((f) => f.issues.some((i) => i.includes('multiple h1')));
  if (multiH1.length) report.summary.warnings.push(`${multiH1.length} page(s) with multiple h1 tags`);

  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});