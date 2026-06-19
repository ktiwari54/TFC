/* Magical image & video — visibility fixes + hover enchantment */
(function () {
  const THEMED = ['home-page', 'about-page', 'tales-page', 'magic-page'];

  const WRAP_SELECTORS = [
    '.crew-photo',
    '.workshop-card > img',
    '.blog-card > img',
    '.about-frame',
    '.tales-frame',
    '.about-book-page',
    '.magic-orb-core',
    '.about-image',
    '.music-visual',
    '.cs-gallery-item',
    '.cs-story-card',
    '.hero-media',
    '.tales-lens-glass',
    '.tales-orbit-item',
    '.about-stat-orb',
  ];

  document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    if (!THEMED.some((c) => body.classList.contains(c))) return;

    initMagicMedia();
    fixStuckMedia();

    window.addEventListener('load', () => {
      fixStuckMedia();
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      setTimeout(fixStuckMedia, 400);
    });
  });

  function initMagicMedia() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    WRAP_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => wrapElement(el));
    });

    document.querySelectorAll('.magic-media').forEach((wrap) => {
      const target = wrap.querySelector('img, video') || wrap;
      if (typeof gsap !== 'undefined') {
        gsap.set(target, { opacity: 1, visibility: 'visible' });
      } else {
        target.style.opacity = '1';
        target.style.visibility = 'visible';
      }

      wrap.addEventListener('mouseenter', () => onMediaEnter(wrap, reduced));
      wrap.addEventListener('mouseleave', () => onMediaLeave(wrap));

      wrap.addEventListener('touchstart', () => {
        wrap.classList.add('is-magic-hover');
        setTimeout(() => wrap.classList.remove('is-magic-hover'), 1200);
      }, { passive: true });
    });
  }

  function wrapElement(el) {
    if (el.classList.contains('magic-media')) return;
    if (el.closest('.magic-media')) return;
    if (el.closest('.home-page .cs-gallery')) return;

    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
      const wrapper = document.createElement('div');
      wrapper.className = 'magic-media';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
      el.classList.add('magic-media-target');
      addDecorations(wrapper);
      return;
    }

    el.classList.add('magic-media');
    addDecorations(el);

    const media = el.querySelector(':scope > img, :scope > video, :scope > .tales-frame-inner > img');
    if (media) media.classList.add('magic-media-target');
  }

  function addDecorations(wrap) {
    if (wrap.querySelector('.magic-media-border')) return;

    const border = document.createElement('span');
    border.className = 'magic-media-border';
    border.setAttribute('aria-hidden', 'true');

    const glow = document.createElement('span');
    glow.className = 'magic-media-glow';
    glow.setAttribute('aria-hidden', 'true');

    const shimmer = document.createElement('span');
    shimmer.className = 'magic-media-shimmer';
    shimmer.setAttribute('aria-hidden', 'true');

    const sp1 = document.createElement('span');
    sp1.className = 'magic-media-sparkle magic-media-sparkle--tl';
    sp1.textContent = '✦';
    sp1.setAttribute('aria-hidden', 'true');

    const sp2 = document.createElement('span');
    sp2.className = 'magic-media-sparkle magic-media-sparkle--br';
    sp2.textContent = '✧';
    sp2.setAttribute('aria-hidden', 'true');

    wrap.append(border, glow, shimmer, sp1, sp2);
  }

  function onMediaEnter(wrap, reduced) {
    wrap.classList.add('is-magic-hover');

    const img = wrap.querySelector('img, video');
    const shimmer = wrap.querySelector('.magic-media-shimmer');
    const video = wrap.querySelector('video');

    if (typeof gsap === 'undefined') return;

    if (img) {
      gsap.to(img, {
        scale: 1.07,
        duration: 0.65,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    if (shimmer && !reduced) {
      gsap.fromTo(shimmer,
        { x: '-120%' },
        { x: '120%', duration: 0.9, ease: 'power2.inOut' }
      );
    }

    if (video && video.paused) {
      video.play().catch(() => {});
    }
  }

  function onMediaLeave(wrap) {
    wrap.classList.remove('is-magic-hover');

    const img = wrap.querySelector('img, video');
    const video = wrap.querySelector('video');

    if (img && typeof gsap !== 'undefined') {
      gsap.to(img, {
        scale: 1,
        duration: 0.55,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    if (video && !wrap.closest('.hero-slide.active')) {
      video.pause();
    }
  }

  function fixStuckMedia() {
    const selectors = [
      'img',
      'video',
      '.crew-card',
      '.workshop-card',
      '.blog-card',
      '.about-frame',
      '.tales-frame',
      '.about-book-page',
      '.magic-orb-core',
      '.cs-gallery-item',
      '.cs-story-card',
      '.about-image',
      '.hero-media',
    ];

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const opacity = parseFloat(getComputedStyle(el).opacity);
        if (opacity < 0.15 && el.offsetParent !== null) {
          if (typeof gsap !== 'undefined') {
            gsap.set(el, { opacity: 1, visibility: 'visible' });
          } else {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
          }
        }
      });
    });

    document.querySelectorAll('.about-frame, .tales-frame').forEach((frame) => {
      if (typeof gsap !== 'undefined') {
        gsap.set(frame, { opacity: 1 });
      } else {
        frame.style.opacity = '1';
      }
    });
  }
})();