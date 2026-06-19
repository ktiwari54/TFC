/* Dream Films — Disney celebration dreamscape */
(function () {
  const COLORS = ['#ffd87a', '#c41e3a', '#f4c4d8', '#8b5cf6', '#fff', '#ff9ecd'];

  window.initDreamPageParticles = function (el) {
    initDreamParticles(el);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('.dream-films');
    if (!section) return;

    const isHome = document.body.classList.contains('home-page');
    if (!isHome) initDreamParticles(section);
    initMagicFilmTabs('#filmTabs');
    initDreamScrollBase(section);
    if (!isHome) initDreamCardTilt(section);
  });

  document.addEventListener('DOMContentLoaded', () => {
    initMagicFilmTabs('#filmsFilter');

    const filmsPage = document.querySelector('.dream-films-page');
    if (filmsPage) {
      initDreamParticles(filmsPage);
      initDreamScrollBase(filmsPage);
      initDreamCardTilt(filmsPage);
      document.body.classList.add('films-page-magic');

      window.addEventListener('dreamTabChange', () => celebrate(filmsPage));
    }
  });

  window.TFC_initDreamFilmsCarousel = function () {
    const section = document.querySelector('.dream-films');
    if (!section) return;
    setupHorizontalScroll(section);
    const panel = section.querySelector('.trailer-panel.active');
    if (panel) window.TFC_magicPanelEnter?.(panel);
  };

  /* ── Floating particle canvas ── */
  function initDreamParticles(section) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let canvas = section.querySelector('.dream-films-particles');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'dream-films-particles';
      section.prepend(canvas);
    }

    const isListing = section.classList.contains('dream-films-page');
    const maxParticles = isListing ? 30 : 50;
    let active = true;
    let w = 0;
    let h = 0;
    const ctx = canvas.getContext('2d');
    let particles = [];

    if (isListing) {
      canvas.classList.add('dream-films-particles--viewport');
    }

    const visibility = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
    }, { rootMargin: '80px' });
    visibility.observe(section);

    function resize() {
      if (isListing) {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
      } else {
        w = canvas.width = section.offsetWidth;
        h = canvas.height = section.offsetHeight;
      }
    }

    function spawn() {
      particles.push({
        x: Math.random() * w,
        y: h + 10,
        size: Math.random() * 2.5 + 0.8,
        speedY: Math.random() * 0.6 + 0.25,
        speedX: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!active || !w || !h) return;

      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.twinkle += 0.03;
        const alpha = p.opacity * (0.6 + Math.sin(p.twinkle) * 0.35);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      particles = particles.filter((p) => p.y > -20);
      if (particles.length < maxParticles) spawn();
    }

    resize();
    for (let i = 0; i < maxParticles * 0.6; i++) spawn();
    draw();
    window.addEventListener('resize', resize, { passive: true });
  }

  let horizontalST = null;

  function initDreamScrollBase(section) {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const isListing = section.classList.contains('dream-films-page');
    const header = section.querySelector('.dream-films-header');

    const isHome = document.body.classList.contains('home-page');

    if (isHome) {
      section.querySelector('.dream-scroll-progress')?.remove();
    }

    if (!isListing && !isHome && !section.querySelector('.dream-scroll-progress')) {
      const bar = document.createElement('div');
      bar.className = 'dream-scroll-progress';
      section.appendChild(bar);
    }

    if (header) {
      gsap.from(header.children.length ? header.children : header, {
        y: 50,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    }

    if (isListing || isHome) return;

    const aurora = section.querySelector('.dream-films-aurora');
    if (aurora && !window.matchMedia('(max-width: 991px)').matches) {
      gsap.to(aurora, {
        scale: 1.1,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.5,
        },
      });
    }
  }

  function setupHorizontalScroll(section) {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const stage = section.querySelector('.dream-films-stage');
    const panel = section.querySelector('.trailer-panel.active');
    const track = panel?.querySelector('.dream-carousel-track, .trailer-list-wrapper');
    const progressBar = section.querySelector('.dream-scroll-progress');
    const isHome = document.body.classList.contains('home-page');

    if (horizontalST) {
      horizontalST.kill();
      horizontalST = null;
    }

    if (!stage || !track) return;

    gsap.set(track, { x: 0, clearProps: 'transform' });

    /* Homepage: no vertical scroll-hijack — it fights Lenis and the tight layout.
       Carousel still works via drag / touch on the track. */
    if (isHome) {
      delete track.dataset.dreamScroll;
      document.querySelectorAll('.pin-spacer').forEach((spacer) => {
        if (spacer.querySelector('.dream-films-stage, .dream-films')) spacer.remove();
      });
      ScrollTrigger.refresh();
      return;
    }

    track.dataset.dreamScroll = '1';

    const getScroll = () => Math.max(track.scrollWidth - window.innerWidth + 200, 400);
    const useLenis = !!window.TFC_LENIS;

    horizontalST = gsap.to(track, {
      x: () => -getScroll(),
      ease: 'none',
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => `+=${getScroll() + window.innerHeight * 0.4}`,
        pin: stage,
        pinSpacing: true,
        pinType: useLenis ? 'transform' : 'fixed',
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (progressBar) progressBar.style.width = `${self.progress * 100}%`;
        },
      },
    }).scrollTrigger;

    ScrollTrigger.refresh();
  }

  window.TFC_dreamRefreshScroll = function () {
    const section = document.querySelector('.dream-films');
    if (section) setupHorizontalScroll(section);
  };

  /* ── Magic tabs ── */
  function initMagicFilmTabs(selector) {
    const tabsEl = document.querySelector(selector);
    if (!tabsEl || tabsEl.dataset.magicReady) return;
    tabsEl.dataset.magicReady = '1';

    const wrap = document.createElement('div');
    wrap.className = 'film-tabs-magic';
    tabsEl.parentNode.insertBefore(wrap, tabsEl);
    wrap.appendChild(tabsEl);

    const indicator = document.createElement('div');
    indicator.className = 'film-tab-indicator';
    wrap.appendChild(indicator);

    tabsEl.querySelectorAll('.film-tab').forEach((tab) => {
      if (!tab.querySelector('.tab-sparkle')) {
        const s = document.createElement('span');
        s.className = 'tab-sparkle';
        s.textContent = '✦';
        tab.prepend(s);
      }
    });

    function moveIndicator(tab) {
      if (!tab) return;
      const wr = wrap.getBoundingClientRect();
      const tr = tab.getBoundingClientRect();
      indicator.style.width = `${tr.width}px`;
      indicator.style.height = `${tr.height}px`;
      indicator.style.transform = `translate(${tr.left - wr.left}px, ${tr.top - wr.top}px)`;
    }

    const active = tabsEl.querySelector('.film-tab.active') || tabsEl.querySelector('.film-tab');
    requestAnimationFrame(() => moveIndicator(active));

    tabsEl.querySelectorAll('.film-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        tab.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
        requestAnimationFrame(() => {
          moveIndicator(tab);
          burstSparkles(tab);
          window.dispatchEvent(new CustomEvent('dreamTabChange'));
        });
      });
    });

    const refreshIndicator = () => moveIndicator(tabsEl.querySelector('.film-tab.active'));
    window.addEventListener('resize', refreshIndicator);
    tabsEl.addEventListener('scroll', refreshIndicator, { passive: true });
  }

  function burstSparkles(el) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.className = 'film-magic-sparkle';
      s.style.cssText = `left:${cx}px;top:${cy}px;position:fixed;background:${COLORS[i % COLORS.length]}`;
      document.body.appendChild(s);
      const angle = (i / 16) * Math.PI * 2;
      const dist = 40 + Math.random() * 40;
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(s, { scale: 0, opacity: 1 }, { scale: 1.5, duration: 0.15 });
        gsap.to(s, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          opacity: 0,
          scale: 0,
          duration: 0.8 + Math.random() * 0.4,
          ease: 'power2.out',
          onComplete: () => s.remove(),
        });
      } else s.remove();
    }
  }

  function celebrate(section) {
    if (typeof gsap === 'undefined') return;
    const rect = section.getBoundingClientRect();
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'dream-confetti';
      c.style.cssText = `
        left:${rect.left + Math.random() * rect.width}px;
        top:${rect.top + rect.height * 0.4}px;
        background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
        position:fixed;
      `;
      document.body.appendChild(c);
      gsap.to(c, {
        y: -200 - Math.random() * 300,
        x: (Math.random() - 0.5) * 200,
        rotation: Math.random() * 720,
        opacity: 0,
        duration: 2 + Math.random(),
        ease: 'power1.out',
        onComplete: () => c.remove(),
      });
    }
  }

  /* ── Card 3D tilt ── */
  function initDreamCardTilt(section) {
    section.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.trailer-item, .dream-card');
      if (!card) return;
      const inner = card.querySelector('.trailer-item-wrap, .dream-card-inner, .dream-film-card-inner');
      if (!inner) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      inner.style.transform = `translateY(-16px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) scale(1.04)`;
    });

    section.addEventListener('mouseleave', (e) => {
      if (!e.target.closest) return;
      section.querySelectorAll('.trailer-item-wrap, .dream-film-card-inner').forEach((inner) => {
        if (!inner.classList.contains('is-playing-preview')) {
          inner.style.transform = '';
        }
      });
    });
  }

  /* ── Panel transitions (called from trailer-section) ── */
  window.TFC_magicPanelEnter = function magicPanelEnter(panel) {
    if (!panel || typeof gsap === 'undefined') return;

    const items = panel.querySelectorAll('.trailer-item, .film-card');
    gsap.fromTo(items, {
      y: 120,
      opacity: 0,
      scale: 0.75,
      rotateY: -25,
      z: -200,
    }, {
      y: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
      z: 0,
      duration: 1,
      stagger: 0.12,
      ease: 'back.out(1.4)',
    });

    setTimeout(() => window.TFC_dreamRefreshScroll?.(), 100);
  };

  window.TFC_magicPanelExit = function magicPanelExit(panel) {
    if (!panel || typeof gsap === 'undefined') return Promise.resolve();
    return gsap.to(panel.querySelectorAll('.trailer-item'), {
      y: -60,
      opacity: 0,
      scale: 0.85,
      rotateY: 20,
      duration: 0.45,
      stagger: 0.05,
      ease: 'power2.in',
    });
  };
})();