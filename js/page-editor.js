/**
 * TFC Universal Page Editor
 * Auto-tags all text, images, and videos on any page as editable.
 * Saves per-page content to Supabase via /api/page-content.
 * Works on every page — just include this script + visual-editor.js
 */
(function () {
  const API = '/api';
  const params = new URLSearchParams(location.search);
  const wantsEdit = params.has('edit') || params.get('mode') === 'edit';
  if (!wantsEdit && !sessionStorage.getItem('tfc_edit_intent')) return;

  // Derive page key from data-page attribute or pathname
  const pageName = document.body.dataset.page
    || location.pathname.replace(/^\/|\.html$/g, '').replace(/\//g, '_') || 'index';

  // Elements to skip — nav, footer, scripts, decorative
  const SKIP_SELECTORS = [
    '#site-header', '#site-footer', 'nav', 'header', 'footer',
    'script', 'style', 'noscript', 'svg', '[aria-hidden="true"]',
    '.tfc-ve-toolbar', '.tfc-ve-panel', '.tfc-ve-rtb', '.tfc-ve-toast',
    '[data-cms-bound]', '[data-cms-media-bound]',
  ];

  // Text elements worth editing
  const TEXT_TAGS = new Set(['H1','H2','H3','H4','H5','H6','P','SPAN','LI','BLOCKQUOTE','LABEL','TD','TH','A','BUTTON','DIV']);
  const MIN_TEXT_LENGTH = 3;

  // Store: { selector → { type, value } }
  let pageContent = {};
  let dirty = {};

  // ── Selector generation ──────────────────────────────────────────────────

  function getSelector(el) {
    // Use existing id
    if (el.id && !el.id.startsWith('tfcVe')) return `#${el.id}`;

    // Build a path using class+tag+index
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body) {
      let seg = cur.tagName.toLowerCase();
      if (cur.className && typeof cur.className === 'string') {
        const cls = cur.className.trim().split(/\s+/)
          .filter((c) => c && !c.startsWith('tfc-cms') && !c.startsWith('is-') && !c.startsWith('tfc-ve'))
          .slice(0, 2);
        if (cls.length) seg += '.' + cls.join('.');
      }
      // Add nth-of-type only if siblings exist with same tag
      const siblings = cur.parentElement
        ? Array.from(cur.parentElement.children).filter((c) => c.tagName === cur.tagName)
        : [];
      if (siblings.length > 1) seg += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
      parts.unshift(seg);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function isSkipped(el) {
    return SKIP_SELECTORS.some((sel) => el.closest(sel));
  }

  // ── Apply saved content to DOM ───────────────────────────────────────────

  function applyContent() {
    Object.entries(pageContent).forEach(([selector, { type, value }]) => {
      try {
        const el = document.querySelector(selector);
        if (!el || !value) return;
        if (type === 'image' && el.tagName === 'IMG') { el.src = value; return; }
        if (type === 'video' && (el.tagName === 'VIDEO' || el.tagName === 'SOURCE')) {
          el.src = value;
          el.closest('video')?.load?.();
          return;
        }
        if (type === 'html') { el.innerHTML = value; return; }
        el.textContent = value;
      } catch { /* bad selector */ }
    });
  }

  // ── Auto-tag all editable elements ───────────────────────────────────────

  let _tagScheduled = false;
  function tagAll() {
    if (!document.body.classList.contains('tfc-visual-edit')) return;

    // Text nodes
    document.querySelectorAll(Array.from(TEXT_TAGS).join(',')).forEach((el) => {
      if (isSkipped(el)) return;
      if (el.dataset.cmsBound || el.dataset.cmsPath) return;
      // Skip if it's a wrapper with block children
      const hasBlockChild = Array.from(el.children).some((c) =>
        ['DIV','SECTION','ARTICLE','UL','OL','TABLE','FORM'].includes(c.tagName));
      if (hasBlockChild) return;
      const text = el.textContent.trim();
      if (text.length < MIN_TEXT_LENGTH) return;

      const sel = getSelector(el);
      const isHtml = el.innerHTML !== el.textContent;
      el.dataset.cmsPath = sel;
      el.dataset.cmsType = isHtml ? 'html' : 'text';
      el.dataset.cmsPage = pageName;

      // Apply saved value
      if (pageContent[sel]) {
        if (isHtml) el.innerHTML = pageContent[sel].value;
        else el.textContent = pageContent[sel].value;
      }
    });

    // Images
    document.querySelectorAll('img').forEach((el) => {
      if (isSkipped(el)) return;
      if (el.dataset.cmsMediaBound || el.dataset.cmsPath) return;
      if (!el.src || el.width < 40 || el.naturalWidth < 10) return;
      const sel = getSelector(el);
      el.dataset.cmsPath = sel;
      el.dataset.cmsType = 'image';
      el.dataset.cmsPage = pageName;
      if (pageContent[sel]) el.src = pageContent[sel].value;
    });

    // Videos
    document.querySelectorAll('video').forEach((el) => {
      if (isSkipped(el)) return;
      if (el.dataset.cmsMediaBound || el.dataset.cmsPath) return;
      const sel = getSelector(el);
      el.dataset.cmsPath = sel;
      el.dataset.cmsType = 'video';
      el.dataset.cmsPage = pageName;
      if (pageContent[sel]) { el.src = pageContent[sel].value; el.load(); }
    });

    // Notify visual-editor to bind the newly-tagged elements
    if (!_tagScheduled) {
      _tagScheduled = true;
      setTimeout(() => {
        _tagScheduled = false;
        document.dispatchEvent(new CustomEvent('tfc:page-tagged'));
      }, 80);
    }
  }

  // ── Hook into visual-editor save ─────────────────────────────────────────

  // Override setPath in parent scope by injecting a hook visual-editor calls
  window.TFC_PAGE_EDITOR = {
    pageName,
    onFieldChange(selector, type, value) {
      dirty[selector] = { type, value };
    },
    async saveAll() {
      if (!Object.keys(dirty).length) return;
      const res = await fetch(`${API}/page-content?page=${encodeURIComponent(pageName)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dirty),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }
      dirty = {};
    },
  };

  // ── Load content and boot ─────────────────────────────────────────────────

  async function loadPageContent() {
    try {
      const res = await fetch(`${API}/page-content?page=${encodeURIComponent(pageName)}`, {
        credentials: 'include',
      });
      if (res.ok) pageContent = await res.json();
    } catch { /* use empty */ }
  }

  async function boot() {
    await loadPageContent();
    applyContent();

    // Wait for visual-editor to add the class, then tag
    if (document.body.classList.contains('tfc-visual-edit')) {
      tagAll();
    } else {
      const obs = new MutationObserver(() => {
        if (document.body.classList.contains('tfc-visual-edit')) {
          tagAll();
          obs.disconnect();
        }
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    // Re-tag after DOM mutations (lazy-loaded content, etc.)
    const domObs = new MutationObserver(() => tagAll());
    domObs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
