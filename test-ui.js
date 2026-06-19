/**
 * TFC UI / Visual / Responsive audit
 * Run: node test-ui.js (server must be on localhost:8080)
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:8080';
const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 568, category: 'Mobile' },
  { name: 'mobile-375', width: 375, height: 812, category: 'Mobile' },
  { name: 'mobile-390', width: 390, height: 844, category: 'Mobile' },
  { name: 'mobile-414', width: 414, height: 896, category: 'Mobile' },
  { name: 'tablet-768', width: 768, height: 1024, category: 'Tablet' },
  { name: 'tablet-991', width: 991, height: 1100, category: 'Tablet' },
  { name: 'laptop-1280', width: 1280, height: 800, category: 'Laptop' },
  { name: 'laptop-1366', width: 1366, height: 768, category: 'Laptop' },
  { name: 'desktop-1440', width: 1440, height: 900, category: 'Desktop' },
  { name: 'desktop-1920', width: 1920, height: 1080, category: 'Desktop' },
];

const PAGES = [
  { path: '/index.html', name: 'home' },
  { path: '/films.html', name: 'films' },
  { path: '/about-us.html', name: 'about' },
  { path: '/contact.html', name: 'contact' },
];

const DOM_HELPERS = `
function isVisible(el) {
  if (!el) return false;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) < 0.05) return false;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2;
}
function overlapArea(a, b) {
  return Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l))
    * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
}
`;

async function scrollPage(page) {
  await page.evaluate(async () => {
    const step = Math.max(280, window.innerHeight * 0.75);
    const max = document.documentElement.scrollHeight;
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
}

async function waitForImages(page) {
  await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 2500);
        });
      }),
    );
  });
}

async function auditPage(page, viewport, pageInfo) {
  const issues = [];
  const passes = [];

  await page.goto(`${BASE}${pageInfo.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);
  await scrollPage(page);
  await waitForImages(page);

  const hasHScroll = await page.evaluate(() => (
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  ));
  if (hasHScroll) issues.push('Horizontal overflow detected');
  else passes.push('No horizontal overflow');

  const sectionOverflows = await page.evaluate(() => {
    const sections = [
      '#discover', '#chapter-two', '#films', '#workshop', '#crew', '#stories',
    ];
    const found = [];
    sections.forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 2) {
        found.push(`${sel} bleeds right (${Math.round(r.right - window.innerWidth)}px)`);
      }
      if (r.left < -2) {
        found.push(`${sel} bleeds left (${Math.round(-r.left)}px)`);
      }
    });
    return found;
  });
  if (sectionOverflows.length) issues.push(`Section overflow: ${sectionOverflows.join('; ')}`);

  const overlaps = await page.evaluate((helpers) => {
    eval(helpers);
    const selectors = [
      '.shell-top-bar',
      '.hero-slide.active .hero-content',
      '.sc-menu-btn',
      '.home-chapter-head',
      '.home-scroll--chapter1',
      '.home-scroll--chapter2',
      '#workshop .workshop-grid',
      '#workshop .workshop-card',
      '#crew .crew-grid',
      '.dream-films-stage',
      '.dream-carousel-track',
      '.dream-films-cta',
      '.footer-content',
      '.sc-sidebar.open',
    ];
    const inViewport = (r) => r.b > 0 && r.t < window.innerHeight && r.r > 0 && r.l < window.innerWidth;
    const rects = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (!isVisible(el)) return;
        const box = el.getBoundingClientRect();
        const r = { l: box.left, t: box.top, r: box.right, b: box.bottom };
        if (!inViewport(r)) return;
        rects.push({ sel, el, r });
      });
    });
    const found = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (rects[i].el.contains(rects[j].el) || rects[j].el.contains(rects[i].el)) continue;
        const a = rects[i].r;
        const b = rects[j].r;
        const overlap = !(a.r <= b.l || a.l >= b.r || a.b <= b.t || a.t >= b.b);
        if (overlap && overlapArea(a, b) > 400) {
          found.push(`${rects[i].sel} × ${rects[j].sel}`);
        }
      }
    }
    return found.slice(0, 5);
  }, DOM_HELPERS);
  if (overlaps.length) issues.push(`Overlaps: ${overlaps.join('; ')}`);
  else passes.push('No major element overlaps');

  const imgStats = await page.evaluate((helpers) => {
    eval(helpers);
    const imgs = [...document.querySelectorAll('img')].filter((i) => isVisible(i) || i.loading === 'lazy');
    const inViewBroken = imgs.filter((i) => {
      const r = i.getBoundingClientRect();
      const inView = r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
      return inView && (!i.complete || i.naturalWidth === 0);
    });
    const broken = imgs.filter((i) => !i.complete || i.naturalWidth === 0);
    return {
      total: imgs.length,
      brokenCount: broken.length,
      inViewBroken: inViewBroken.length,
      lazy: imgs.filter((i) => i.loading === 'lazy').length,
    };
  }, DOM_HELPERS);
  if (imgStats.inViewBroken) issues.push(`${imgStats.inViewBroken} broken in-view image(s)`);
  else if (imgStats.brokenCount) passes.push(`Lazy images OK (${imgStats.brokenCount} below fold pending)`);
  else passes.push(`Images OK (${imgStats.total} total, ${imgStats.lazy} lazy)`);

  const iconStats = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll('svg')];
    const visible = svgs.filter((s) => {
      const r = s.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return { total: svgs.length, visible: visible.length };
  });
  if (iconStats.visible === 0 && pageInfo.name !== 'contact') {
    issues.push('No visible SVG icons');
  } else {
    passes.push(`Icons OK (${iconStats.visible} visible SVGs)`);
  }

  const typo = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const h1 = document.querySelector('h1, .hero-title, .page-hero-title');
    const heading = h1 ? getComputedStyle(h1) : null;
    const p = document.querySelector('p');
    const para = p ? getComputedStyle(p) : null;
    return {
      bodyFont: body.fontFamily,
      bodySize: parseFloat(body.fontSize),
      headingFont: heading?.fontFamily || 'n/a',
      lineHeight: para ? parseFloat(para.lineHeight) / parseFloat(para.fontSize) : null,
    };
  });
  if (!typo.bodyFont.toLowerCase().includes('dm sans')) {
    issues.push(`Body font unexpected: ${typo.bodyFont}`);
  } else {
    passes.push(`Typography OK (body ${typo.bodySize}px, line-height ${typo.lineHeight?.toFixed(2) || 'n/a'})`);
  }

  const colors = await page.evaluate(() => {
    const btn = document.querySelector('.btn:not(.is-outline)');
    const red = getComputedStyle(document.documentElement).getPropertyValue('--tfc-red').trim();
    const btnBg = btn ? getComputedStyle(btn).backgroundColor : '';
    return { brandRed: red, btnBg };
  });
  if (colors.brandRed) passes.push('Brand colors defined');
  else issues.push('Missing --tfc-red CSS variable');

  const btnCount = await page.locator('.btn').count();
  if (btnCount === 0) issues.push('No .btn elements found');
  else passes.push(`${btnCount} buttons found`);

  if (viewport.width <= 991) {
    const menuBtn = await page.locator('#scMenuBtn').isVisible();
    if (!menuBtn) issues.push('Mobile menu button not visible');
    else passes.push('Mobile menu button visible');
  }

  if (viewport.width <= 414 && pageInfo.name === 'home') {
    const hintOverlap = await page.evaluate((helpers) => {
      eval(helpers);
      const hint = document.querySelector('.home-scroll-hint');
      if (!hint || !isVisible(hint)) return false;
      const hr = hint.getBoundingClientRect();
      const targets = ['.hero-title', '.hero-desc', '.hero-actions', '.hero-eyebrow'];
      return targets.some((sel) => {
        const el = document.querySelector(`.hero-slide.active ${sel}`);
        if (!el || !isVisible(el)) return false;
        const r = el.getBoundingClientRect();
        return overlapArea(
          { l: hr.left, t: hr.top, r: hr.right, b: hr.bottom },
          { l: r.left, t: r.top, r: r.right, b: r.bottom },
        ) > 100;
      });
    }, DOM_HELPERS);
    if (hintOverlap) issues.push('Scroll hint overlaps hero text');
    else passes.push('Scroll hint clear of hero text');
  }

  const media = await page.evaluate(() => ({
    videos: document.querySelectorAll('video').length,
    gallery: document.querySelectorAll('.cs-gallery-track').length,
    lazyImgs: document.querySelectorAll('img[loading="lazy"]').length,
  }));
  if (pageInfo.name === 'home' && media.videos === 0) issues.push('No video elements on home');
  else if (media.videos) passes.push(`${media.videos} video element(s)`);
  if (pageInfo.name === 'home' && media.gallery) passes.push('Image gallery present');

  if (pageInfo.name === 'home') {
    const anchors = ['#discover', '#chapter-two', '#films', '#workshop', '#crew'];
    for (const anchor of anchors) {
      await page.evaluate((id) => {
        const el = document.querySelector(id);
        if (el) el.scrollIntoView({ block: 'center' });
      }, anchor);
      await page.waitForTimeout(500);

      const localIssues = await page.evaluate(({ helpers, id }) => {
        eval(helpers);
        const section = document.querySelector(id);
        if (!section) return [];
        const found = [];
        const kids = [...section.querySelectorAll(
          '.home-chapter-head, .home-section-head, .home-scroll, .workshop-card, .crew-card, .dream-carousel-track, .cs-tab-nav'
        )].filter(isVisible);
        for (let i = 0; i < kids.length; i++) {
          for (let j = i + 1; j < kids.length; j++) {
            if (kids[i].contains(kids[j]) || kids[j].contains(kids[i])) continue;
            const a = kids[i].getBoundingClientRect();
            const b = kids[j].getBoundingClientRect();
            const ar = { l: a.left, t: a.top, r: a.right, b: a.bottom };
            const br = { l: b.left, t: b.top, r: b.right, b: b.bottom };
            const overlap = !(ar.r <= br.l || ar.l >= br.r || ar.b <= br.t || ar.t >= br.b);
            if (overlap && overlapArea(ar, br) > 200) {
              found.push(`${id}: ${kids[i].className} × ${kids[j].className}`);
            }
          }
        }
        if (section.getBoundingClientRect().right > window.innerWidth + 2) {
          found.push(`${id}: section bleeds horizontally`);
        }
        return found.slice(0, 3);
      }, { helpers: DOM_HELPERS, id: anchor });

      if (localIssues.length) issues.push(...localIssues);
      else passes.push(`${anchor} layout OK at scroll`);
    }
  }

  return { issues, passes };
}

async function testInteractions(page) {
  const results = [];
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.setViewportSize({ width: 1440, height: 900 });

  const navLink = page.locator('.sc-nav-link').first();
  if (await navLink.count()) {
    const colorBefore = await navLink.evaluate((el) => getComputedStyle(el).color);
    await navLink.hover();
    await page.waitForTimeout(200);
    const colorAfter = await navLink.evaluate((el) => getComputedStyle(el).color);
    results.push(colorBefore !== colorAfter ? 'Sidebar nav hover: style changes' : 'Sidebar nav hover: no visible change');
  }

  const blackBtn = page.locator('.shell-top-actions .btn.is-black').first();
  if (await blackBtn.count()) {
    const before = await blackBtn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, transform: s.transform };
    });
    await blackBtn.hover({ force: true });
    await page.waitForTimeout(300);
    const after = await blackBtn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, transform: s.transform };
    });
    const changed = before.bg !== after.bg || before.transform !== after.transform;
    results.push(changed ? 'Black button hover: OK' : 'Black button hover: no visible change');
  }

  const redBtn = page.locator('.shell-top-actions .btn:not(.is-black)').first();
  if (await redBtn.count()) {
    const bgBefore = await redBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    await redBtn.hover();
    await page.waitForTimeout(200);
    const bgAfter = await redBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    results.push(bgBefore !== bgAfter ? 'Red button hover: OK' : 'Red button hover: no visible change');
  }

  const activeNav = await page.locator('.sc-nav-link.active').count();
  results.push(activeNav ? `Active nav state: ${activeNav} active link(s)` : 'Active nav: missing on home');

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  const menu = page.locator('#scMenuBtn');
  if (await menu.isVisible()) {
    await menu.click();
    await page.waitForTimeout(400);
    const open = await page.locator('#site-sidebar.open').count();
    results.push(open ? 'Mobile sidebar opens: OK' : 'Mobile sidebar: failed to open');
    await menu.click();
  }

  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(600);
  const gallery = page.locator('.cs-gallery-track');
  if (await gallery.count()) {
    const scrollW = await gallery.evaluate((el) => el.scrollWidth > el.clientWidth);
    results.push(scrollW ? 'Image gallery scrollable: OK' : 'Gallery: not scrollable');
  }

  const playBtn = page.locator('.play-btn').first();
  if (await playBtn.count()) results.push('Play buttons present: OK');

  await page.evaluate(() => window.scrollTo(0, document.getElementById('films')?.offsetTop || 2000));
  await page.waitForTimeout(800);
  const filmsStage = await page.locator('.dream-films-stage').count();
  if (filmsStage) results.push('Chapter IV films stage: OK');

  return results;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { viewports: {}, interactions: [], summary: { pass: 0, fail: 0, pages: 0 } };

  const testPages = process.env.QUICK ? PAGES.slice(0, 1) : PAGES;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    report.viewports[vp.name] = {};

    for (const p of testPages) {
      try {
        const { issues, passes } = await auditPage(page, vp, p);
        report.viewports[vp.name][p.name] = { issues, passes };
        report.summary.pass += passes.length;
        report.summary.fail += issues.length;
        report.summary.pages += 1;
      } catch (e) {
        report.viewports[vp.name][p.name] = { issues: [e.message], passes: [] };
        report.summary.fail += 1;
      }
    }
    await context.close();
  }

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  report.interactions = await testInteractions(page);
  await browser.close();

  const byCategory = {};
  for (const vp of VIEWPORTS) {
    const cat = vp.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = { issues: 0, passes: 0, failures: [] };
    const pageResults = report.viewports[vp.name] || {};
    Object.entries(pageResults).forEach(([pageName, data]) => {
      byCategory[cat].passes += (data.passes || []).length;
      byCategory[cat].issues += (data.issues || []).length;
      (data.issues || []).forEach((issue) => {
        byCategory[cat].failures.push(`${vp.name}/${pageName}: ${issue}`);
      });
    });
  }
  report.byCategory = byCategory;

  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});