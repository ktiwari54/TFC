/* Tales From the Culture — 3D scroll & lens animations */
let talesIsMobile = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('tales-page')) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);
  talesIsMobile = window.matchMedia('(max-width: 991px)').matches;
  initTalesHero();
  initTalesLens();
  initTalesFrames();
  initTalesCollageSparkles();
  initTalesPillars();
  initTalesOrbit();
  initTalesChapters();
  initTalesMouseParallax();
});

function initTalesHero() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.tales-kicker', { y: 30, opacity: 0, duration: 0.9 })
    .from('.tales-hero-title', { y: 50, opacity: 0, duration: 1.1 }, '-=0.5')
    .from('.tales-hero-lead', { y: 30, opacity: 0, duration: 0.9 }, '-=0.6')
    .from('.tales-scroll-hint', { opacity: 0, duration: 0.7 }, '-=0.4')
    .from('.tales-lens', { scale: 0.6, opacity: 0, rotateY: -40, duration: 1.4 }, '-=1');
}

function initTalesLens() {
  const lens = document.querySelector('.tales-lens');
  if (!lens) return;

  gsap.set('.tales-lens-glass img, .tales-frame img, .tales-orbit-item img', {
    opacity: 1,
    visibility: 'visible',
  });

  gsap.to('.tales-lens-ring', {
    rotateZ: 360,
    duration: 40,
    ease: 'none',
    repeat: -1,
    stagger: 0.4,
  });

  gsap.to('.tales-aperture-blade', {
    rotate: '+=30',
    duration: 3,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: -1,
    stagger: 0.08,
  });

  gsap.to(lens, {
    y: -14,
    duration: 5,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
  });

  if (!talesIsMobile) {
    ScrollTrigger.create({
      trigger: '.tales-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        gsap.set(lens, {
          rotateY: -8 + p * 16,
          scale: 1 - p * 0.08,
        });
      },
    });
  }
}

function initTalesFrames() {
  const frames = gsap.utils.toArray('.tales-frame');
  if (!frames.length) return;

  frames.forEach((frame, i) => {
    const inner = frame.querySelector('.tales-frame-inner') || frame;
    const rotZ = parseFloat(frame.dataset.rot || '0');

    frame.style.setProperty('--frame-rot', `${rotZ}deg`);
    gsap.set(frame, { opacity: 1 });
    gsap.set(inner, { opacity: 1, scale: 1 });

    gsap.from(inner, {
      y: 36,
      opacity: 0,
      scale: 0.94,
      duration: 0.65,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: frame,
        start: 'top 94%',
        toggleActions: 'play none none none',
      },
      delay: (i % 4) * 0.06,
    });
  });
}

const TALES_SPARKLE_CHARS = ['✦', '✧', '★', '✵', '·'];

