/**
 * Load CMS content from /api/content (Supabase) with fallback to static files.
 */
(function () {
  const base = document.body?.dataset?.base || '';

  function filmsToLegacy(data) {
    if (!data) return;
    window.TFC_TRAILER_TABS = data.categories || {};
    window.TFC_TRAILER_ASSETS = data.assets || window.TFC_TRAILER_ASSETS || {};
    if (data.allFilms) {
      window.TFC_FILMS = data.allFilms.map((f) => ({
        slug: f.slug,
        title: f.title,
        url: f.url || `films/${f.slug}.html`,
      }));
      window.TFC_FILM_IMAGES = {};
      window.TFC_FILM_PREVIEWS = {};
      data.allFilms.forEach((f) => {
        if (f.image) window.TFC_FILM_IMAGES[f.slug] = f.image;
        const name = f.displayName || f.title;
        if (f.previewVideo) window.TFC_FILM_PREVIEWS[name] = f.previewVideo;
      });
    }
    window.TFC_CONTENT_FILMS = data;
  }

  async function loadFromApi(name) {
    const res = await fetch(`${base}/api/content?file=${name}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`API ${name} ${res.status}`);
    return res.json();
  }

  async function loadFromStatic(name) {
    const res = await fetch(`${base}content/${name}?v=${Date.now()}`);
    if (!res.ok) throw new Error(`Static ${name} ${res.status}`);
    return res.json();
  }

  async function loadJson(name) {
    try {
      return await loadFromApi(name);
    } catch {
      return loadFromStatic(name);
    }
  }

  window.TFC_loadContent = async function TFC_loadContent() {
    try {
      const [films, homepage] = await Promise.all([
        loadJson('films.json'),
        loadJson('homepage.json'),
      ]);
      filmsToLegacy(films);
      window.TFC_CONTENT_HOMEPAGE = homepage;
      window.TFC_CONTENT_READY = true;
      document.dispatchEvent(new CustomEvent('tfc:content-ready', { detail: { films, homepage } }));
      return { films, homepage };
    } catch (err) {
      console.warn('[TFC CMS] Content load failed', err);
      window.TFC_CONTENT_READY = false;
      return null;
    }
  };

  const boot = window.TFC_loadContent();
  window.TFC_CONTENT_BOOT = boot;
})();
