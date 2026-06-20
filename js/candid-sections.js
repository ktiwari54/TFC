/* CandidShutters-inspired interactions */
document.addEventListener('DOMContentLoaded', () => {
  initCsTabs();
  initCsGalleryDrag();
  initCsStatCounters();
});

function initCsTabs() {
  const nav = document.getElementById('csTabNav');
  if (!nav) return;

  const btns = nav.querySelectorAll('.cs-tab-btn');
  const panels = document.querySelectorAll('.cs-tab-panel');

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.csTab;
      btns.forEach((b) => b.classList.toggle('active', b === btn));
      panels.forEach((p) => p.classList.toggle('active', p.id === id));
    });
  });
}

function initCsGalleryDrag() {
  document.querySelectorAll('.cs-gallery-track').forEach((row) => {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let rafId = 0;
    let pendingX = 0;

    row.addEventListener('mousedown', (e) => {
      isDown = true;
      row.classList.add('is-dragging');
      startX = e.pageX - row.offsetLeft;
      scrollLeft = row.scrollLeft;
    });

    ['mouseleave', 'mouseup'].forEach((ev) => {
      row.addEventListener(ev, () => {
        isDown = false;
        row.classList.remove('is-dragging');
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      });
    });

    row.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      pendingX = e.pageX - row.offsetLeft;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        row.scrollLeft = scrollLeft - (pendingX - startX) * 1.3;
        rafId = 0;
      });
    }, { passive: false });
  });
}

function initCsStatCounters() {
  const nums = document.querySelectorAll('.cs-stat-num[data-count]');
  if (!nums.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      let current = 0;
      const step = Math.ceil(target / 60);

      const tick = () => {
        current += step;
        if (current >= target) {
          el.textContent = `${prefix}${target}${suffix}`;
          observer.unobserve(el);
          return;
        }
        el.textContent = `${prefix}${current}${suffix}`;
        requestAnimationFrame(tick);
      };
      tick();
    });
  }, { threshold: 0.4 });

  nums.forEach((n) => observer.observe(n));
}

window.TFC_initStatCounters = initCsStatCounters;
document.addEventListener('tfc:homepage-applied', initCsStatCounters);