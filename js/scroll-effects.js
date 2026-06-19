/* Lenis smooth scroll + GSAP ScrollTrigger (performance-tuned) */
(function () {
  const curveSvg = `<svg viewBox="0 0 30 30" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M26 -33C26 -35.7614 28.2386 -38 31 -38C33.7614 -38 36 -35.7614 36 -33V16.5C36 21.7467 40.2533 26 45.5 26C50.7467 26 55 30.2533 55 35.5V72.5C55 77.7467 50.7467 82 45.5 82C40.2533 82 36 86.2533 36 91.5V141C36 143.761 33.7614 146 31 146C28.2386 146 26 143.761 26 141V106C26 97.5992 26 93.3988 24.3651 90.1901C22.927 87.3677 20.6323 85.073 17.8099 83.6349C14.6012 82 10.4008 82 2 82H-136C-144.401 82 -148.601 82 -151.81 80.3651C-154.632 78.927 -156.927 76.6323 -158.365 73.8099C-160 70.6012 -160 66.4008 -160 58V50C-160 41.5992 -160 37.3988 -158.365 34.1901C-156.927 31.3677 -154.632 29.073 -151.81 27.6349C-148.601 26 -144.401 26 -136 26H2C10.4008 26 14.6012 26 17.8099 24.3651C20.6323 22.927 22.927 20.6323 24.3651 17.8099C26 14.6012 26 10.4008 26 2V-33Z"/></svg>`;
  window.TFC_CURVE_SVG = curveSvg;

  function scrollPrefs() {
    return {
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      mobile: window.matchMedia('(max-width: 991px)').matches,
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const prefs = scrollPrefs();
    const lenis = initLenis(prefs);

    initScrollReveal();

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      if (lenis) {
        bindLenisScrollTrigger(lenis);
      }

      initParallax(prefs);

      if (document.body.dataset.page === 'home' && !document.body.classList.contains('home-page') && !prefs.reduced) {
        initWeddingHallScroll(prefs);
      }

      requestAnimationFrame(() => ScrollTrigger.refresh());
    }

    window.addEventListener('load', () => {
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }, { once: true });

    initLottie();
    initMobileSidebar();
    initSidebar3d();
    initSidebarCta();
  });

  function initLenis(prefs) {
    if (typeof Lenis === 'undefined' || prefs.reduced || prefs.mobile) return null;

    const isHome = document.body.classList.contains('home-page');
    const lenis = new Lenis({
      lerp: isHome ? 0.14 : 0.1,
      wheelMultiplier: isHome ? 1 : 0.85,
      smoothWheel: true,
      smoothTouch: false,
      touchMultiplier: 1,
    });

    window.TFC_LENIS = lenis;
    document.documentElement.classList.add('lenis', 'lenis-smooth');
    document.body.classList.add('lenis', 'lenis-smooth');

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -20, duration: 1.2 });
      });
    });

    return lenis;
  }

  function bindLenisScrollTrigger(lenis) {
    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length) {
          lenis.scrollTo(value, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    ScrollTrigger.addEventListener('refresh', () => lenis.resize());
  }

  function initScrollReveal() {
    const els = document.querySelectorAll('.tagline-text, .lottie-divider');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    els.forEach((el) => observer.observe(el));
  }

  function initParallax(prefs) {
    if (prefs.reduced) return;

    const isHome = document.body.classList.contains('home-page');
    const isFilmsListing = !!document.querySelector('.dream-films-page');

    gsap.utils.toArray('.parallax-layer').forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed || '0.3');
      gsap.to(layer, {
        y: () => speed * (prefs.mobile ? 50 : 100),
        ease: 'none',
        scrollTrigger: {
          trigger: layer.closest('.parallax-wrap') || layer,
          start: 'top bottom',
          end: 'bottom top',
          scrub: prefs.mobile ? 0.4 : 0.8,
        },
      });
    });

    if (!isHome) {
      const batchGrids = [
        '.crew-grid',
        '.workshop-grid',
        '.cs-stories-grid',
        '.blog-grid',
        '.search-results',
      ];

      batchGrids.forEach((selector) => {
        document.querySelectorAll(selector).forEach((grid) => {
          if (!grid.children.length) return;
          gsap.from(grid.children, {
            y: 40,
            opacity: 0,
            duration: 0.65,
            stagger: 0.04,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: grid,
              start: 'top 92%',
              toggleActions: 'play none none none',
            },
          });
        });
      });
    }

    if (!isFilmsListing && !isHome) {
      document.querySelectorAll('.cs-review-card').forEach((card, i) => {
        if (i > 8) return;
        gsap.from(card, {
          y: 30,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 94%',
            toggleActions: 'play none none none',
          },
        });
      });

      document.querySelectorAll('.cs-stat-card').forEach((card) => {
        gsap.from(card, {
          y: 30,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 94%',
            toggleActions: 'play none none none',
          },
        });
      });
    }

    const gallery = document.querySelector('.cs-gallery-track');
    if (!isHome && gallery && gallery.children.length) {
      gsap.from(gallery.children, {
        x: 30,
        opacity: 0,
        duration: 0.55,
        stagger: 0.03,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: gallery,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      });
    }

    const csIntro = document.querySelector('.cs-intro-title');
    if (csIntro) {
      gsap.from(csIntro, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: csIntro,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      });
    }
  }

  function initWeddingHallScroll(prefs) {
    const main = document.querySelector('.main_content');
    if (!main) return;

    main.classList.add('wedding-journey');

    const hero = document.getElementById('hero');
    if (hero && !prefs.mobile) {
      gsap.to(hero, {
        scale: 0.92,
        y: 40,
        borderRadius: '20px',
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });
    }

    const scenes = gsap.utils.toArray('.main_content > section, .main_content > hr');
    scenes.forEach((scene) => {
      if (scene.classList.contains('shell-top-bar') || scene.classList.contains('dream-films')) return;

      gsap.from(scene, {
        y: prefs.mobile ? 24 : 50,
        opacity: 0,
        duration: 0.55,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: scene,
          start: 'top 94%',
          toggleActions: 'play none none none',
        },
      });
    });

    gsap.utils.toArray('.section-heading').forEach((heading) => {
      gsap.from(heading, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: heading,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      });
    });
  }

  function initLottie() {
    if (typeof lottie === 'undefined') return;

    document.querySelectorAll('[data-lottie]').forEach((box) => {
      const src = box.dataset.lottie;
      if (!src) return;
      lottie.loadAnimation({
        container: box,
        renderer: 'svg',
        loop: box.dataset.lottieLoop !== 'false',
        autoplay: true,
        path: src,
      });
    });
  }

  function initMobileSidebar() {
    const btn = document.getElementById('scMenuBtn');
    const sidebar = document.getElementById('site-sidebar');
    if (!btn || !sidebar) return;

    btn.addEventListener('click', () => sidebar.classList.toggle('open'));
    sidebar.querySelectorAll('.sc-nav-link, .glow-cta').forEach((link) => {
      link.addEventListener('click', () => sidebar.classList.remove('open'));
    });
  }

  function initSidebarCta() {
    const cta = document.querySelector('.sc-sidebar-cta .glow-cta');
    if (!cta) return;

    const href = cta.getAttribute('href');
    if (!href) return;

    cta.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      window.location.assign(href);
    });
  }

  function initSidebar3d() {
    const sidebar = document.getElementById('site-sidebar');
    if (!sidebar || window.matchMedia('(max-width: 991px)').matches) return;

    const tiltTargets = sidebar.querySelectorAll('.sc-nav-link, .sc-logo');

    tiltTargets.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty('--tilt-x', `${y * -14}deg`);
        el.style.setProperty('--tilt-y', `${x * 14}deg`);
        el.classList.add('is-tilting');
      });

      el.addEventListener('mouseleave', () => {
        el.classList.remove('is-tilting');
        el.style.removeProperty('--tilt-x');
        el.style.removeProperty('--tilt-y');
      });
    });
  }
})();