/* Home — Disney-inspired 3D scroll animations */
let homeIsMobile = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('home-page')) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ limitCallbacks: true });
  homeIsMobile = window.matchMedia('(max-width: 991px)').matches;

  initHomeStars();
  initHomeSectionDreamFlow();
  initHomeHero();
  initHomeScrolls();
  initChapterOneScroll();
  initChapterTwoScroll();
  initHomeGallery();
  initHomeStats();
  initHomeCards();
  initHomeChapters();
  initHomeHeroParallax();
  initHomeTabFlip();

  requestAnimationFrame(() => ScrollTrigger.refresh());
});

function initHomeTabFlip() {
  const nav = document.getElementById('csTabNav');
  if (!nav || !window.chapterTwoTypePanel) return;

  nav.querySelectorAll('.cs-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      requestAnimationFrame(() => {
        const panel = document.querySelector('#chapter-two .cs-tab-panel.active');
        if (panel) window.chapterTwoTypePanel(panel);
      });
    });
  });
}

function initHomeStars() {
  const container = document.querySelector('.home-stars');
  if (!container) return;

  const count = homeIsMobile ? 12 : 22;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('span');
    star.className = 'home-star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    const size = 2 + Math.random() * 2.5;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.animationDelay = `${Math.random() * 3}s`;
    star.style.animationDuration = `${2 + Math.random() * 2}s`;
    container.appendChild(star);
  }
}

function activeHeroSlide() {
  return document.querySelector('#heroSlider .hero-slide.active');
}

function initHomeSectionDreamFlow() {
  const sections = gsap.utils.toArray(
    '.home-experience > section, .home-page .main_content > section'
  ).filter((section) => (
    !section.classList.contains('shell-top-bar')
    && !section.classList.contains('section-hero-banner')
    && section.id !== 'hero'
  ));

  sections.forEach((section) => {
    gsap.fromTo(section,
      {
        y: homeIsMobile ? 24 : 40,
        opacity: 0.5,
      },
      {
        y: 0,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top 94%',
          end: 'top 52%',
          scrub: homeIsMobile ? 0.8 : 1.6,
        },
      }
    );
  });
}

function initHomeHero() {
  const hero = document.querySelector('.hero.wedding-hero');
  const slide = activeHeroSlide();
  if (!hero || !slide) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from(slide.querySelectorAll('.hero-eyebrow'), { y: 20, opacity: 0, duration: 0.8, stagger: 0.1 })
    .from(slide.querySelector('.hero-title'), { y: 40, opacity: 0, duration: 1 }, '-=0.4')
    .from(slide.querySelector('.hero-desc'), { y: 25, opacity: 0, duration: 0.8 }, '-=0.5')
    .from(slide.querySelector('.hero-actions'), { scale: 0.6, opacity: 0, duration: 0.7, ease: 'back.out(1.4)' }, '-=0.4')
    .from('.home-scroll-hint', { opacity: 0, duration: 0.6 }, '-=0.3');

  if (!homeIsMobile) {
    gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.4,
        onUpdate: (self) => {
          const content = activeHeroSlide()?.querySelector('.hero-content');
          if (!content) return;
          gsap.set(content, {
            y: self.progress * 36,
            opacity: 1 - self.progress * 0.45,
          });
        },
      },
    }).to(hero, {
      scale: 0.96,
      borderRadius: 24,
      ease: 'none',
    });
  }

  window.addEventListener('tfc:hero-slide', () => {
    const active = activeHeroSlide();
    if (!active) return;
    gsap.fromTo(active.querySelectorAll('.hero-eyebrow, .hero-title, .hero-desc, .hero-actions'),
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.08, ease: 'power2.out', overwrite: 'auto' }
    );
  });
}

