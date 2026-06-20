/**
 * Load CMS content from /content/*.json and populate window globals.
 * Falls back to legacy JS files if fetch fails.
 */
(function () {
  const base = document.body?.dataset?.base || '';
  const cacheBust = `?v=${Date.now()}`;

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

  async function loadJson(path) {
    const res = await fetch(`${base}${path}${cacheBust}`);
    if (!res.ok) throw new Error(`Failed ${path}`);
    return res.json();
  }

  window.TFC_loadContent = async function TFC_loadContent() {
    try {
      const [films, homepage] = await Promise.all([
        loadJson('content/films.json'),
        loadJson('content/homepage.json'),
      ]);
      filmsToLegacy(films);
      window.TFC_CONTENT_HOMEPAGE = homepage;
      window.TFC_CONTENT_READY = true;
      document.dispatchEvent(new CustomEvent('tfc:content-ready', { detail: { films, homepage } }));
      return { films, homepage };
    } catch (err) {
      console.warn('[TFC CMS] Using legacy JS content fallback', err);
      window.TFC_CONTENT_READY = false;
      return null;
    }
  };

  const boot = window.TFC_loadContent();
  window.TFC_CONTENT_BOOT = boot;
})();