const API = '/api';
let filmsData = null;
let homepageData = null;
let selectedFilmIdx = 0;
let homeTab = 'tagline';

const $ = (sel) => document.querySelector(sel);
const toast = (msg, isError = false) => {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('is-error', isError);
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
};

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { credentials: 'include', ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function checkAuth() {
  try {
    const { authed } = await api('/session');
    if (authed) {
      showApp();
      await loadAll();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  $('#loginView').classList.remove('hidden');
  $('#appView').classList.add('hidden');
}

function showApp() {
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
}

async function loadAll() {
  [filmsData, homepageData] = await Promise.all([
    api('/content?file=films.json'),
    api('/content?file=homepage.json'),
  ]);
  renderFilmList();
  renderFilmEditor();
  renderHomeEditor();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = $('#password').value;
  try {
    await api('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    showApp();
    await loadAll();
  } catch (err) {
    $('#loginError').textContent = err.message;
    $('#loginError').classList.remove('hidden');
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/login', { method: 'DELETE' }).catch(() => {});
  showLogin();
});

document.querySelectorAll('.nav-btn[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn[data-view]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    $('#viewTitle').textContent = view === 'films' ? 'Films' : 'Homepage';
    $('#filmsView').classList.toggle('hidden', view !== 'films');
    $('#homepageView').classList.toggle('hidden', view !== 'homepage');
  });
});

function renderFilmList() {
  const list = $('#filmList');
  list.innerHTML = filmsData.allFilms.map((f, i) => `
    <button class="film-item${i === selectedFilmIdx ? ' active' : ''}" data-idx="${i}">
      ${f.displayName || f.title}
    </button>`).join('');
  list.querySelectorAll('.film-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedFilmIdx = Number(btn.dataset.idx);
      renderFilmList();
      renderFilmEditor();
    });
  });
}

async function uploadFile(file, folder) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  const res = await fetch(`${API}/upload`, { method: 'POST', body: fd, credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
}

function categoryChecks(film) {
  const cats = ['recents', 'favourites', 'classics', 'celebrities', 'international'];
  return cats.map((c) => `
    <label><input type="checkbox" data-cat="${c}" ${film.categories?.includes(c) ? 'checked' : ''}> ${c}</label>
  `).join('');
}

function renderFilmEditor() {
  const f = filmsData.allFilms[selectedFilmIdx];
  if (!f) return;
  const el = $('#filmEditor');
  el.innerHTML = `
    <h3>${f.displayName || f.title}</h3>
    ${f.image ? `<img class="preview-img" src="${f.image}" alt="">` : ''}
    <div class="grid-2">
      <div>
        <label>Display Name</label>
        <input data-f="displayName" value="${f.displayName || ''}">
      </div>
      <div>
        <label>Title (list)</label>
        <input data-f="title" value="${f.title || ''}">
      </div>
      <div>
        <label>Date</label>
        <input data-f="date" value="${f.date || ''}">
      </div>
      <div>
        <label>Location</label>
        <input data-f="location" value="${f.location || ''}">
      </div>
    </div>
    <label>Poster Image URL</label>
    <input data-f="image" value="${f.image || ''}">
    <label>Upload Poster</label>
    <input type="file" accept="image/*" id="filmPosterUpload">
    <label>Preview Video URL</label>
    <input data-f="previewVideo" value="${f.previewVideo || ''}">
    <label>Upload Preview Video</label>
    <input type="file" accept="video/*" id="filmVideoUpload">
    <label>Categories (homepage carousel tabs)</label>
    <div class="checks" id="filmCats">${categoryChecks(f)}</div>
  `;

  el.querySelectorAll('[data-f]').forEach((input) => {
    input.addEventListener('input', () => { f[input.dataset.f] = input.value; });
  });
  el.querySelectorAll('[data-cat]').forEach((cb) => {
    cb.addEventListener('change', () => {
      f.categories = [...el.querySelectorAll('[data-cat]:checked')].map((c) => c.dataset.cat);
      syncCategories(f);
    });
  });
  $('#filmPosterUpload')?.addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      f.image = await uploadFile(file, 'images');
      toast('Poster uploaded');
      renderFilmEditor();
    } catch (err) { toast(err.message, true); }
  });
  $('#filmVideoUpload')?.addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      f.previewVideo = await uploadFile(file, 'videos');
      toast('Video uploaded');
      renderFilmEditor();
    } catch (err) { toast(err.message, true); }
  });
}

function filmToCategoryEntry(film) {
  return {
    slug: film.slug,
    name: film.displayName || film.title,
    date: film.date,
    location: film.location,
    image: film.image,
    previewVideo: film.previewVideo,
  };
}

function rebuildCategories() {
  const cats = ['recents', 'favourites', 'classics', 'celebrities', 'international'];
  filmsData.categories = {};
  cats.forEach((c) => { filmsData.categories[c] = []; });
  filmsData.allFilms.forEach((film) => {
    (film.categories || []).forEach((cat) => {
      if (!filmsData.categories[cat]) filmsData.categories[cat] = [];
      filmsData.categories[cat].push(filmToCategoryEntry(film));
    });
  });
}

function syncCategories(film) {
  Object.keys(filmsData.categories).forEach((cat) => {
    filmsData.categories[cat] = filmsData.categories[cat].filter((x) => x.slug !== film.slug);
  });
  (film.categories || []).forEach((cat) => {
    if (!filmsData.categories[cat]) filmsData.categories[cat] = [];
    filmsData.categories[cat].push(filmToCategoryEntry(film));
  });
}

