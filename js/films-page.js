/* Films page — dream showcase grid */
(function () {
  const FALLBACK_IMAGES = [
    'https://cdn.prod.website-files.com/658138cfb5ff0b77ba94f1a6/68b95bf2db16a47758441157_AryaFed.jpeg',
    'https://cdn.prod.website-files.com/658138cfb5ff0b77ba94f1a6/68cd4796ad7681b7b12f4f1f_For%20website%20Images%20.png',
    'https://cdn.prod.website-files.com/658138cfb5ff0b77ba94f1a6/68762fb1fb6c30dddaefc218_W%20(15).webp',
    'https://cdn.prod.website-files.com/652e625ed083f8127673075c/6758563415ee032506577218_anushka.avif',
    'https://cdn.prod.website-files.com/652e625ed083f8127673075c/67583bf43827e311a0e6735b_Website.jpg',
    'https://cdn.prod.website-files.com/652e625ed083f8127673075c/675855fa7fdbb8b8299e9c47_alpana.webp',
    'https://cdn.prod.website-files.com/658138cfb5ff0b77ba94f1a6/6703b649f87dd72a7bb4ce74_W-18.webp',
    'https://cdn.prod.website-files.com/652e625ed083f8127673075c/67585526ab7342c02f97440e_faiz%20fajar.webp',
    'https://cdn.prod.website-files.com/652e625ed083f8127673075c/684ff3540a715ad55bc91a9a_HINDU%20WEDDING.png',
    'https://cdn.prod.website-files.com/652e625ed083f8127673075c/6758550dfc8360bd9c198304_heartbeats%20.avif',
  ];

  const CATEGORY_LABELS = {
    all: 'All Tales',
    recents: 'Recents',
    favourites: 'Favourites',
    classics: 'Classics',
    celebrities: 'Celebrities',
    international: 'International',
  };

  function buildFilmMeta() {
    const map = {};
    const categories = {};

    Object.entries(window.TFC_TRAILER_TABS || {}).forEach(([cat, films]) => {
      films.forEach((f) => {
        const key = f.slug;
        map[key] = {
          image: f.image,
          date: f.date,
          location: f.location,
          displayName: f.name,
        };
        if (!categories[key]) categories[key] = new Set();
        categories[key].add(cat);
      });
    });

    return { map, categories };
  }

  function slugHash(slug) {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function normalizeTitle(title) {
    return title.replace(/\s+/g, ' ').replace(/\s*&\s*/g, ' & ').trim();
  }

  function titleToSlugGuess(title) {
    return title.toLowerCase().replace(/\s*&\s*/g, '-').replace(/\s+/g, '-');
  }

  function resolveFilm(film, metaMap, catSets) {
    const imageMap = window.TFC_FILM_IMAGES || {};
    let meta = metaMap[film.slug];
    if (!meta) {
      const guess = titleToSlugGuess(film.title);
      meta = metaMap[guess];
    }
    if (!meta) {
      const previews = window.TFC_FILM_PREVIEWS || {};
      const altTitle = normalizeTitle(film.title);
      for (const [name, url] of Object.entries(previews)) {
        if (normalizeTitle(name).toLowerCase() === altTitle.toLowerCase()) {
          meta = { displayName: altTitle };
          break;
        }
      }
    }
    const image = imageMap[film.slug]
      || meta?.image
      || FALLBACK_IMAGES[slugHash(film.slug) % FALLBACK_IMAGES.length];
    const cats = catSets[film.slug] ? [...catSets[film.slug]] : [];
    return {
      ...film,
      image,
      date: meta?.date || 'TFC Films',
      location: meta?.location || 'Tales From the Culture',
      displayName: meta?.displayName || normalizeTitle(film.title),
      categories: cats,
    };
  }

  function cardHtml(film) {
    const preview = (window.TFC_FILM_PREVIEWS || {})[film.displayName] || '';
    const previewAttr = preview ? ` data-preview="${preview}"` : '';
    const assets = window.TFC_TRAILER_ASSETS || {};

    return `
      <article class="dream-film-card film-card trailer-item"${previewAttr} data-video="" data-categories="${film.categories.join(',')}">
        <a href="${film.url}" class="dream-film-card-link">
          <div class="dream-card-glow" aria-hidden="true"></div>
          <div class="dream-film-card-inner">
            <span class="dream-badge">✦ TFC</span>
            <div class="dream-card-shine" aria-hidden="true"></div>
            <div class="dream-film-card-media film-card-media">
              <img class="film-card-poster" src="${film.image}" alt="${film.displayName}" loading="lazy">
            </div>
            <div class="dream-film-card-info">
              <div class="trailer-subtitle">
                <span class="wedding-location">${film.date}</span>
                <span class="dream-dot">✦</span>
                <span class="wedding-location">${film.location}</span>
              </div>
              <h3 class="film-name trailer-name">${film.displayName}</h3>
            </div>
          </div>
        </a>
      </article>`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (window.TFC_CONTENT_BOOT) await window.TFC_CONTENT_BOOT;
    const page = document.querySelector('.dream-films-page');
    const grid = document.getElementById('allFilmsGrid');
    const countEl = document.getElementById('filmsCount');
    const searchInput = document.getElementById('filmsSearch');
    if (!page || !grid || typeof TFC_FILMS === 'undefined') return;

    const { map: metaMap, categories: catSets } = buildFilmMeta();
    const enriched = TFC_FILMS.map((f) => resolveFilm(f, metaMap, catSets));

    let activeFilter = 'all';
    let searchQuery = '';

    function filteredFilms() {
      return enriched.filter((f) => {
        const matchCat = activeFilter === 'all' || f.categories.includes(activeFilter);
        const q = searchQuery.trim().toLowerCase();
        const matchSearch = !q || f.displayName.toLowerCase().includes(q) || f.title.toLowerCase().includes(q);
        return matchCat && matchSearch;
      });
    }

    function render(animate = true) {
      const films = filteredFilms();
      countEl.textContent = films.length === enriched.length
        ? `${films.length} cinematic tales`
        : `${films.length} of ${enriched.length} tales`;

      grid.innerHTML = films.map(cardHtml).join('');
      window.TFC_initFilmHoverPreview?.(grid);

      if (animate && typeof gsap !== 'undefined') {
        gsap.fromTo(grid, {
          opacity: 0,
          y: 16,
        }, {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: 'power2.out',
        });
      }
    }

    document.querySelectorAll('#filmsFilter .film-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#filmsFilter .film-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.dataset.filter;
        if (typeof gsap !== 'undefined') {
          gsap.to(grid, {
            opacity: 0,
            y: 20,
            duration: 0.25,
            onComplete: () => {
              render();
              gsap.to(grid, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
            },
          });
          window.dispatchEvent(new CustomEvent('dreamTabChange'));
        } else {
          render(false);
        }
      });
    });

    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          searchQuery = searchInput.value;
          render();
        }, 280);
      });
    }

    if (typeof window.initDreamPageParticles === 'function') {
      window.initDreamPageParticles(page);
    }

    render(false);
    requestAnimationFrame(() => render(true));
  });
})();