/* Home — smooth scroll first, light reveals (no scrub) */
let homeIsMobile = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('home-page')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('home-scroll-lite', 'home-reveal-all');
    initHomeChapterStatic();
    return;
  }

  homeIsMobile = window.matchMedia('(max-width: 991px)').matches;
  document.body.classList.add('home-scroll-lite');

  initHomeStars();
  initHomeHero();
  initHomeChapterStatic();
  initHomeRevealObserver();
  initHomeGallery();
  initHomeDreamFilms();
  initHomeTabFlip();
  initHomeHoverCards();
  initHomeImages();
});

function initHomeTabFlip() {
  const nav = document.getElementById('csTabNav');
  if (!nav) return;

  nav.querySelectorAll('.cs-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = document.querySelector('#chapter-two .cs-tab-panel.active');
      if (!panel) return;
      panel.querySelectorAll('.home-typewriter').forEach((el) => {
        el.textContent = el.dataset.typewriter || '';
        el.classList.remove('is-typing');
      });
    });
  });
}

function initHomeStars() {
  const container = document.querySelector('.home-stars');
  if (!container) return;

  const count = homeIsMobile ? 6 : 10;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('span');
    star.className = 'home-star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    const size = 2 + Math.random() * 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.animationDelay = `${Math.random() * 3}s`;
    star.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    container.appendChild(star);
  }
}

function activeHeroSlide() {
  return document.querySelector('#heroSlider .hero-slide.active');
}

function initHomeHero() {
  const hero = document.querySelector('.hero.wedding-hero');
  const slide = activeHeroSlide();
  if (!hero || !slide || typeof gsap === 'undefined') return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from(slide.querySelectorAll('.hero-eyebrow'), { y: 20, opacity: 0, duration: 0.8, stagger: 0.1 })
    .from(slide.querySelector('.hero-title'), { y: 40, opacity: 0, duration: 1 }, '-=0.4')
    .from(slide.querySelector('.hero-desc'), { y: 25, opacity: 0, duration: 0.8 }, '-=0.5')
    .from(slide.querySelector('.hero-actions'), { scale: 0.6, opacity: 0, duration: 0.7, ease: 'back.out(1.4)' }, '-=0.4')
    .from('.home-scroll-hint', { opacity: 0, duration: 0.6 }, '-=0.3');

  window.addEventListener('tfc:hero-slide', () => {
    const active = activeHeroSlide();
    if (!active) return;
    gsap.fromTo(
      active.querySelectorAll('.hero-eyebrow, .hero-title, .hero-desc, .hero-actions'),
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.08, ease: 'power2.out', overwrite: 'auto' }
    );
  });
}

function initHomeChapterStatic() {
  document.querySelectorAll('.home-scroll--chapter1, .home-scroll--chapter2').forEach((scroll) => {
    scroll.querySelectorAll('.home-typewriter').forEach((el) => {
      el.textContent = el.dataset.typewriter || '';
      el.classList.remove('is-typing');
    });

    scroll.querySelectorAll('.home-scroll-reveal').forEach((el) => {
      el.classList.add('is-revealed');
    });

    const tabNav = scroll.querySelector('.cs-tab-nav');
    if (tabNav) tabNav.classList.add('is-revealed');
  });
}

function initHomeRevealObserver() {
  const targets = document.querySelectorAll(`
    .home-experience > section,
    .home-page .main_content > section,
    .home-chapter-head,
    .home-section-head,
    .home-page .cs-story-card,
    .home-page .crew-card,
    .home-page .workshop-card,
    .home-page .cs-review-card,
    .home-page .cs-stat-card,
    .home-page .track-item,
    .home-page .glow-card,
    .home-page .contact-form
  `);

  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -6% 0px',
  });

  targets.forEach((el) => {
    if (el.classList.contains('shell-top-bar')) return;
    if (el.classList.contains('section-hero-banner')) return;
    if (el.classList.contains('dream-films')) return;
    if (el.id === 'hero' || el.id === 'films') return;
    el.classList.add('home-reveal');
    observer.observe(el);
  });
}

function initHomeDreamFilms() {
  const section = document.getElementById('films');
  if (!section) return;
  section.classList.add('is-revealed', 'dream-films-lite');
}

function initHomeImages() {
  document.querySelectorAll('.home-page img').forEach((img) => {
    if (!img.getAttribute('loading')) img.loading = 'lazy';
    if (!img.getAttribute('decoding')) img.decoding = 'async';
    img.classList.add('tfc-img-stable');
  });
}

function initHomeGallery() {
  const gallery = document.querySelector('.home-page .cs-gallery');
  if (!gallery) return;
  gallery.classList.add('is-gallery-ready', 'home-reveal', 'is-revealed');
}

function initHomeHoverCards() {
  if (homeIsMobile || typeof gsap === 'undefined') return;

  document.querySelectorAll(
    '.home-page .cs-story-card, .home-page .crew-card, .home-page .workshop-card, .home-page .cs-stat-card'
  ).forEach((card) => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: -4, scale: 1.02, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { y: 0, scale: 1, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
    });
  });
}