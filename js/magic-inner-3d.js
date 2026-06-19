/* Shared 3D scroll animations for magical inner pages */
let magicIsMobile = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('magic-page')) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);
  magicIsMobile = window.matchMedia('(max-width: 991px)').matches;

  initMagicStars();
  initMagicHero();
  initMagicOrb();
  initMagicScrolls();
  initMagicCards();
  initMagicChapters();
  initMagicHeroParallax();
});

function initMagicStars() {
  const container = document.querySelector('.magic-stars');
  if (!container) return;

  const count = magicIsMobile ? 28 : 50;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('span');
    star.className = 'magic-star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    const size = 2 + Math.random() * 3;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    container.appendChild(star);

    gsap.to(star, {
      opacity: 0.3 + Math.random() * 0.7,
      duration: 1.5 + Math.random() * 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: Math.random() * 3,
    });

    if (!magicIsMobile) {
      gsap.to(star, {
        y: -25 - Math.random() * 35,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4 + Math.random() * 0.4,
        },
      });
    }
  }
}

function initMagicHero() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.magic-kicker', { y: 30, opacity: 0, duration: 0.9 })
    .from('.magic-hero-title', { y: 50, opacity: 0, duration: 1.1 }, '-=0.5')
    .from('.magic-hero-lead', { y: 30, opacity: 0, duration: 0.9 }, '-=0.6')
    .from('.magic-scroll-hint', { opacity: 0, duration: 0.7 }, '-=0.4')
    .from('.magic-orb, .magic-stage > *', { scale: 0.5, opacity: 0, rotateY: -40, duration: 1.4, ease: 'back.out(1.2)' }, '-=1');

  gsap.set('.magic-orb-core img, .crew-photo img, .blog-card img, .workshop-card img', {
    opacity: 1,
    visibility: 'visible',
  });
}

function initMagicOrb() {
  const orb = document.querySelector('.magic-orb');
  if (!orb) return;

  gsap.to('.magic-orb-ring', {
    rotateZ: 360,
    duration: 35,
    ease: 'none',
    repeat: -1,
    stagger: 0.35,
  });

  gsap.to(orb, {
    y: -10,
    duration: 5,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
  });

  gsap.to('.magic-sparkle', {
    y: -6,
    opacity: 0.7,
    duration: 2,
    yoyo: true,
    repeat: -1,
    stagger: 0.25,
    ease: 'sine.inOut',
  });

  if (!magicIsMobile) {
    ScrollTrigger.create({
      trigger: '.magic-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        gsap.set(orb, { rotateY: -15 + p * 20, scale: 1 - p * 0.06 });
      },
    });
  }
}

function initMagicScrolls() {
  gsap.utils.toArray('.magic-scroll').forEach((scroll) => {
    gsap.set(scroll, {
      scaleY: 0.08,
      rotateX: 22,
      opacity: 0.3,
      transformOrigin: 'top center',
      transformPerspective: 1000,
    });

    if (magicIsMobile) {
      gsap.to(scroll, {
        scaleY: 1,
        rotateX: 0,
        opacity: 1,
        duration: 1.1,
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
          trigger: scroll.parentElement || scroll,
          start: 'top 82%',
          end: 'top 38%',
          scrub: 0.75,
        },
      });
    }

    const inner = scroll.querySelector('.magic-scroll-inner');
    if (inner) {
      gsap.from(inner.children, {
        y: 28,
        opacity: 0,
        stagger: 0.1,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: scroll,
          start: 'top 72%',
          toggleActions: 'play none none none',
        },
      });
    }
  });
}

function initMagicCards() {
  const cards = gsap.utils.toArray('.crew-card, .workshop-card, .blog-card, .faq-item');
  cards.forEach((card, i) => {
    gsap.fromTo(card,
      { y: 60, z: -70, rotateX: 12, opacity: 0 },
      {
        y: 0,
        z: 0,
        rotateX: 0,
        opacity: 1,
        duration: 0.85,
        ease: 'power3.out',
        delay: (i % 4) * 0.08,
        immediateRender: false,
        scrollTrigger: {
          trigger: card,
          start: 'top 92%',
          toggleActions: 'play none none none',
        },
      }
    );

    card.querySelectorAll('img, video').forEach((media) => {
      gsap.set(media, { opacity: 1, visibility: 'visible' });
    });

    if (!card.classList.contains('faq-item')) {
      card.addEventListener('mouseenter', () => {
        if (magicIsMobile) return;
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
    }
  });

  const formEls = gsap.utils.toArray('.glow-card, .contact-form');
  formEls.forEach((el) => {
    gsap.from(el, {
      y: 50,
      z: -40,
      rotateX: 8,
      opacity: 0,
      transformPerspective: 1000,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    });
  });
}

function initMagicChapters() {
  gsap.utils.toArray('.magic-chapter-head').forEach((head) => {
    gsap.from(head.children, {
      y: 50,
      opacity: 0,
      stagger: 0.12,
      duration: 0.95,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: head,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  gsap.from('.magic-manifesto blockquote', {
    y: 40,
    opacity: 0,
    rotateX: 10,
    transformPerspective: 1000,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.magic-manifesto',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });

  gsap.from('.magic-cta-card', {
    y: 70,
    z: -60,
    rotateX: 10,
    opacity: 0,
    transformPerspective: 1200,
    duration: 1.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.magic-cta',
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
}

function initMagicHeroParallax() {
  const hero = document.querySelector('.magic-hero');
  const copy = document.querySelector('.magic-hero-copy');
  const orb = document.querySelector('.magic-orb');
  if (!hero || magicIsMobile) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    if (copy) {
      gsap.to(copy, { x: x * -18, y: y * -10, duration: 0.7, ease: 'power2.out' });
    }
    if (orb) {
      gsap.to(orb, { rotateY: -15 + x * 18, rotateX: 10 - y * 12, duration: 0.8, ease: 'power2.out' });
    }
  });

  hero.addEventListener('mouseleave', () => {
    if (copy) gsap.to(copy, { x: 0, y: 0, duration: 0.9, ease: 'power2.out' });
    if (orb) gsap.to(orb, { rotateY: -15, rotateX: 10, duration: 0.9, ease: 'power2.out' });
  });
}