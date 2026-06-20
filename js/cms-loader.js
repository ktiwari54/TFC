/**
 * Apply homepage.json to DOM (hero, tagline, gallery, stats, Who We Are).
 */
(function () {
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function applyHomepage(data) {
    if (!data || !document.body.classList.contains('home-page')) return;

    if (data.tagline?.text) {
      const el = document.getElementById('taglineText');
      if (el) el.innerHTML = data.tagline.text;
    }

    if (data.heroSlides?.length) {
      const slider = document.getElementById('heroSlider');
      if (slider) {
        slider.innerHTML = data.heroSlides.map((slide, i) => {
          const video = slide.video
            ? `<video class="homepage-banner-video" muted${i === 0 ? ' autoplay' : ''} loop playsinline preload="metadata" src="${esc(slide.video)}"></video>`
            : '';
          return `
          <div class="hero-slide${i === 0 ? ' active' : ''}">
            <div class="hero-media">
              ${video}
              <img class="hero-banner-image" src="${esc(slide.image)}" alt="${esc(slide.title)} wedding film">
            </div>
            <div class="hero-overlay"></div>
            <div class="hero-content container">
              <div class="hero-eyebrow">
                <span class="eyebrow">${esc(slide.location)}</span>
                <svg class="eyebrow-icon" viewBox="0 0 12 7" fill="currentColor"><path d="M0 6.5V0.5L12 3.875L0 6.5Z"/></svg>
                <span class="eyebrow">${esc(slide.date)}</span>
              </div>
              <a href="films/${esc(slide.slug)}.html"><h1 class="hero-title">${esc(slide.title)}</h1></a>
              <p class="hero-desc">${esc(slide.description)}</p>
              <div class="hero-actions">
                <button class="play-btn" data-video="${esc(slide.video || '')}" aria-label="Play film">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </div>
            </div>
          </div>`;
        }).join('');
        window.TFC_initHeroSlider?.();
      }
    }

    if (data.gallery?.length) {
      const track = document.querySelector('.cs-gallery-track');
      if (track) {
        track.innerHTML = data.gallery.map((item) => `
          <div class="cs-gallery-item${item.class ? ` ${item.class}` : ''}">
            <img src="${esc(item.src)}" alt="${esc(item.alt)}" width="280" height="373" loading="lazy" decoding="async">
          </div>`).join('');
      }
    }

    if (data.stats?.length) {
      const grid = document.querySelector('.cs-stats-grid');
      if (grid) {
        grid.innerHTML = data.stats.map((s) => `
          <div class="cs-stat-card">
            <div class="cs-stat-num" data-count="${s.count}" data-suffix="${esc(s.suffix || '')}">0</div>
            <div class="cs-stat-label">${esc(s.label)}</div>
            <p class="cs-stat-desc">${esc(s.description)}</p>
          </div>`).join('');
        window.TFC_initStatCounters?.();
      }
    }

    const about = data.aboutTeaser;
    if (about) {
      const kicker = document.querySelector('#about .home-section-kicker');
      const title = document.querySelector('#about .about-title');
      const text = document.querySelector('#about .about-text');
      const mainImg = document.querySelector('#about .about-photo--main img');
      const accentImg = document.querySelector('#about .about-photo--accent img');
      const statsRow = document.querySelector('#about .about-stats');
      const cta = document.querySelector('#about .about-cta');

      if (kicker && about.kicker) kicker.textContent = about.kicker;
      if (title && about.title) {
        title.innerHTML = `${esc(about.title)} <span class="accent">${esc(about.titleAccent || '')}</span>`;
      }
      if (text && about.body) text.textContent = about.body;
      if (mainImg && about.images?.main) {
        mainImg.src = about.images.main;
        mainImg.alt = 'TFC crew capturing a wedding celebration';
      }
      if (accentImg && about.images?.accent) {
        accentImg.src = about.images.accent;
        accentImg.alt = 'Cinematic wedding moment by TFC';
      }
      if (statsRow && about.stats?.length) {
        statsRow.innerHTML = about.stats.map((s) => `
          <div class="stat-item">
            <h3>${esc(s.value)}</h3>
            <p>${esc(s.label)}</p>
          </div>`).join('');
      }
      if (cta && about.ctaText) {
        cta.href = about.ctaLink || 'contact.html';
        const svg = cta.querySelector('svg');
        cta.innerHTML = `${esc(about.ctaText)} `;
        if (svg) cta.appendChild(svg);
      }
    }

    document.dispatchEvent(new CustomEvent('tfc:homepage-applied'));
  }

  function onReady() {
    const homepage = window.TFC_CONTENT_HOMEPAGE;
    if (homepage) applyHomepage(homepage);
  }

  document.addEventListener('tfc:content-ready', onReady);
  if (window.TFC_CONTENT_BOOT) {
    window.TFC_CONTENT_BOOT.then(() => onReady());
  }
})();