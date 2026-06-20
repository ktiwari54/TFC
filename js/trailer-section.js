/* Dream carousel — horizontal film showcase */
document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('trailerMount')) return;
  if (window.TFC_CONTENT_BOOT) await window.TFC_CONTENT_BOOT;
  initTrailerSection();
});

function initTrailerSection() {
  const mount = document.getElementById('trailerMount');
  const tabs = window.TFC_TRAILER_TABS || {};
  const assets = window.TFC_TRAILER_ASSETS || {};
  const tabIds = ['recents', 'favourites', 'classics', 'celebrities', 'international'];

  mount.innerHTML = tabIds.map((id, i) => {
    const films = tabs[id] || [];
    const items = films.map((f) => trailerItemHtml(f, assets)).join('');
    return `
      <div class="trailer-panel film-panel${i === 0 ? ' active' : ''}" id="${id}" data-tab-panel="${id}">
        <p class="dream-scroll-hint">Let the celebration unfold</p>
        <div class="trailer-wrapper">
          <div class="trailer-list-wrapper dream-carousel-track" data-lenis-prevent data-lenis-prevent-wheel>${items}</div>
        </div>
      </div>`;
  }).join('');

  initTrailerDragScroll();
  initTrailerTabs();

  const isHome = document.body.classList.contains('home-page');
  const filmsSection = document.getElementById('films');

  function bootCarousel() {
    window.TFC_initFilmHoverPreview?.(mount);
    window.TFC_initDreamFilmsCarousel?.();
    const active = mount.querySelector('.trailer-panel.active');
    if (active) window.TFC_magicPanelEnter?.(active);
  }

  if (isHome && filmsSection && 'IntersectionObserver' in window) {
    const bootObserver = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      bootObserver.disconnect();
      requestAnimationFrame(bootCarousel);
    }, { rootMargin: '120px 0px', threshold: 0.05 });
    bootObserver.observe(filmsSection);
  } else {
    setTimeout(bootCarousel, 200);
  }
}

function trailerItemHtml(film, assets) {
  const href = `films/${film.slug}.html`;
  const preview = (window.TFC_FILM_PREVIEWS || {})[film.name] || '';
  const previewAttr = preview ? ` data-preview="${preview}"` : '';

  return `
    <article class="trailer-item dream-card film-card"${previewAttr} data-video="" data-cms-film="${film.slug}">
      <div class="dream-card-glow" aria-hidden="true"></div>
      <div class="trailer-item-wrap dream-card-inner">
        <span class="dream-badge">✦ A TFC Tale</span>
        <div class="dream-card-shine" aria-hidden="true"></div>
        <a href="${href}" class="trailer-content-wrap">
          <div class="text-wrapper">
            <div class="trailer-subtitle">
              <span class="wedding-location" data-cms-film="${film.slug}" data-cms-field="date">${film.date}</span>
              <img class="trailer-arrow" src="${assets.arrow || ''}" alt="" width="10">
              <span class="wedding-location" data-cms-film="${film.slug}" data-cms-field="location">${film.location}</span>
            </div>
            <h2 class="trailer-name film-name" data-cms-film="${film.slug}" data-cms-field="displayName">${film.name}</h2>
          </div>
        </a>
        <div class="slider-play-button">
          <button class="play-btn no-video" type="button" aria-label="Play ${film.name}">
            <img class="play-btn-img" src="${assets.playBtn || ''}" alt="" width="72">
          </button>
        </div>
        <img class="trailer-sufi" src="${assets.sufi || ''}" alt="" aria-hidden="true" width="72">
        <div class="trailer-media film-card-media">
          <img class="trailer-image film-card-poster" src="${film.image}" alt="${film.name}" width="420" height="560" loading="lazy" decoding="async" data-cms-film="${film.slug}" data-cms-field="image" data-cms-type="image">
        </div>
      </div>
    </article>`;
}

function initTrailerTabs() {
  const tabs = document.querySelectorAll('#filmTabs .film-tab');
  const panels = document.querySelectorAll('#trailerMount .trailer-panel');
  if (!tabs.length) return;

  let autoInterval;
  let switching = false;

  async function activate(tab) {
    if (switching) return;
    const id = tab.dataset.tab;
    const prev = document.querySelector('#trailerMount .trailer-panel.active');
    const next = document.getElementById(id);
    if (prev === next) return;

    switching = true;
    tabs.forEach((t) => t.classList.toggle('active', t === tab));

    if (prev && next && typeof gsap !== 'undefined') {
      await window.TFC_magicPanelExit?.(prev);
      prev.classList.remove('active');
      gsap.set(prev.querySelector('.dream-carousel-track, .trailer-list-wrapper'), { x: 0 });
      next.classList.add('active');
      window.TFC_magicPanelEnter?.(next);
      setTimeout(() => window.TFC_dreamRefreshScroll?.(), 150);
      window.dispatchEvent(new CustomEvent('dreamTabChange'));
    } else {
      panels.forEach((p) => p.classList.toggle('active', p.id === id));
      window.TFC_magicPanelEnter?.(next);
    }

    window.TFC_stopFilmPreviews?.();
    switching = false;
    resetAuto();
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => activate(tab)));

  function autoNext() {
    const current = document.querySelector('#filmTabs .film-tab.active');
    const next = current?.nextElementSibling || tabs[0];
    if (next) activate(next);
  }

  function resetAuto() {
    clearInterval(autoInterval);
    if (!document.body.classList.contains('home-page')) {
      autoInterval = setInterval(autoNext, 18000);
    }
  }

  resetAuto();
}

function initTrailerDragScroll() {
  document.querySelectorAll('.trailer-list-wrapper, .dream-carousel-track').forEach((row) => {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    row.addEventListener('mousedown', (e) => {
      if (row.dataset.dreamScroll) return;
      isDown = true;
      row.classList.add('is-dragging');
      startX = e.pageX - row.offsetLeft;
      scrollLeft = row.scrollLeft;
    });

    ['mouseleave', 'mouseup'].forEach((ev) => {
      row.addEventListener(ev, () => {
        isDown = false;
        row.classList.remove('is-dragging');
      });
    });

    row.addEventListener('mousemove', (e) => {
      if (!isDown || row.dataset.dreamScroll) return;
      e.preventDefault();
      const x = e.pageX - row.offsetLeft;
      row.scrollLeft = scrollLeft - (x - startX) * 1.4;
    });
  });
}