function initHomeScrolls() {
  gsap.utils.toArray('.home-scroll:not(.home-scroll--chapter1):not(.home-scroll--chapter2)').forEach((scroll) => {
    gsap.set(scroll, {
      scaleY: 0.88,
      rotateX: 8,
      opacity: 0.55,
      transformOrigin: 'top center',
      transformPerspective: 900,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scroll,
        start: 'top 90%',
        end: 'top 48%',
        scrub: homeIsMobile ? 0.7 : 1.3,
      },
    });

    tl.to(scroll, {
      scaleY: 1,
      rotateX: 0,
      opacity: 1,
      ease: 'none',
    });

    const inner = scroll.querySelector('.home-scroll-inner');
    if (inner) {
      tl.from(inner.children, {
        y: 22,
        opacity: 0,
        stagger: 0.08,
        ease: 'none',
      }, 0.15);
    }
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
    scaleY: 0.82,
    rotateX: 10,
    opacity: 0.5,
    clipPath: 'inset(0% 0% 18% 0%)',
    transformOrigin: 'top center',
    transformPerspective: 900,
  });

  let unrolled = false;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scroll,
      start: 'top 92%',
      end: 'top 42%',
      scrub: homeIsMobile ? 0.85 : 1.5,
      onUpdate: (self) => {
        if (!unrolled && self.progress > 0.72) {
          unrolled = true;
          if (onUnrolled) onUnrolled();
        }
      },
    },
  });

  tl.to(scroll, {
    scaleY: 1,
    rotateX: 0,
    opacity: 1,
    clipPath: 'inset(0% 0% 0% 0%)',
    ease: 'none',
  });
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
  const scroll = document.querySelector('.home-scroll--chapter1');
  if (!scroll) return;

  const typeEls = scroll.querySelectorAll('.home-typewriter');
  const reveals = scroll.querySelectorAll('.home-scroll-reveal');

  initChapterScroll(scroll, {
    reveals: Array.from(reveals),
    prepareTypewriters: () => prepareTypewriters(scroll),
    onUnrolled: () => {
      runTypewriterSequence(typeEls, () => revealScrollExtras(Array.from(reveals)));
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
    runTypewriterSequence(typeEls, () => {
      if (gen === typeGen) return;
    }, () => gen === typeGen);
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

function runTypewriterSequence(elements, onComplete, isActive) {
  const list = Array.from(elements);
  let index = 0;

  function next() {
    if (isActive && !isActive()) return;
    if (index >= list.length) {
      if (onComplete) onComplete();
      return;
    }
    const el = list[index++];
    typewriterEl(el, next, isActive);
  }

  next();
}

function typewriterEl(el, onComplete, isActive) {
  const full = el.dataset.typewriter || '';
  const speed = parseInt(el.dataset.typeSpeed || '30', 10);
  const delay = parseInt(el.dataset.typeDelay || '0', 10);
  let i = 0;

  el.textContent = '';
  el.classList.add('is-typing');

  const tick = () => {
    if (isActive && !isActive()) {
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

function initHomeGallery() {
  const track = document.querySelector('.home-page .cs-gallery-track');
  if (!track) return;

  gsap.from(track.children, {
    x: 40,
    opacity: 0,
    stagger: 0.06,
    ease: 'none',
    scrollTrigger: {
      trigger: track,
      start: 'top 92%',
      end: 'top 55%',
      scrub: 1.1,
    },
  });
}

function initHomeStats() {
  const grid = document.querySelector('.home-page .cs-stats-grid');
  if (grid) {
    gsap.from(grid.children, {
      y: 36,
      opacity: 0,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: {
        trigger: grid,
        start: 'top 90%',
        end: 'top 58%',
        scrub: 1.2,
      },
    });
  }

  gsap.utils.toArray('.cs-stat-card').forEach((card) => {

    card.addEventListener('mouseenter', () => {
      if (homeIsMobile) return;
      gsap.to(card, {
        z: 35,
        rotateX: -6,
        rotateY: 5,
        scale: 1.03,
        duration: 0.45,
        ease: 'power2.out',
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        z: 0,
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
      });
    });
  });
}

function initHomeCards() {
  const cardSelectors = [
    '.home-page .cs-story-card',
    '.home-page .crew-card',
    '.home-page .workshop-card',
    '.home-page .cs-review-card',
    '.home-page .about-image',
    '.home-page .music-visual',
  ].join(',');

  ScrollTrigger.batch(cardSelectors, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      gsap.from(batch, {
        y: 32,
        opacity: 0,
        stagger: 0.07,
        duration: 0.9,
        ease: 'power2.out',
      });
    },
  });

  document.querySelectorAll(cardSelectors).forEach((card) => {
    card.querySelectorAll('img, video').forEach((media) => {
      gsap.set(media, { opacity: 1, visibility: 'visible' });
    });

    if (!card.matches('.about-image, .music-visual')) {
      card.addEventListener('mouseenter', () => {
        if (homeIsMobile) return;
        gsap.to(card, {
          y: -4,
          scale: 1.02,
          duration: 0.45,
          ease: 'power2.out',
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'power2.out',
        });
      });
    }
  });

  const trackList = document.querySelector('.home-page .track-list, .home-page .music-tracks');
  if (trackList) {
    gsap.from(trackList.querySelectorAll('.track-item'), {
      x: -24,
      opacity: 0,
      stagger: 0.08,
      ease: 'none',
      scrollTrigger: {
        trigger: trackList,
        start: 'top 92%',
        end: 'top 60%',
        scrub: 1,
      },
    });
  }
}

function initHomeChapters() {
  gsap.utils.toArray('.home-chapter-head, .home-section-head').forEach((head) => {
    gsap.from(head.children, {
      y: 24,
      opacity: 0,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: {
        trigger: head,
        start: 'top 90%',
        end: 'top 62%',
        scrub: 1.1,
      },
    });
  });

  const contactSection = document.querySelector('.home-page .contact-section');
  if (contactSection) {
    gsap.from(contactSection.querySelectorAll('.glow-card, .contact-form'), {
      y: 40,
      opacity: 0,
      stagger: 0.12,
      ease: 'none',
      scrollTrigger: {
        trigger: contactSection,
        start: 'top 88%',
        end: 'top 55%',
        scrub: 1.2,
      },
    });
  }
}

function initHomeHeroParallax() {
  const hero = document.querySelector('.hero.wedding-hero');
  if (!hero || homeIsMobile) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const content = activeHeroSlide()?.querySelector('.hero-content');

    if (content) {
      gsap.to(content, {
        x: x * -18,
        y: y * -10,
        duration: 0.7,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    gsap.to('.sufi-deco', {
      x: x * 25,
      y: y * 15,
      rotate: x * 8,
      duration: 0.8,
      ease: 'power2.out',
    });
  });

  hero.addEventListener('mouseleave', () => {
    const content = activeHeroSlide()?.querySelector('.hero-content');
    if (content) {
      gsap.to(content, { x: 0, y: 0, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
    }
    gsap.to('.sufi-deco', { x: 0, y: 0, rotate: 0, duration: 0.9, ease: 'power2.out' });
  });
}