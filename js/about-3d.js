/* About Us — Disney-inspired 3D scroll & storybook animations */
let aboutIsMobile = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('about-page')) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);
  aboutIsMobile = window.matchMedia('(max-width: 991px)').matches;

  initAboutStars();
  initAboutHero();
  initAboutBook();
  initAboutScrolls();
  initAboutFrames();
  initAboutValues();
  initAboutConstellation();
  initAboutChapters();
  initAboutMouseParallax();
});

function initAboutStars() {
  const container = document.querySelector('.about-stars');
  if (!container) return;

  const count = aboutIsMobile ? 24 : 48;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('span');
    star.className = 'about-star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.width = `${2 + Math.random() * 3}px`;
    star.style.height = star.style.width;
    container.appendChild(star);

    gsap.to(star, {
      opacity: 0.3 + Math.random() * 0.7,
      duration: 1.5 + Math.random() * 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: Math.random() * 3,
    });

    if (!aboutIsMobile) {
      gsap.to(star, {
        y: -30 - Math.random() * 40,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5 + Math.random() * 0.5,
        },
      });
    }
  }
}

function initAboutHero() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.about-kicker', { y: 30, opacity: 0, duration: 0.9 })
    .from('.about-hero-title', { y: 50, opacity: 0, duration: 1.1 }, '-=0.5')
    .from('.about-hero-lead', { y: 30, opacity: 0, duration: 0.9 }, '-=0.6')
    .from('.about-scroll-hint', { opacity: 0, duration: 0.7 }, '-=0.4')
    .from('.about-book', { scale: 0.5, opacity: 0, rotateY: -50, duration: 1.5, ease: 'back.out(1.2)' }, '-=1');
}

function initAboutBook() {
  const book = document.querySelector('.about-book');
  if (!book) return;

  gsap.set('.about-book-page img, .about-frame img, .about-image img', {
    opacity: 1,
    visibility: 'visible',
  });

  gsap.to('.about-book-cover', {
    rotateY: -60,
    opacity: 0.15,
    duration: 2.2,
    delay: 1.2,
    ease: 'power2.inOut',
    transformOrigin: 'left center',
  });

  gsap.to('.about-book-sparkle', {
    y: -8,
    opacity: 0.6,
    duration: 2 + Math.random(),
    yoyo: true,
    repeat: -1,
    stagger: 0.3,
    ease: 'sine.inOut',
  });

  gsap.to(book, {
    y: -12,
    duration: 5,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
  });

  gsap.utils.toArray('.about-book-page').forEach((page, i) => {
    gsap.to(page, {
      rotateY: `-=${4 + i * 2}`,
      duration: 3 + i * 0.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: i * 0.2,
    });
  });

  if (!aboutIsMobile) {
    ScrollTrigger.create({
      trigger: '.about-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        gsap.set(book, {
          rotateY: -18 + p * 24,
          scale: 1 - p * 0.06,
        });
      },
    });
  }
}

function initAboutScrolls() {
  gsap.utils.toArray('.about-scroll').forEach((scroll) => {
    gsap.set(scroll, {
      scaleY: 0.08,
      rotateX: 25,
      opacity: 0.3,
      transformOrigin: 'top center',
      transformPerspective: 1000,
    });

    if (aboutIsMobile) {
      gsap.to(scroll, {
        scaleY: 1,
        rotateX: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: scroll,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      });
    } else {
      gsap.to(scroll, {
        scaleY: 1,
        rotateX: 0,
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: scroll.parentElement,
          start: 'top 80%',
          end: 'top 35%',
          scrub: 0.8,
        },
      });
    }

    const inner = scroll.querySelector('.about-scroll-inner');
    if (inner) {
      gsap.from(inner.children, {
        y: 30,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: scroll,
          start: 'top 70%',
          toggleActions: 'play none none none',
        },
      });
    }
  });
}

