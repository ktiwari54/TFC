/**
 * TFC Live Visual Editor — click any section on the site to edit in place.
 * Open: /?edit=1  (login required)
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
  let toolbarEl = null;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  function toast(msg, isError) {
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
        if (film.image) {
          el.src = film.image;
          el.alt = film.displayName || film.title;
        }
      });
      const preview = film.previewVideo || '';
      if (preview) card.setAttribute('data-preview', preview);
      else card.removeAttribute('data-preview');
    });
  }

  function bindText(el) {
    if (el.dataset.cmsBound) return;
    el.dataset.cmsBound = '1';
    el.classList.add('tfc-cms-target');
    const path = el.dataset.cmsPath;
    const isHtml = el.dataset.cmsType === 'html';
    el.contentEditable = 'true';
    el.spellcheck = true;

    el.addEventListener('focus', () => el.classList.add('is-editing'));
    el.addEventListener('blur', () => {
      el.classList.remove('is-editing');
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
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !isHtml && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      }
    });
  }

  function closePanel() {
    panelEl?.remove();
    panelEl = null;
  }

  function openMediaPanel(el, opts) {
    closePanel();
    const rect = el.getBoundingClientRect();
    panelEl = document.createElement('div');
    panelEl.className = 'tfc-ve-panel';
    panelEl.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 320)}px`;
    panelEl.style.left = `${Math.min(rect.left, window.innerWidth - 380)}px`;

    const isVideo = opts.type === 'video';
    const current = opts.getValue();

    panelEl.innerHTML = `
      <h4>${isVideo ? 'Edit video' : 'Edit image'}</h4>
      ${!isVideo ? `<img class="tfc-ve-panel-preview" src="${current || ''}" alt="">` : ''}
      <label>${isVideo ? 'Video URL' : 'Image URL'}</label>
      <input type="url" id="tfcVeMediaUrl" value="${current || ''}" placeholder="Paste URL or upload below">
      <label>Upload file</label>
      <input type="file" id="tfcVeMediaFile" accept="${isVideo ? 'video/*' : 'image/*'}">
      <div class="tfc-ve-panel-actions">
        <button type="button" class="tfc-ve-btn tfc-ve-btn--publish" id="tfcVeMediaApply">Apply</button>
        <button type="button" class="tfc-ve-btn tfc-ve-btn--ghost" id="tfcVeMediaClose">Cancel</button>
      </div>`;

    document.body.appendChild(panelEl);

    const urlInput = $('#tfcVeMediaUrl', panelEl);
    const fileInput = $('#tfcVeMediaFile', panelEl);
    const preview = $('.tfc-ve-panel-preview', panelEl);

    urlInput.addEventListener('input', () => {
      if (preview) preview.src = urlInput.value;
    });

    $('#tfcVeMediaClose', panelEl).addEventListener('click', closePanel);

    $('#tfcVeMediaApply', panelEl).addEventListener('click', async () => {
      let url = urlInput.value.trim();
      const file = fileInput.files[0];
      if (file) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('folder', isVideo ? 'videos' : 'images');
          const res = await fetch(`${API}/upload`, { method: 'POST', body: fd, credentials: 'include' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          url = data.url;
        } catch (err) {
          toast(err.message, true);
          return;
        }
      }
      opts.setValue(url);
      opts.applyDom(url);
      markDirty();
      closePanel();
      toast(isVideo ? 'Video updated' : 'Image updated');
    });
  }

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
            if (el.tagName === 'VIDEO') el.src = url;
            const slide = el.closest('.hero-slide');
            if (slide) {
              const play = slide.querySelector('.play-btn');
              if (play) play.dataset.video = url;
              let vid = slide.querySelector('video');
              if (url && !vid) {
                vid = document.createElement('video');
                vid.className = 'homepage-banner-video';
                vid.muted = true;
                vid.loop = true;
                vid.playsInline = true;
                vid.preload = 'metadata';
                slide.querySelector('.hero-media')?.prepend(vid);
              }
              if (vid) {
                vid.src = url;
                vid.play().catch(() => {});
              }
            }
          } else {
            el.src = url;
          }
          if (filmSlug) syncFilmCard(el.closest('[data-cms-film]'));
        },
      });
    });
  }

  function rebuildFilmCategories() {
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

  function bindAll() {
    document.querySelectorAll('[data-cms-path][data-cms-type="text"], [data-cms-path][data-cms-type="html"], [data-cms-path]:not([data-cms-type])').forEach((el) => {
      if (el.dataset.cmsType === 'image' || el.dataset.cmsType === 'video') return;
      if (!el.dataset.cmsType) {
        el.dataset.cmsType = (el.tagName === 'P' || el.tagName === 'H1' || el.tagName === 'H2') && el.innerHTML.includes('<') ? 'html' : 'text';
      }
      bindText(el);
    });

    document.querySelectorAll('[data-cms-film] [data-cms-field]:not([data-cms-type="image"])').forEach(bindText);

    document.querySelectorAll('[data-cms-path][data-cms-type="image"], [data-cms-path][data-cms-type="video"], img[data-cms-path], video[data-cms-path]').forEach(bindMedia);

    document.querySelectorAll('img[data-cms-film][data-cms-field="image"], img[data-cms-path][data-cms-type="image"]').forEach(bindMedia);
    document.querySelectorAll('video[data-cms-path], video[data-cms-film]').forEach(bindMedia);
  }

  function buildToolbar() {
    toolbarEl = document.createElement('header');
    toolbarEl.className = 'tfc-ve-toolbar';
    toolbarEl.id = 'tfcVeToolbar';
    toolbarEl.innerHTML = `
      <div class="tfc-ve-brand">TFC <span>Live Editor</span> <span class="tfc-ve-pill">● Editing</span></div>
      <div class="tfc-ve-actions">
        <button type="button" class="tfc-ve-btn tfc-ve-btn--ghost" id="tfcVePreview">Preview</button>
        <button type="button" class="tfc-ve-btn tfc-ve-btn--publish" id="tfcVePublish" disabled>Published</button>
        <button type="button" class="tfc-ve-btn tfc-ve-btn--ghost" id="tfcVeExit">Exit</button>
      </div>`;
    document.body.appendChild(toolbarEl);

    $('#tfcVePublish').addEventListener('click', publish);
    $('#tfcVeExit').addEventListener('click', () => {
      if (dirty && !confirm('You have unsaved changes. Exit anyway?')) return;
      location.href = location.pathname;
    });
    $('#tfcVePreview').addEventListener('click', () => {
      document.body.classList.toggle('tfc-visual-edit');
      const on = document.body.classList.contains('tfc-visual-edit');
      $('#tfcVePreview').textContent = on ? 'Preview' : 'Resume editing';
    });
  }

  function buildHint() {
    const hint = document.createElement('div');
    hint.className = 'tfc-ve-hint';
    hint.textContent = 'Click any text, image, or video to edit';
    document.body.appendChild(hint);
  }

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
      if (draftHome?.heroSlides) {
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
      toast('Published! Your site is live.');
      window.TFC_CONTENT_HOMEPAGE = draftHome;
      if (window.TFC_CONTENT_FILMS) Object.assign(window.TFC_CONTENT_FILMS, draftFilms);
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
      btn.textContent = 'Publish changes';
    }
  }

  function showLogin() {
    const overlay = document.createElement('div');
    overlay.className = 'tfc-ve-login';
    overlay.innerHTML = `
      <div class="tfc-ve-login-card">
        <h2>Enter the Editor</h2>
        <p>Sign in to edit your site live — click any section to change it.</p>
        <form id="tfcVeLoginForm">
          <input type="password" id="tfcVePassword" placeholder="Admin password" required autocomplete="current-password">
          <button type="submit" class="tfc-ve-btn tfc-ve-btn--publish" style="width:100%">Start editing</button>
        </form>
        <p id="tfcVeLoginErr" style="color:#f0a0a0;margin-top:1rem;display:none;"></p>
      </div>`;
    document.body.appendChild(overlay);

    $('#tfcVeLoginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
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
      }
    });
  }

  async function startEditor() {
    authed = true;
    sessionStorage.setItem('tfc_edit_intent', '1');

    if (window.TFC_CONTENT_BOOT) await window.TFC_CONTENT_BOOT;

    draftHome = JSON.parse(JSON.stringify(window.TFC_CONTENT_HOMEPAGE || {}));
    draftFilms = JSON.parse(JSON.stringify(window.TFC_CONTENT_FILMS || {}));

    if (!draftHome.heroSlides) {
      try {
        draftHome = await api('/content?file=homepage.json');
        draftFilms = await api('/content?file=films.json');
      } catch { /* use empty */ }
    }

    document.body.classList.add('tfc-visual-edit');
    buildToolbar();
    buildHint();
    bindAll();

    document.addEventListener('tfc:homepage-applied', () => {
      setTimeout(bindAll, 100);
    });

    const obs = new MutationObserver(() => bindAll());
    obs.observe(document.body, { childList: true, subtree: true });
  }

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