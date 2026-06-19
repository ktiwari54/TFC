/**
 * TFC Performance audit — load speed, Core Web Vitals, images, server TTFB
 * Run: node test-performance.js (server on localhost:8080)
 */
const { chromium } = require('playwright');
const http = require('http');

const BASE = 'http://localhost:8080';

const PAGES = [
  { path: '/index.html', name: 'home' },
  { path: '/films.html', name: 'films' },
  { path: '/about-us.html', name: 'about' },
  { path: '/contact.html', name: 'contact' },
  { path: '/tales-from-the-culture.html', name: 'tales' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
];

const THRESHOLDS = {
  ttfb: { good: 800, poor: 1800 },
  fcp: { good: 1800, poor: 3000 },
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  load: { good: 3000, poor: 5000 },
  tbt: { good: 200, poor: 600 },
};

function grade(metric, msOrScore) {
  const t = THRESHOLDS[metric];
  if (!t) return 'n/a';
  if (msOrScore <= t.good) return 'good';
  if (msOrScore <= t.poor) return 'needs-improvement';
  return 'poor';
}

function fetchTiming(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, (res) => {
      const ttfb = Date.now() - start;
      let size = 0;
      res.on('data', (chunk) => { size += chunk.length; });
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          ttfbMs: ttfb,
          totalMs: Date.now() - start,
          sizeKb: Math.round(size / 1024),
          cacheControl: res.headers['cache-control'] || 'none',
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

async function measureServerResponse() {
  const routes = ['/', '/index.html', '/css/style.css', '/js/home-3d.js', '/images/tfc-logo.svg'];
  const results = [];
  for (const route of routes) {
    const samples = [];
    for (let i = 0; i < 3; i++) {
      samples.push(await fetchTiming(`${BASE}${route}`));
    }
    const avgTtfb = Math.round(samples.reduce((s, x) => s + x.ttfbMs, 0) / samples.length);
    results.push({
      route,
      avgTtfbMs: avgTtfb,
      grade: grade('ttfb', avgTtfb),
      samples,
    });
  }
  return results;
}

async function collectWebVitals(page) {
  await page.waitForLoadState('load');
  await page.waitForTimeout(2500);

  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find((p) => p.name === 'first-contentful-paint');

    let lcp = 0;
    try {
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length) {
        const last = lcpEntries[lcpEntries.length - 1];
        lcp = last.renderTime || last.startTime;
      }
    } catch (_) { /* unsupported */ }

    let cls = 0;
    try {
      performance.getEntriesByType('layout-shift').forEach((e) => {
        if (!e.hadRecentInput) cls += e.value;
      });
    } catch (_) { /* unsupported */ }

    const resources = performance.getEntriesByType('resource');
    const jsTime = resources
      .filter((r) => r.initiatorType === 'script' || /\.js($|\?)/.test(r.name))
      .reduce((s, r) => s + r.duration, 0);

    return {
      ttfb: nav ? Math.round(nav.responseStart) : null,
      dns: nav ? Math.round(nav.domainLookupEnd - nav.domainLookupStart) : null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadEvent: nav ? Math.round(nav.loadEventEnd) : null,
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: lcp ? Math.round(lcp) : null,
      cls: Math.round(cls * 1000) / 1000,
      transferSize: nav ? nav.transferSize : null,
      resourceCount: resources.length,
      jsExecutionMs: Math.round(jsTime),
    };
  });
}

async function auditImages(page) {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    const details = imgs.map((img) => {
      const rect = img.getBoundingClientRect();
      const displayed = Math.round(rect.width * rect.height);
      const intrinsic = img.naturalWidth * img.naturalHeight;
      const overserved = intrinsic > 0 && displayed > 0 && intrinsic > displayed * 2.5;
      return {
        src: (img.currentSrc || img.src || '').slice(0, 120),
        loading: img.loading || 'eager',
        decoding: img.decoding || 'auto',
        width: img.naturalWidth,
        height: img.naturalHeight,
        displayedW: Math.round(rect.width),
        displayedH: Math.round(rect.height),
        complete: img.complete,
        overserved,
        missingDimensions: !img.width && !img.height && !img.getAttribute('width'),
      };
    });

    const lazy = details.filter((i) => i.loading === 'lazy').length;
    const eager = details.length - lazy;
    const overserved = details.filter((i) => i.overserved).length;
    const missingDims = details.filter((i) => i.missingDimensions).length;
    const broken = details.filter((i) => i.complete && i.width === 0).length;
    const external = details.filter((i) => i.src.startsWith('http') && !i.src.includes(location.host)).length;
    const modern = details.filter((i) => /\.(webp|avif|svg)($|\?)/i.test(i.src)).length;

    return {
      total: details.length,
      lazy,
      eager,
      overserved,
      missingDims,
      broken,
      external,
      modern,
      largest: details
        .filter((i) => i.width > 0)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height))
        .slice(0, 5)
        .map((i) => ({ src: i.src, px: `${i.width}×${i.height}`, loading: i.loading })),
      issues: [
        overserved > 0 ? `${overserved} images overserved (>2.5× display size)` : null,
        missingDims > 8 ? `${missingDims} images missing width/height (CLS risk)` : null,
        eager > lazy && details.length > 12 ? `${eager} eager images (consider more lazy loading)` : null,
        broken > 0 ? `${broken} broken images` : null,
      ].filter(Boolean),
    };
  });
}

async function measurePage(browser, viewport, pageInfo) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    userAgent: viewport.width < 500
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
      : undefined,
  });
  const page = await context.newPage();

  const start = Date.now();
  await page.goto(`${BASE}${pageInfo.path}`, { waitUntil: 'load', timeout: 30000 });
  const wallLoadMs = Date.now() - start;

  const vitals = await collectWebVitals(page);
  const images = await auditImages(page);

  await context.close();

  return {
    wallLoadMs,
    vitals: {
      ...vitals,
      grades: {
        ttfb: grade('ttfb', vitals.ttfb),
        fcp: grade('fcp', vitals.fcp),
        lcp: grade('lcp', vitals.lcp),
        cls: grade('cls', vitals.cls),
        load: grade('load', vitals.loadEvent),
      },
    },
    images,
  };
}

(async () => {
  const report = {
    testedAt: new Date().toISOString(),
    environment: 'local dev (no-cache headers — slower than production CDN)',
    server: null,
    pages: {},
    summary: { good: 0, needsImprovement: 0, poor: 0, issues: [] },
  };

  report.server = await measureServerResponse();

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    report.pages[vp.name] = {};
    for (const p of PAGES) {
      try {
        const data = await measurePage(browser, vp, p);
        report.pages[vp.name][p.name] = data;

        Object.entries(data.vitals.grades).forEach(([k, g]) => {
          if (g === 'good') report.summary.good += 1;
          else if (g === 'needs-improvement') report.summary.needsImprovement += 1;
          else if (g === 'poor') report.summary.poor += 1;
        });

        data.images.issues.forEach((issue) => {
          report.summary.issues.push(`${vp.name}/${p.name}: ${issue}`);
        });
      } catch (e) {
        report.pages[vp.name][p.name] = { error: e.message };
        report.summary.issues.push(`${vp.name}/${p.name}: ${e.message}`);
      }
    }
  }

  await browser.close();

  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});