function initAboutFrames() {
  const frames = gsap.utils.toArray('.about-frame');
  if (!frames.length) return;

  frames.forEach((frame, i) => {
    const depth = (i % 2 === 0 ? 1 : -1) * (70 + i * 45);
    const rotY = (i - 1.5) * 14;

    gsap.set(frame, {
      z: -220,
      rotateY: rotY,
      opacity: 1,
      scale: 0.85,
    });

    if (aboutIsMobile) {
      gsap.to(frame, {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: frame,
          start: 'top 92%',
          toggleActions: 'play none none none',
        },
      });
    } else {
      gsap.to(frame, {
        z: depth,
        rotateY: rotY * 0.45,
        opacity: 1,
        scale: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.about-frames-scene',
          start: 'top 75%',
          end: 'center center',
          scrub: 0.6,
        },
      });
    }
  });
}

function initAboutValues() {
  gsap.utils.toArray('.about-value').forEach((card, i) => {
    gsap.from(card, {
      y: 80,
      z: -100,
      rotateX: 15,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
      delay: i * 0.12,
    });

    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        z: 40,
        rotateX: -8,
        rotateY: 6,
        scale: 1.04,
        duration: 0.5,
        ease: 'power2.out',
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        z: 0,
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
      });
    });
  });
}

function initAboutConstellation() {
  const orbs = gsap.utils.toArray('.about-stat-orb');
  if (!orbs.length) return;

  const radius = window.innerWidth < 992 ? 120 : 250;
  const state = { rotation: 0 };

  function placeOrbs(deg) {
    orbs.forEach((orb, i) => {
      const angle = ((i / orbs.length) * 360 + deg) * (Math.PI / 180);
      gsap.set(orb, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: Math.sin(angle) * 60,
        rotateY: Math.cos(angle) * 18,
      });
    });
  }

  placeOrbs(0);

  gsap.to(state, {
    rotation: 360,
    duration: 35,
    ease: 'none',
    repeat: -1,
    onUpdate: () => placeOrbs(state.rotation),
  });

  gsap.from('.about-constellation-center', {
    scale: 0.4,
    opacity: 0,
    duration: 1.2,
    ease: 'back.out(1.5)',
    scrollTrigger: {
      trigger: '.about-stats-section',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });

  orbs.forEach((orb) => {
    const numEl = orb.querySelector('[data-count]');
    if (!numEl) return;

    const target = parseInt(numEl.dataset.count, 10);
    const suffix = numEl.dataset.suffix || '';
    const counter = { val: 0 };

    gsap.to(counter, {
      val: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: orb,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      onUpdate: () => {
        numEl.textContent = Math.round(counter.val) + suffix;
      },
    });
  });
}

function initAboutChapters() {
  gsap.utils.toArray('.about-chapter-head').forEach((head) => {
    gsap.from(head.children, {
      y: 60,
      opacity: 0,
      stagger: 0.15,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: head,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  gsap.from('.about-manifesto blockquote', {
    y: 50,
    opacity: 0,
    rotateX: 12,
    transformPerspective: 1000,
    duration: 1.4,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.about-manifesto',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });

  gsap.from('.about-cta-card', {
    y: 80,
    z: -80,
    rotateX: 12,
    opacity: 0,
    transformPerspective: 1200,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.about-cta',
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
}

function initAboutMouseParallax() {
  const hero = document.querySelector('.about-hero');
  const book = document.querySelector('.about-book');
  const copy = document.querySelector('.about-hero-copy');
  if (!hero || aboutIsMobile) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    gsap.to(book, {
      rotateY: -18 + x * 20,
      rotateX: 12 - y * 14,
      duration: 0.8,
      ease: 'power2.out',
    });

    gsap.to(copy, {
      x: x * -20,
      y: y * -10,
      duration: 0.8,
      ease: 'power2.out',
    });
  });

  hero.addEventListener('mouseleave', () => {
    gsap.to(book, { rotateY: -18, rotateX: 12, duration: 1, ease: 'power2.out' });
    gsap.to(copy, { x: 0, y: 0, duration: 1, ease: 'power2.out' });
  });
}