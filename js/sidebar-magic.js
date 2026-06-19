/* Sidebar — Disney sparkle & starfield animations */
(function () {
  const SPARKLE_CHARS = ['✦', '✧', '·', '★'];

  function init() {
    const sidebar = document.getElementById('site-sidebar');
    if (!sidebar) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    initSidebarStars(sidebar, reduced);
    if (!reduced) initSidebarSparkles(sidebar);
    initSidebarHover(sidebar);
  }

  function initSidebarStars(sidebar, reduced) {
    let wrap = sidebar.querySelector('.sc-sidebar-stars');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'sc-sidebar-stars';
      wrap.setAttribute('aria-hidden', 'true');
      sidebar.insertBefore(wrap, sidebar.firstChild);
    }

    if (wrap.childElementCount) return;

    const count = reduced ? 8 : 28;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('span');
      star.className = 'sb-star';
      star.style.left = `${8 + Math.random() * 84}%`;
      star.style.top = `${5 + Math.random() * 90}%`;
      star.style.width = `${1 + Math.random() * 2.5}px`;
      star.style.height = star.style.width;
      star.style.animationDelay = `${Math.random() * 4}s`;
      star.style.animationDuration = `${2.5 + Math.random() * 3}s`;
      wrap.appendChild(star);
    }
  }

  function initSidebarSparkles(sidebar) {
    let layer = sidebar.querySelector('.sc-sidebar-sparkles');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'sc-sidebar-sparkles';
      layer.setAttribute('aria-hidden', 'true');
      const inner = sidebar.querySelector('.sc-sidebar-inner');
      if (inner) sidebar.insertBefore(layer, inner);
      else sidebar.appendChild(layer);
    }

    const targets = sidebar.querySelectorAll('.sc-nav-link, .sc-logo, .glow-cta');
    targets.forEach((el) => {
      el.addEventListener('mouseenter', (e) => burstSparkles(layer, sidebar, e, 7));
      el.addEventListener('mousemove', throttle((e) => {
        if (Math.random() > 0.82) burstSparkles(layer, sidebar, e, 2);
      }, 120));
    });
  }

  function initSidebarHover(sidebar) {
    sidebar.addEventListener('mouseenter', () => sidebar.classList.add('is-hovered'));
    sidebar.addEventListener('mouseleave', () => sidebar.classList.remove('is-hovered'));
  }

  function burstSparkles(layer, sidebar, event, count) {
    const rect = sidebar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      const useStar = Math.random() > 0.55;
      el.className = useStar ? 'sb-sparkle sb-sparkle--star' : 'sb-sparkle';
      el.style.left = `${x + (Math.random() - 0.5) * 24}px`;
      el.style.top = `${y + (Math.random() - 0.5) * 16}px`;

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const dist = 14 + Math.random() * 22;
      el.style.setProperty('--sx', `${Math.cos(angle) * dist}px`);
      el.style.setProperty('--sy', `${Math.sin(angle) * dist}px`);

      if (useStar) el.textContent = SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)];

      layer.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }
  }

  function throttle(fn, ms) {
    let t = 0;
    return (...args) => {
      const now = Date.now();
      if (now - t < ms) return;
      t = now;
      fn(...args);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();