function initTalesCollageSparkles() {
  const frames = document.querySelectorAll('.tales-frame');
  if (!frames.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  frames.forEach((frame) => {
    let burstLayer = frame.querySelector('.tales-frame-sparkle-burst');
    if (!burstLayer) {
      burstLayer = document.createElement('div');
      burstLayer.className = 'tales-frame-sparkle-burst';
      burstLayer.setAttribute('aria-hidden', 'true');
      frame.appendChild(burstLayer);
    }

    const burst = (e) => {
      frame.classList.add('is-sparkling');
      const rect = frame.getBoundingClientRect();
      const x = e ? e.clientX - rect.left : rect.width / 2;
      const y = e ? e.clientY - rect.top : rect.height / 2;
      const count = 10;

      for (let i = 0; i < count; i++) {
        const el = document.createElement('span');
        el.className = 'tales-frame-sparkle';
        el.textContent = TALES_SPARKLE_CHARS[Math.floor(Math.random() * TALES_SPARKLE_CHARS.length)];
        el.style.left = `${x + (Math.random() - 0.5) * 20}px`;
        el.style.top = `${y + (Math.random() - 0.5) * 16}px`;

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
        const dist = 18 + Math.random() * 28;
        el.style.setProperty('--sx', `${Math.cos(angle) * dist}px`);
        el.style.setProperty('--sy', `${Math.sin(angle) * dist}px`);

        burstLayer.appendChild(el);
        el.addEventListener('animationend', () => el.remove(), { once: true });
      }

      clearTimeout(frame._sparkleTimer);
      frame._sparkleTimer = setTimeout(() => frame.classList.remove('is-sparkling'), 750);
    };

    frame.addEventListener('mouseenter', burst);
    frame.addEventListener('touchstart', (e) => {
      burst(e.touches[0] || e);
    }, { passive: true });
  });
}

function initTalesPillars() {
  gsap.utils.toArray('.tales-pillar').forEach((pillar, i) => {
    gsap.from(pillar, {
      y: 80,
      z: -100,
      rotateX: 15,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: pillar,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
      delay: i * 0.12,
    });

    pillar.addEventListener('mouseenter', () => {
      gsap.to(pillar, {
        z: 40,
        rotateX: -8,
        rotateY: 6,
        scale: 1.04,
        duration: 0.5,
        ease: 'power2.out',
      });
    });

    pillar.addEventListener('mouseleave', () => {
      gsap.to(pillar, {
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

function initTalesOrbit() {
  const orbit = document.querySelector('.tales-orbit');
  const track = orbit?.querySelector('.tales-orbit-track');
  const optics = orbit?.querySelector('.tales-orbit-optics');
  const items = gsap.utils.toArray('.tales-orbit-item');
  if (!orbit || !track || !items.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ORBIT_DURATION = 48;

  function layoutOrbit() {
    const orbitSize = orbit.offsetWidth || 560;
    const radius = orbitSize * (talesIsMobile ? 0.3 : 0.34);
    const itemSize = talesIsMobile ? 64 : 88;
    const count = items.length;
    const step = 360 / count;

    items.forEach((item, i) => {
      const angle = step * i - 90;
      item.style.setProperty('--orbit-angle', `${angle}deg`);
      item.style.setProperty('--orbit-radius', `${radius}px`);
      item.style.width = `${itemSize}px`;
      item.style.height = `${itemSize}px`;
      item.style.margin = `${-itemSize / 2}px 0 0 ${-itemSize / 2}px`;
    });

    orbit.style.setProperty('--orbit-size', `${orbitSize}px`);
    orbit.style.setProperty('--orbit-duration', `${ORBIT_DURATION}s`);
  }

  layoutOrbit();
  window.addEventListener('resize', layoutOrbit, { passive: true });

  if (reduced) return;

  const tilt = talesIsMobile ? 0 : 16;

  gsap.set(track, {
    transformPerspective: 1200,
    rotateX: tilt,
    transformOrigin: '50% 50%',
  });

  gsap.to(track, {
    rotation: 360,
    duration: ORBIT_DURATION,
    ease: 'none',
    repeat: -1,
    transformOrigin: '50% 50%',
  });

  const outerRing = orbit.querySelector('.tales-orbit-ring--outer');
  const midRing = orbit.querySelector('.tales-orbit-ring--mid');
  const innerRing = orbit.querySelector('.tales-orbit-ring--inner');
  const lens = orbit.querySelector('.tales-orbit-lens');

  if (optics) {
    gsap.to(optics, {
      rotation: -360,
      duration: ORBIT_DURATION * 2,
      ease: 'none',
      repeat: -1,
      transformOrigin: '50% 50%',
    });
  }

  if (outerRing) {
    gsap.to(outerRing, {
      rotation: -360,
      duration: ORBIT_DURATION * 1.33,
      ease: 'none',
      repeat: -1,
      transformOrigin: '50% 50%',
    });
  }

  if (midRing) {
    gsap.to(midRing, {
      rotation: 360,
      duration: ORBIT_DURATION * 1.67,
      ease: 'none',
      repeat: -1,
      transformOrigin: '50% 50%',
    });
  }

  if (innerRing) {
    gsap.to(innerRing, {
      rotation: -360,
      duration: ORBIT_DURATION * 1.08,
      ease: 'none',
      repeat: -1,
      transformOrigin: '50% 50%',
    });
  }

  if (lens && !talesIsMobile) {
    gsap.to(lens, {
      scale: 1.06,
      duration: 4,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      transformOrigin: '50% 50%',
    });
  }

  if (!talesIsMobile) {
    gsap.to(track, {
      rotateX: tilt + 4,
      duration: 8,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      transformOrigin: '50% 50%',
    });
  }

  gsap.from('.tales-orbit-center', {
    scale: 0.5,
    opacity: 0,
    duration: 1.2,
    ease: 'back.out(1.4)',
    scrollTrigger: {
      trigger: '.tales-orbit-section',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });
}

function initTalesChapters() {
  gsap.utils.toArray('.tales-chapter-head').forEach((head) => {
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

  gsap.from('.tales-manifesto blockquote', {
    y: 50,
    opacity: 0,
    rotateX: 12,
    transformPerspective: 1000,
    duration: 1.4,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.tales-manifesto',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });

  gsap.from('.tales-cta-card', {
    y: 80,
    z: -80,
    rotateX: 12,
    opacity: 0,
    transformPerspective: 1200,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.tales-cta',
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
}

function initTalesMouseParallax() {
  const hero = document.querySelector('.tales-hero');
  const lens = document.querySelector('.tales-lens');
  const copy = document.querySelector('.tales-hero-copy');
  if (!hero || window.matchMedia('(max-width: 991px)').matches) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    gsap.to(lens, {
      rotateY: -12 + x * 18,
      rotateX: 8 - y * 12,
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
    gsap.to(lens, { rotateY: -12, rotateX: 8, duration: 1, ease: 'power2.out' });
    gsap.to(copy, { x: 0, y: 0, duration: 1, ease: 'power2.out' });
  });
}