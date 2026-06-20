/**
 * TFC Live Visual Editor — click any section on the site to edit in place.
 * Open: /?edit=1
 */
(function () {
  const API = '/api';
  const params = new URLSearchParams(location.search);
  const wantsEdit = params.has('edit') || params.get('mode') === 'edit';

  if (!wantsEdit && !sessionStorage.getItem('tfc_edit_intent')) return;

  let authed = false;
  let dirty = false;
  let draftHome = null;
  let draftFilms = null;
  let panelEl = null;
  let rtbEl = null; // rich text toolbar

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  // ─── Utilities ────────────────────────────────────────────────────────────

  function toast(msg, isError) {
    document.querySelectorAll('.tfc-ve-toast').forEach((t) => t.remove());
    const el = document.createElement('div');
    el.className = `tfc-ve-toast${isError ? ' is-error' : ''}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  async function api(path, opts = {}) {
    const res = await fetch(`${API}${path}`, { credentials: 'include', ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function setPath(obj, path, val) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] == null) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = val;
  }

  function markDirty() {
    dirty = true;
    const pub = $('#tfcVePublish');
    if (pub) {
      pub.disabled = false;
      pub.classList.add('is-dirty');
      pub.textContent = 'Publish changes';
    }
  }

  function filmBySlug(slug) {
    return draftFilms?.allFilms?.find((f) => f.slug === slug);
  }

  function syncFilmCard(article) {
    if (!article) return;
    const slug = article.dataset.cmsFilm;
    const film = filmBySlug(slug);
    if (!film) return;
    document.querySelectorAll(`[data-cms-film="${slug}"]`).forEach((card) => {
      card.querySelectorAll('[data-cms-field="displayName"]').forEach((el) => {
        el.textContent = film.displayName || film.title;
      });
      card.querySelectorAll('[data-cms-field="date"]').forEach((el) => { el.textContent = film.date || ''; });
      card.querySelectorAll('[data-cms-field="location"]').forEach((el) => { el.textContent = film.location || ''; });
      card.querySelectorAll('[data-cms-field="image"]').forEach((el) => {
        if (film.image) { el.src = film.image; el.alt = film.displayName || film.title; }
      });
      const preview = film.previewVideo || '';
      if (preview) card.setAttribute('data-preview', preview);
      else card.removeAttribute('data-preview');
    });
  }

  function rebuildFilmCategories() {
    if (!draftFilms) return;
    const cats = ['recents', 'favourites', 'classics', 'celebrities', 'international'];
    draftFilms.categories = {};
    cats.forEach((c) => { draftFilms.categories[c] = []; });
    draftFilms.allFilms.forEach((film) => {
      (film.categories || []).forEach((cat) => {
        if (!draftFilms.categories[cat]) draftFilms.categories[cat] = [];
        draftFilms.categories[cat].push({
          slug: film.slug,
          name: film.displayName || film.title,
          date: film.date,
          location: film.location,
          image: film.image,
          previewVideo: film.previewVideo,
        });
      });
    });
  }

  // ─── Rich Text Toolbar ────────────────────────────────────────────────────

  const RTB_CMDS = [
    { cmd: 'bold', icon: '<b>B</b>', title: 'Bold' },
    { cmd: 'italic', icon: '<i>I</i>', title: 'Italic' },
    { cmd: 'underline', icon: '<u>U</u>', title: 'Underline' },
    { cmd: null, icon: '|', title: '', sep: true },
    { cmd: 'insertUnorderedList', icon: '≡', title: 'Bullet list' },
    { cmd: 'insertOrderedList', icon: '1.', title: 'Numbered list' },
    { cmd: null, icon: '|', title: '', sep: true },
    { cmd: '_link', icon: '🔗', title: 'Insert link' },
    { cmd: '_unlink', icon: '✂', title: 'Remove link' },
    { cmd: null, icon: '|', title: '', sep: true },
    { cmd: 'removeFormat', icon: '✕', title: 'Clear formatting' },
  ];

  function buildRichToolbar() {
    if (rtbEl) return;
    rtbEl = document.createElement('div');
    rtbEl.className = 'tfc-ve-rtb';
    rtbEl.innerHTML = RTB_CMDS.map((c) => {
      if (c.sep) return `<span class="tfc-ve-rtb-sep"></span>`;
      return `<button type="button" class="tfc-ve-rtb-btn" data-cmd="${c.cmd}" title="${c.title}">${c.icon}</button>`;
    }).join('');
    document.body.appendChild(rtbEl);

    rtbEl.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        if (cmd === '_link') {
          const url = prompt('Enter URL:');
          if (url) document.execCommand('createLink', false, url);
        } else if (cmd === '_unlink') {
          document.execCommand('unlink', false, null);
        } else {
          document.execCommand(cmd, false, null);
        }
      });
    });
  }

  function showRichToolbar(el) {
    if (!rtbEl) buildRichToolbar();
    const rect = el.getBoundingClientRect();
    const top = Math.max(60, rect.top - 48 + window.scrollY);
    rtbEl.style.top = `${top}px`;
    rtbEl.style.left = `${Math.max(8, rect.left)}px`;
    rtbEl.classList.add('is-visible');
  }

  function hideRichToolbar() {
    rtbEl?.classList.remove('is-visible');
  }

  // ─── Text binding ─────────────────────────────────────────────────────────

  function bindText(el) {
    if (el.dataset.cmsBound) return;
    el.dataset.cmsBound = '1';
    el.classList.add('tfc-cms-target');
    const path = el.dataset.cmsPath;
    const isHtml = el.dataset.cmsType === 'html';
    el.contentEditable = 'true';
    el.spellcheck = true;

    el.addEventListener('focus', () => {
      el.classList.add('is-editing');
      if (isHtml) showRichToolbar(el);
    });

    el.addEventListener('blur', (e) => {
      // delay so toolbar clicks register first
      setTimeout(() => {
        if (rtbEl?.matches(':hover')) return;
        el.classList.remove('is-editing');
        hideRichToolbar();
        const val = isHtml ? el.innerHTML : el.textContent.trim();
        if (el.dataset.cmsFilm && el.dataset.cmsField) {
          const film = filmBySlug(el.dataset.cmsFilm);
          if (film) {
            film[el.dataset.cmsField] = val;
            if (el.dataset.cmsField === 'displayName') {
              document.querySelectorAll(`[data-cms-film="${film.slug}"] [data-cms-field="displayName"]`).forEach((n) => {
                if (n !== el) n.textContent = val;
              });
            }
            syncFilmCard(el.closest('[data-cms-film]') || el);
            rebuildFilmCategories();
          }
        } else if (path) {
          setPath(draftHome, path, val);
          if (el.dataset.cmsAltPath) setPath(draftHome, el.dataset.cmsAltPath, el.alt || '');
        }
        markDirty();
      }, 120);
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !isHtml && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        publish();
      }
    });
  }

  // ─── Media panel ──────────────────────────────────────────────────────────

  function closePanel() {
    panelEl?.remove();
    panelEl = null;
  }

  function openMediaPanel(el, opts) {
    closePanel();
    const isVideo = opts.type === 'video';
    const current = opts.getValue();

    panelEl = document.createElement('div');
    panelEl.className = 'tfc-ve-panel';

    panelEl.innerHTML = `
      <div class="tfc-ve-panel-header">
        <span>${isVideo ? '🎬 Edit video' : '🖼 Edit image'}</span>
        <button type="button" class="tfc-ve-panel-close" id="tfcVeMediaClose">✕</button>
      </div>

      ${!isVideo ? `
        <div class="tfc-ve-panel-preview-wrap">
          <img class="tfc-ve-panel-preview" src="${current || ''}" alt="">
          <div class="tfc-ve-panel-preview-overlay">Click to change</div>
        </div>` : `
        <div class="tfc-ve-panel-video-wrap" id="tfcVeVideoWrap">
          ${current ? `<video src="${current}" controls muted class="tfc-ve-panel-video"></video>` : '<div class="tfc-ve-panel-video-empty">No video set</div>'}
        </div>`}

      <div class="tfc-ve-panel-drop" id="tfcVeDrop">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 16V4m0 0L8 8m4-4 4 4M4 20h16"/></svg>
        <span>Drop file here or <label class="tfc-ve-panel-browse" for="tfcVeMediaFile">browse</label></span>
        <input type="file" id="tfcVeMediaFile" accept="${isVideo ? 'video/*' : 'image/*'}" style="display:none">
      </div>

      <div class="tfc-ve-panel-divider"><span>or paste URL</span></div>

      <input type="url" id="tfcVeMediaUrl" class="tfc-ve-panel-url" value="${current || ''}" placeholder="https://…">

      <div class="tfc-ve-panel-actions">
        <button type="button" class="tfc-ve-btn tfc-ve-btn--publish" id="tfcVeMediaApply">Apply</button>
        <button type="button" class="tfc-ve-btn tfc-ve-btn--ghost" id="tfcVeMediaCancel">Cancel</button>
      </div>
      <div class="tfc-ve-panel-progress" id="tfcVeProgress" style="display:none">
        <div class="tfc-ve-panel-progress-bar" id="tfcVeProgressBar"></div>
      </div>`;

    document.body.appendChild(panelEl);

    // Position panel
    const rect = el.getBoundingClientRect();
    const pw = Math.min(380, window.innerWidth - 32);
    let left = rect.left;
    let top = rect.bottom + 8 + window.scrollY;
    if (left + pw > window.innerWidth - 16) left = window.innerWidth - pw - 16;
    if (top + 460 > window.scrollY + window.innerHeight) top = rect.top + window.scrollY - 470;
    panelEl.style.cssText = `position:absolute;top:${top}px;left:${left}px;width:${pw}px;`;

    const urlInput = $('#tfcVeMediaUrl', panelEl);
    const fileInput = $('#tfcVeMediaFile', panelEl);
    const preview = $('.tfc-ve-panel-preview', panelEl);
    const videoWrap = $('#tfcVeVideoWrap', panelEl);
    const dropZone = $('#tfcVeDrop', panelEl);

    // URL preview update
    urlInput.addEventListener('input', () => {
      if (preview) preview.src = urlInput.value;
      if (videoWrap && urlInput.value) {
        videoWrap.innerHTML = `<video src="${urlInput.value}" controls muted class="tfc-ve-panel-video"></video>`;
      }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('is-dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('is-dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    async function handleFile(file) {
      const progress = $('#tfcVeProgress', panelEl);
      const bar = $('#tfcVeProgressBar', panelEl);
      progress.style.display = 'block';
      bar.style.width = '0%';

      // Animate progress (fake — fetch doesn't expose upload progress easily)
      let pct = 0;
      const tick = setInterval(() => {
        pct = Math.min(pct + 10, 85);
        bar.style.width = `${pct}%`;
      }, 120);

      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', isVideo ? 'videos' : 'images');
        const res = await fetch(`${API}/upload`, { method: 'POST', body: fd, credentials: 'include' });
        const data = await res.json();
        clearInterval(tick);
        if (!res.ok) throw new Error(data.error);
        bar.style.width = '100%';
        urlInput.value = data.url;
        if (preview) preview.src = data.url;
        if (videoWrap) videoWrap.innerHTML = `<video src="${data.url}" controls muted class="tfc-ve-panel-video"></video>`;
        toast('Uploaded! Click Apply to save.');
      } catch (err) {
        clearInterval(tick);
        toast(err.message, true);
        progress.style.display = 'none';
      }
    }

    $('#tfcVeMediaClose', panelEl).addEventListener('click', closePanel);
    $('#tfcVeMediaCancel', panelEl).addEventListener('click', closePanel);

    $('#tfcVeMediaApply', panelEl).addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) { toast('Please enter or upload a file first', true); return; }
      opts.setValue(url);
      opts.applyDom(url);
      markDirty();
      closePanel();
      toast(isVideo ? 'Video updated — publish to save' : 'Image updated — publish to save');
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function outsideClick(e) {
        if (!panelEl?.contains(e.target) && e.target !== el) {
          closePanel();
          document.removeEventListener('click', outsideClick);
        }
      });
    }, 100);
  }

  // ─── Media binding ────────────────────────────────────────────────────────

  function bindMedia(el) {
    if (el.dataset.cmsMediaBound) return;
    el.dataset.cmsMediaBound = '1';
    el.classList.add('tfc-cms-media');

    el.addEventListener('click', (e) => {
      if (!document.body.classList.contains('tfc-visual-edit')) return;
      e.preventDefault();
      e.stopPropagation();

      const path = el.dataset.cmsPath;
      const isVideo = el.tagName === 'VIDEO' || el.dataset.cmsType === 'video';
      const filmSlug = el.dataset.cmsFilm;
      const field = el.dataset.cmsField;

      openMediaPanel(el, {
        type: isVideo ? 'video' : 'image',
        getValue: () => {
          if (filmSlug && field) return filmBySlug(filmSlug)?.[field] || el.src || '';
          if (path) return getPath(draftHome, path) || el.src || '';
          return el.src || el.getAttribute('src') || '';
        },
        setValue: (url) => {
          if (filmSlug && field) {
            const film = filmBySlug(filmSlug);
            if (film) film[field] = url;
            rebuildFilmCategories();
          } else if (path) {
            setPath(draftHome, path, url);
          }
        },
        applyDom: (url) => {
          if (isVideo) {
            if (el.tagName === 'VIDEO') { el.src = url; el.load(); }
            const slide = el.closest('.hero-slide');
            if (slide) {
              const play = slide.querySelector('.play-btn');
              if (play) play.dataset.video = url;
              let vid = slide.querySelector('video');
              if (url && !vid) {
                vid = document.createElement('video');
                vid.className = 'homepage-banner-video';
                vid.muted = true; vid.loop = true; vid.playsInline = true; vid.preload = 'metadata';
                slide.querySelector('.hero-media')?.prepend(vid);
              }
              if (vid) { vid.src = url; vid.play().catch(() => {}); }
            }
          } else {
            el.src = url;
          }
          if (filmSlug) syncFilmCard(el.closest('[data-cms-film]'));
        },
      });
    });
  }

  // ─── Bind all editable elements ───────────────────────────────────────────

  function bindAll() {
    // Text/HTML fields
    document.querySelectorAll('[data-cms-path]').forEach((el) => {
      const type = el.dataset.cmsType;
      if (type === 'image' || type === 'video') return;
      if (!type) {
        el.dataset.cmsType = el.innerHTML.includes('<') ? 'html' : 'text';
      }
      bindText(el);
    });

    document.querySelectorAll('[data-cms-film] [data-cms-field]:not([data-cms-type="image"]):not([data-cms-type="video"])').forEach(bindText);

    // Image/video fields
    document.querySelectorAll('[data-cms-path][data-cms-type="image"], [data-cms-path][data-cms-type="video"], img[data-cms-path], video[data-cms-path]').forEach(bindMedia);
    document.querySelectorAll('img[data-cms-film][data-cms-field="image"]').forEach(bindMedia);
    document.querySelectorAll('video[data-cms-film]').forEach(bindMedia);
  }

  // ─── Toolbar ──────────────────────────────────────────────────────────────

  function buildToolbar() {
    const tb = document.createElement('header');
    tb.className = 'tfc-ve-toolbar';
    tb.id = 'tfcVeToolbar';
    tb.innerHTML = `
      <div class="tfc-ve-brand">
        TFC <span>Live Editor</span>
        <span class="tfc-ve-pill">● Editing</span>
      </div>
      <div class="tfc-ve-actions">
        <button type="button" class="tfc-ve-btn tfc-ve-btn--ghost" id="tfcVePreview">Preview</button>
        <button type="button" class="tfc-ve-btn tfc-ve-btn--publish" id="tfcVePublish" disabled>Published</button>
        <button type="button" class="tfc-ve-btn tfc-ve-btn--ghost" id="tfcVeExit">Exit</button>
      </div>`;
    document.body.appendChild(tb);

    $('#tfcVePublish').addEventListener('click', publish);

    $('#tfcVeExit').addEventListener('click', () => {
      if (dirty && !confirm('You have unsaved changes. Exit anyway?')) return;
      sessionStorage.removeItem('tfc_edit_intent');
      location.href = location.pathname;
    });

    $('#tfcVePreview').addEventListener('click', () => {
      const on = document.body.classList.toggle('tfc-visual-edit');
      $('#tfcVePreview').textContent = on ? 'Preview' : 'Resume editing';
      if (!on) { closePanel(); hideRichToolbar(); }
    });
  }

  function buildHint() {
    const hint = document.createElement('div');
    hint.className = 'tfc-ve-hint';
    hint.innerHTML = `<span>✏️</span> Click any text, image, or video to edit &nbsp;·&nbsp; <kbd>Ctrl+S</kbd> to publish`;
    document.body.appendChild(hint);
    setTimeout(() => hint.style.opacity = '0', 5000);
    setTimeout(() => hint.remove(), 5500);
  }

  // ─── Publish ──────────────────────────────────────────────────────────────

  async function publish() {
    const btn = $('#tfcVePublish');
    btn.disabled = true;
    btn.textContent = 'Publishing…';
    try {
      rebuildFilmCategories();
      const saves = [
        api('/content?file=films.json', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftFilms),
        }),
      ];
      if (draftHome && Object.keys(draftHome).length) {
        saves.push(api('/content?file=homepage.json', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftHome),
        }));
      }
      await Promise.all(saves);
      dirty = false;
      btn.classList.remove('is-dirty');
      btn.textContent = 'Published ✓';
      toast('Published! Changes are live.');
      window.TFC_CONTENT_HOMEPAGE = draftHome;
      if (window.TFC_CONTENT_FILMS) Object.assign(window.TFC_CONTENT_FILMS, draftFilms);
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
      btn.textContent = 'Publish changes';
    }
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  function showLogin() {
    const overlay = document.createElement('div');
    overlay.className = 'tfc-ve-login';
    overlay.innerHTML = `
      <div class="tfc-ve-login-card">
        <h2>Enter the Editor</h2>
        <p>Sign in to edit your site live — click any section to change it.</p>
        <form id="tfcVeLoginForm">
          <input type="password" id="tfcVePassword" placeholder="Admin password" required autocomplete="current-password">
          <button type="submit" class="tfc-ve-btn tfc-ve-btn--publish" style="width:100%;margin-top:.5rem">Start editing</button>
        </form>
        <p id="tfcVeLoginErr" style="color:#f0a0a0;margin-top:1rem;display:none;font-size:.85rem"></p>
      </div>`;
    document.body.appendChild(overlay);

    $('#tfcVeLoginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('[type=submit]');
      btn.textContent = 'Signing in…';
      btn.disabled = true;
      try {
        await api('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: $('#tfcVePassword').value }),
        });
        overlay.remove();
        await startEditor();
      } catch (err) {
        const errEl = $('#tfcVeLoginErr');
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.textContent = 'Start editing';
        btn.disabled = false;
      }
    });
  }

  // ─── Start editor ─────────────────────────────────────────────────────────

  async function startEditor() {
    authed = true;
    sessionStorage.setItem('tfc_edit_intent', '1');

    if (window.TFC_CONTENT_BOOT) await window.TFC_CONTENT_BOOT;

    draftHome = JSON.parse(JSON.stringify(window.TFC_CONTENT_HOMEPAGE || {}));
    draftFilms = JSON.parse(JSON.stringify(window.TFC_CONTENT_FILMS || {}));

    if (!draftHome.heroSlides && !draftHome.tagline) {
      try {
        [draftHome, draftFilms] = await Promise.all([
          api('/content?file=homepage.json'),
          api('/content?file=films.json'),
        ]);
      } catch (e) { console.warn('[editor] content load failed', e); }
    }

    document.body.classList.add('tfc-visual-edit');
    buildToolbar();
    buildHint();
    bindAll();

    document.addEventListener('tfc:homepage-applied', () => setTimeout(bindAll, 100));

    const obs = new MutationObserver(() => bindAll());
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // ─── Boot ────────────────────────────────────────────────────────────────

  async function boot() {
    sessionStorage.setItem('tfc_edit_intent', '1');
    try {
      const { authed: ok } = await api('/session');
      if (ok) await startEditor();
      else showLogin();
    } catch {
      showLogin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
