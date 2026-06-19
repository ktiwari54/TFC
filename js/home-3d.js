/* Home — scroll unroll + typewriter chapters, light reveals elsewhere */
let homeIsMobile = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('home-page')) return;

  homeIsMobile = window.matchMedia('(max-width: 991px)').matches;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('home-scroll-lite', 'home-reveal-all');
    initHomeChapterStatic();
    initHomeImages();
    return;
  }

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    document.body.classList.add('home-scroll-lite', 'home-reveal-all');
    initHomeChapterStatic();
    initHomeImages();
    return;
  }

  document.body.classList.add('home-scroll-lite');

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ limitCallbacks: true });

  initHomeStars();
  initHomeHero();
  initChapterOneScroll();
  initChapterTwoScroll();
  initHomeGallery();
  initHomeDreamFilms();
  initHomeRevealObserver();
  initHomeHoverCards();
  initHomeTabFlip();
  initHomeImages();

  requestAnimationFrame(() => ScrollTrigger.refresh());
});

function initHomeTabFlip() {
  const nav = document.getElementById('csTabNav');
  if (!nav) return;

  nav.querySelectorAll('.cs-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      requestAnimationFrame(() => {
        const panel = document.querySelector('#chapter-two .cs-tab-panel.active');
        if (panel) window.chapterTwoTypePanel?.(panel);
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

function initChapterScroll(scroll, options = {}) {
  const {
    onUnrolled,
    reveals = [],
    prepareTypewriters,
  } = options;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    scroll.querySelectorAll('.home-typewriter').forEach((el) => {
      const text = el.dataset.typewriter;
      if (text) el.textContent = text;
    });
    reveals.forEach((el) => { el.style.opacity = '1'; });
    gsap.set(scroll, { scaleY: 1, rotateX: 0, opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' });
    if (onUnrolled) onUnrolled();
    return;
  }

  if (prepareTypewriters) prepareTypewriters();
  if (reveals.length) gsap.set(reveals, { opacity: 0, y: 14 });

  gsap.set(scroll, {
    scaleY: 0.04,
    rotateX: 26,
    opacity: 0.35,
    clipPath: 'inset(0% 0% 100% 0%)',
    transformOrigin: 'top center',
    transformPerspective: 1100,
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scroll,
      start: 'top 86%',
      toggleActions: 'play none none none',
    },
  });

  tl.to(scroll, {
    scaleY: 1,
    rotateX: 0,
    opacity: 1,
    clipPath: 'inset(0% 0% 0% 0%)',
    duration: 1.35,
    ease: 'power2.inOut',
  });

  tl.call(() => {
    if (onUnrolled) onUnrolled();
  }, null, '+=0.15');
}

function prepareTypewriters(root, clearAll = true) {
  const panels = root.querySelectorAll('.cs-tab-panel');
  const scope = panels.length ? panels : [root];

  scope.forEach((panel) => {
    const isActive = !panel.classList.contains('cs-tab-panel') || panel.classList.contains('active');
    panel.querySelectorAll('.home-typewriter').forEach((el) => {
      if (clearAll || isActive) {
        el.textContent = '';
        el.classList.remove('is-typing');
        el.setAttribute('aria-label', el.dataset.typewriter || '');
      }
    });
  });
}

function revealScrollExtras(reveals) {
  if (!reveals.length) return;
  gsap.to(reveals, {
    opacity: 1,
    y: 0,
    duration: 0.55,
    stagger: 0.12,
    ease: 'power2.out',
  });
}

function initChapterOneScroll() {
  const section = document.getElementById('discover');
  const scroll = section?.querySelector('.home-scroll--chapter1');
  if (!section || !scroll) return;

  const typeEls = scroll.querySelectorAll('.home-typewriter');
  const reveals = Array.from(scroll.querySelectorAll('.home-scroll-reveal'));

  initChapterScroll(scroll, {
    prepareTypewriters: () => {
      typeEls.forEach((el) => {
        el.textContent = '';
        el.classList.remove('is-typing');
        el.setAttribute('aria-label', el.dataset.typewriter || '');
      });
      if (reveals.length) gsap.set(reveals, { opacity: 0, y: 14 });
    },
    onUnrolled: () => {
      runTypewriterSequence(typeEls, () => revealScrollExtras(reveals));
    },
  });
}

function initChapterTwoScroll() {
  const section = document.getElementById('chapter-two');
  const scroll = section?.querySelector('.home-scroll--chapter2');
  if (!section || !scroll) return;

  const tabNav = scroll.querySelector('.cs-tab-nav');
  let scrollOpened = false;
  let typeGen = 0;

  function typePanel(panel) {
    if (!panel) return;
    typeGen += 1;
    const gen = typeGen;

    prepareTypewriters(panel, false);
    const typeEls = panel.querySelectorAll('.home-typewriter');
    runTypewriterSequence(typeEls, () => {}, () => gen === typeGen);
  }

  window.chapterTwoTypePanel = (panel) => {
    if (!scrollOpened) return;
    typePanel(panel);
  };

  initChapterScroll(scroll, {
    reveals: tabNav ? [tabNav] : [],
    prepareTypewriters: () => prepareTypewriters(scroll),
    onUnrolled: () => {
      scrollOpened = true;
      revealScrollExtras(tabNav ? [tabNav] : []);
      const active = section.querySelector('.cs-tab-panel.active');
      if (active) typePanel(active);
    },
  });
}

function runTypewriterSequence(elements, onComplete, shouldContinue) {
  const list = Array.from(elements);
  let index = 0;
  const canContinue = shouldContinue || (() => true);

  function next() {
    if (!canContinue()) return;
    if (index >= list.length) {
      if (onComplete) onComplete();
      return;
    }
    const el = list[index++];
    typewriterEl(el, next, canContinue);
  }

  next();
}

function typewriterEl(el, onComplete, shouldContinue = () => true) {
  const full = el.dataset.typewriter || '';
  const speed = parseInt(el.dataset.typeSpeed || '30', 10);
  const delay = parseInt(el.dataset.typeDelay || '0', 10);
  let i = 0;

  el.textContent = '';
  el.classList.add('is-typing');

  const tick = () => {
    if (!shouldContinue()) {
      el.classList.remove('is-typing');
      return;
    }
    if (i > full.length) {
      el.classList.remove('is-typing');
      if (onComplete) onComplete();
      return;
    }
    el.textContent = full.slice(0, i);
    i += 1;
    setTimeout(tick, i === 1 ? delay : speed);
  };

  tick();
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
    if (el.id === 'hero' || el.id === 'films' || el.id === 'discover' || el.id === 'chapter-two') return;
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