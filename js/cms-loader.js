/**
 * Apply homepage.json to DOM + attach CMS paths for live visual editor.
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
      if (el) {
        el.innerHTML = data.tagline.text;
        el.dataset.cmsPath = 'tagline.text';
        el.dataset.cmsType = 'html';
      }
    }

    if (data.heroSlides?.length) {
      const slider = document.getElementById('heroSlider');
      if (slider) {
        slider.innerHTML = data.heroSlides.map((slide, i) => {
          const video = slide.video
            ? `<video class="homepage-banner-video tfc-cms-media" muted${i === 0 ? ' autoplay' : ''} loop playsinline preload="metadata" src="${esc(slide.video)}" data-cms-path="heroSlides.${i}.video" data-cms-type="video"></video>`
            : '';
          return `
          <div class="hero-slide${i === 0 ? ' active' : ''}" data-cms-hero="${i}">
            <div class="hero-media">
              ${video}
              <img class="hero-banner-image tfc-cms-media" src="${esc(slide.image)}" alt="${esc(slide.title)} wedding film" data-cms-path="heroSlides.${i}.image" data-cms-type="image">
            </div>
            <div class="hero-overlay"></div>
            <div class="hero-content container">
              <div class="hero-eyebrow">
                <span class="eyebrow" data-cms-path="heroSlides.${i}.location" data-cms-type="text">${esc(slide.location)}</span>
                <svg class="eyebrow-icon" viewBox="0 0 12 7" fill="currentColor"><path d="M0 6.5V0.5L12 3.875L0 6.5Z"/></svg>
                <span class="eyebrow" data-cms-path="heroSlides.${i}.date" data-cms-type="text">${esc(slide.date)}</span>
              </div>
              <a href="films/${esc(slide.slug)}.html"><h1 class="hero-title" data-cms-path="heroSlides.${i}.title" data-cms-type="text">${esc(slide.title)}</h1></a>
              <p class="hero-desc" data-cms-path="heroSlides.${i}.description" data-cms-type="text">${esc(slide.description)}</p>
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
        track.innerHTML = data.gallery.map((item, i) => `
          <div class="cs-gallery-item${item.class ? ` ${item.class}` : ''}">
            <img src="${esc(item.src)}" alt="${esc(item.alt)}" width="280" height="373" loading="lazy" decoding="async"
              data-cms-path="gallery.${i}.src" data-cms-type="image" data-cms-alt-path="gallery.${i}.alt">
          </div>`).join('');
      }
    }

    if (data.stats?.length) {
      const grid = document.querySelector('.cs-stats-grid');
      if (grid) {
        grid.innerHTML = data.stats.map((s, i) => `
          <div class="cs-stat-card">
            <div class="cs-stat-num" data-count="${s.count}" data-suffix="${esc(s.suffix || '')}">0</div>
            <div class="cs-stat-label" data-cms-path="stats.${i}.label" data-cms-type="text">${esc(s.label)}</div>
            <p class="cs-stat-desc" data-cms-path="stats.${i}.description" data-cms-type="text">${esc(s.description)}</p>
          </div>`).join('');
        window.TFC_initStatCounters?.();
      }
    }

    const ch = data.chapters || {};
    if (ch.chapter1) {
      const t = document.querySelector('#discover .home-chapter-title');
      const p = document.querySelector('#discover .home-chapter-text');
      if (t && ch.chapter1.title) { t.textContent = ch.chapter1.title; t.dataset.cmsPath = 'chapters.chapter1.title'; t.dataset.cmsType = 'text'; }
      if (p && ch.chapter1.text) { p.textContent = ch.chapter1.text; p.dataset.cmsPath = 'chapters.chapter1.text'; p.dataset.cmsType = 'text'; }
    }
    if (ch.chapter2) {
      const t = document.querySelector('#chapter-two .home-chapter-title');
      const p = document.querySelector('#chapter-two .home-chapter-text');
      if (t && ch.chapter2.title) { t.textContent = ch.chapter2.title; t.dataset.cmsPath = 'chapters.chapter2.title'; t.dataset.cmsType = 'text'; }
      if (p && ch.chapter2.text) { p.textContent = ch.chapter2.text; p.dataset.cmsPath = 'chapters.chapter2.text'; p.dataset.cmsType = 'text'; }
    }
    if (ch.chapter3) {
      const t = document.querySelector('.cs-stats.home-chapter .home-chapter-title');
      const p = document.querySelector('.cs-stats.home-chapter .home-chapter-text');
      if (t && ch.chapter3.title) { t.textContent = ch.chapter3.title; t.dataset.cmsPath = 'chapters.chapter3.title'; t.dataset.cmsType = 'text'; }
      if (p && ch.chapter3.text) { p.textContent = ch.chapter3.text; p.dataset.cmsPath = 'chapters.chapter3.text'; p.dataset.cmsType = 'text'; }
    }
    if (ch.chapter4) {
      const t = document.querySelector('#films .home-chapter-title');
      const p = document.querySelector('#films .home-chapter-text');
      if (t && ch.chapter4.title) { t.textContent = ch.chapter4.title; t.dataset.cmsPath = 'chapters.chapter4.title'; t.dataset.cmsType = 'text'; }
      if (p && ch.chapter4.text) { p.textContent = ch.chapter4.text; p.dataset.cmsPath = 'chapters.chapter4.text'; p.dataset.cmsType = 'text'; }
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

      if (kicker && about.kicker) {
        kicker.textContent = about.kicker;
        kicker.dataset.cmsPath = 'aboutTeaser.kicker';
        kicker.dataset.cmsType = 'text';
      }
      if (title && about.title) {
        title.innerHTML = `${esc(about.title)} <span class="accent" data-cms-path="aboutTeaser.titleAccent" data-cms-type="text">${esc(about.titleAccent || '')}</span>`;
        title.dataset.cmsPath = 'aboutTeaser.title';
        title.dataset.cmsType = 'text';
      }
      if (text && about.body) {
        text.textContent = about.body;
        text.dataset.cmsPath = 'aboutTeaser.body';
        text.dataset.cmsType = 'text';
      }
      if (mainImg && about.images?.main) {
        mainImg.src = about.images.main;
        mainImg.dataset.cmsPath = 'aboutTeaser.images.main';
        mainImg.dataset.cmsType = 'image';
      }
      if (accentImg && about.images?.accent) {
        accentImg.src = about.images.accent;
        accentImg.dataset.cmsPath = 'aboutTeaser.images.accent';
        accentImg.dataset.cmsType = 'image';
      }
      if (statsRow && about.stats?.length) {
        statsRow.innerHTML = about.stats.map((s, i) => `
          <div class="stat-item">
            <h3 data-cms-path="aboutTeaser.stats.${i}.value" data-cms-type="text">${esc(s.value)}</h3>
            <p data-cms-path="aboutTeaser.stats.${i}.label" data-cms-type="text">${esc(s.label)}</p>
          </div>`).join('');
      }
      if (cta && about.ctaText) {
        cta.href = about.ctaLink || 'contact.html';
        cta.dataset.cmsPath = 'aboutTeaser.ctaText';
        cta.dataset.cmsType = 'text';
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