$('#saveFilmsBtn').addEventListener('click', async () => {
  rebuildCategories();
  try {
    await api('/content?file=films.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filmsData),
    });
    toast('Films saved!');
  } catch (err) { toast(err.message, true); }
});

document.querySelectorAll('#homeTabs .tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#homeTabs .tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    homeTab = btn.dataset.tab;
    renderHomeEditor();
  });
});

function renderHomeEditor() {
  const el = $('#homeEditor');
  const h = homepageData;
  if (homeTab === 'tagline') {
    el.innerHTML = `
      <div class="panel">
        <label>Tagline (HTML allowed for &lt;em&gt;)</label>
        <input data-h="tagline.text" value="${h.tagline?.text || ''}">
      </div>`;
  } else if (homeTab === 'hero') {
    el.innerHTML = h.heroSlides.map((slide, i) => `
      <div class="panel" data-slide="${i}">
        <h3>Slide ${i + 1}</h3>
        <div class="grid-2">
          <div><label>Title</label><input data-s="title" value="${slide.title || ''}"></div>
          <div><label>Slug</label><input data-s="slug" value="${slide.slug || ''}"></div>
          <div><label>Location</label><input data-s="location" value="${slide.location || ''}"></div>
          <div><label>Date</label><input data-s="date" value="${slide.date || ''}"></div>
        </div>
        <label>Description</label>
        <textarea data-s="description">${slide.description || ''}</textarea>
        <label>Image URL</label>
        <input data-s="image" value="${slide.image || ''}">
        <label>Video URL</label>
        <input data-s="video" value="${slide.video || ''}">
      </div>`).join('');
    el.querySelectorAll('.panel[data-slide]').forEach((panel) => {
      const i = Number(panel.dataset.slide);
      panel.querySelectorAll('[data-s]').forEach((input) => {
        input.addEventListener('input', () => { h.heroSlides[i][input.dataset.s] = input.value; });
      });
    });
  } else if (homeTab === 'about') {
    const a = h.aboutTeaser || {};
    el.innerHTML = `
      <div class="panel">
        <label>Kicker</label><input data-a="kicker" value="${a.kicker || ''}">
        <label>Title</label><input data-a="title" value="${a.title || ''}">
        <label>Title Accent (italic part)</label><input data-a="titleAccent" value="${a.titleAccent || ''}">
        <label>Body</label><textarea data-a="body">${a.body || ''}</textarea>
        <label>Main Image URL</label><input data-a="images.main" value="${a.images?.main || ''}">
        <label>Accent Image URL</label><input data-a="images.accent" value="${a.images?.accent || ''}">
        <label>CTA Text</label><input data-a="ctaText" value="${a.ctaText || ''}">
      </div>`;
    el.querySelectorAll('[data-a]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.a;
        if (key.includes('.')) {
          const [p, c] = key.split('.');
          if (!h.aboutTeaser[p]) h.aboutTeaser[p] = {};
          h.aboutTeaser[p][c] = input.value;
        } else {
          h.aboutTeaser[key] = input.value;
        }
      });
    });
  } else if (homeTab === 'gallery') {
    el.innerHTML = h.gallery.map((item, i) => `
      <div class="panel" data-g="${i}">
        <label>Image URL</label><input data-gf="src" value="${item.src || ''}">
        <label>Alt text</label><input data-gf="alt" value="${item.alt || ''}">
        <label>Style class (tall / wide)</label><input data-gf="class" value="${item.class || ''}">
      </div>`).join('');
    el.querySelectorAll('[data-g]').forEach((panel) => {
      const i = Number(panel.dataset.g);
      panel.querySelectorAll('[data-gf]').forEach((input) => {
        input.addEventListener('input', () => { h.gallery[i][input.dataset.gf] = input.value; });
      });
    });
  } else if (homeTab === 'stats') {
    el.innerHTML = h.stats.map((s, i) => `
      <div class="panel" data-st="${i}">
        <div class="grid-2">
          <div><label>Count</label><input data-stf="count" type="number" value="${s.count}"></div>
          <div><label>Suffix (+)</label><input data-stf="suffix" value="${s.suffix || ''}"></div>
          <div><label>Label</label><input data-stf="label" value="${s.label || ''}"></div>
          <div><label>Description</label><input data-stf="description" value="${s.description || ''}"></div>
        </div>
      </div>`).join('');
    el.querySelectorAll('[data-st]').forEach((panel) => {
      const i = Number(panel.dataset.st);
      panel.querySelectorAll('[data-stf]').forEach((input) => {
        input.addEventListener('input', () => {
          h.stats[i][input.dataset.stf] = input.dataset.stf === 'count' ? Number(input.value) : input.value;
        });
      });
    });
  }

  el.querySelectorAll('[data-h]').forEach((input) => {
    input.addEventListener('input', () => {
      const [a, b] = input.dataset.h.split('.');
      if (!h[a]) h[a] = {};
      h[a][b] = input.value;
    });
  });
}

$('#saveHomeBtn').addEventListener('click', async () => {
  try {
    await api('/content?file=homepage.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(homepageData),
    });
    toast('Homepage saved!');
  } catch (err) { toast(err.message, true); }
});

checkAuth();