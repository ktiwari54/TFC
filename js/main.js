document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  if (document.getElementById('heroSlider')) initHeroSlider();
  if (document.getElementById('filmTabs') && !document.getElementById('trailerMount')) initFilmTabs();
  if (!document.getElementById('trailerMount')) initFilmHoverPreview();
  if (document.querySelector('.crew-card')) initCrewBtsPreview();
  initVideoModal();
  if (document.getElementById('testimonialSlider')) initTestimonials();
  if (document.getElementById('taglineText')) initTaglineAnimation();
  if (document.getElementById('contactForm')) initContactForm();
  if (document.querySelector('.track-item')) initTrackList();
  if (document.getElementById('faqList')) initFaq();
  if (document.querySelector('section[id]') && document.body.dataset.page === 'home') initSmoothNav();
});

function initNavbar() {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }
}

function initHeroSlider() {
  const slider = document.getElementById('heroSlider');
  if (!slider) return;

  const slides = slider.querySelectorAll('.hero-slide');
  const dotsContainer = document.getElementById('heroDots');
  const prevBtn = document.getElementById('heroPrev');
  const nextBtn = document.getElementById('heroNext');
  if (!slides.length || !dotsContainer) return;

  let current = 0;
  let interval;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.hero-dot');

  function resetSlideMotion(slide) {
    const content = slide.querySelector('.hero-content');
    if (!content) return;
    if (typeof gsap !== 'undefined') {
      gsap.set(content, { clearProps: 'x,y,opacity,transform' });
    } else {
      content.style.transform = '';
      content.style.opacity = '';
    }
  }

  function syncHeroVideos() {
    slides.forEach((slide, i) => {
      slide.querySelectorAll('.homepage-banner-video').forEach((vid) => {
        if (i === current) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
          vid.currentTime = 0;
        }
      });
    });
  }

  function goTo(index) {
    slides[current].classList.remove('active');
    resetSlideMotion(slides[current]);
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    resetSlideMotion(slides[current]);
    syncHeroVideos();
    resetInterval();
    window.dispatchEvent(new CustomEvent('tfc:hero-slide', { detail: { index: current } }));
  }

  syncHeroVideos();

  function resetInterval() {
    clearInterval(interval);
    interval = setInterval(() => goTo(current + 1), 10000);
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));
  resetInterval();
}

function initFilmHoverPreview(root = document) {
  const previews = window.TFC_FILM_PREVIEWS || {};
  let activeCard = null;

  function hoverShell(card) {
    return card.querySelector('.trailer-item-wrap, .dream-film-card-inner') || card;
  }

  function stopPreview(card) {
    if (!card) return;
    card.classList.remove('is-playing-preview');
    hoverShell(card).classList.remove('is-playing-preview');
    const video = card.querySelector('.film-card-preview');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }

  root.querySelectorAll('.film-card:not([data-preview-ready])').forEach((card) => {
    const name = card.querySelector('.film-name, .trailer-name')?.textContent?.trim();
    const url = card.dataset.preview?.trim() || previews[name];
    if (!url) return;
    card.dataset.previewReady = '1';

    let media = card.querySelector('.film-card-media');
    const img = card.querySelector('img');

    if (!media && img) {
      media = document.createElement('div');
      media.className = 'film-card-media';
      img.classList.add('film-card-poster');
      card.insertBefore(media, card.firstChild);
      media.appendChild(img);
    }

    if (!media) return;

    card.classList.add('has-preview');

    let enterTimer;
    let video = null;
    const shell = hoverShell(card);

    function ensureVideo() {
      if (video) return video;
      video = document.createElement('video');
      video.className = 'film-card-preview';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.preload = 'none';
      video.src = url;
      media.appendChild(video);
      return video;
    }

    function startPreview() {
      if (activeCard && activeCard !== card) stopPreview(activeCard);
      activeCard = card;
      card.classList.add('is-playing-preview');
      shell.classList.add('is-playing-preview');
      ensureVideo().play().catch(() => {});
    }

    card.addEventListener('mouseenter', () => {
      enterTimer = setTimeout(startPreview, 220);
    });

    card.addEventListener('mouseleave', () => {
      clearTimeout(enterTimer);
      if (activeCard === card) activeCard = null;
      stopPreview(card);
      shell.classList.remove('is-playing-preview');
    });

    card.addEventListener('focusin', () => card.dispatchEvent(new Event('mouseenter')));
    card.addEventListener('focusout', () => card.dispatchEvent(new Event('mouseleave')));
  });

  window.TFC_stopFilmPreviews = () => {
    if (activeCard) stopPreview(activeCard);
    activeCard = null;
  };
}

window.TFC_initFilmHoverPreview = initFilmHoverPreview;

function initCrewBtsPreview(root = document) {
  const btsMap = window.TFC_CREW_BTS || {};
  let activeCard = null;

  function stopBts(card) {
    if (!card) return;
    card.classList.remove('is-playing-bts');
    const video = card.querySelector('.crew-bts-preview');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }

  root.querySelectorAll('.crew-card:not([data-bts-ready])').forEach((card) => {
    const name = card.querySelector('.crew-name')?.textContent?.trim();
    const url = card.dataset.bts?.trim() || btsMap[name];
    if (!url) return;
    card.dataset.btsReady = '1';

    const photo = card.querySelector('.crew-photo');
    const img = card.querySelector('.crew-photo img');
    if (!photo || !img) return;

    img.classList.add('crew-photo-poster');

    const video = document.createElement('video');
    video.className = 'crew-bts-preview';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'metadata';
    video.src = url;
    photo.appendChild(video);

    if (!photo.querySelector('.crew-bts-label')) {
      const label = document.createElement('span');
      label.className = 'crew-bts-label';
      label.textContent = 'BTS';
      photo.appendChild(label);
    }

    card.classList.add('has-bts');

    let enterTimer;

    function startBts() {
      if (activeCard && activeCard !== card) stopBts(activeCard);
      activeCard = card;
      card.classList.add('is-playing-bts');
      video.play().catch(() => {});
    }

    card.addEventListener('mouseenter', () => {
      enterTimer = setTimeout(startBts, 120);
    });

    card.addEventListener('mouseleave', () => {
      clearTimeout(enterTimer);
      if (activeCard === card) activeCard = null;
      stopBts(card);
    });

    card.addEventListener('focusin', () => card.dispatchEvent(new Event('mouseenter')));
    card.addEventListener('focusout', () => card.dispatchEvent(new Event('mouseleave')));
  });

  window.TFC_stopCrewBts = () => {
    if (activeCard) stopBts(activeCard);
    activeCard = null;
  };
}

window.TFC_initCrewBtsPreview = initCrewBtsPreview;

function initFilmTabs() {
  const tabs = document.querySelectorAll('.film-tab');
  const panels = document.querySelectorAll('.film-panel');
  if (!tabs.length) return;

  let autoTabInterval;

  function activateTab(tab) {
    const target = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById(target);
    if (panel) panel.classList.add('active');
    window.TFC_stopFilmPreviews?.();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab);
      resetAutoTab();
    });
  });

  function autoTab() {
    const current = document.querySelector('.film-tab.active');
    const next = current?.nextElementSibling || tabs[0];
    if (next) activateTab(next);
  }

  function resetAutoTab() {
    clearInterval(autoTabInterval);
    autoTabInterval = setInterval(autoTab, 20000);
  }

  resetAutoTab();
}

function initVideoModal() {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('modalIframe');
  const video = document.getElementById('modalVideo');
  const closeBtn = document.getElementById('modalClose');
  if (!modal) return;

  document.querySelectorAll('.play-btn[data-video]').forEach(btn => {
    if (!btn.dataset.video?.trim()) btn.classList.add('no-video');
  });

  document.querySelectorAll('.film-card[data-video]').forEach(card => {
    if (!card.dataset.video?.trim()) card.classList.add('no-video');
  });

  function resolveVideoSource(value, type) {
    const src = value?.trim();
    if (!src) return null;

    if (type === 'file' || /\.(mp4|webm|ogg)(\?|$)/i.test(src)) {
      return { mode: 'file', src };
    }

    if (type === 'vimeo' || src.includes('vimeo.com')) {
      const id = src.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || src;
      return { mode: 'iframe', src: `https://player.vimeo.com/video/${id}?autoplay=1` };
    }

    if (type === 'youtube' || src.includes('youtube.com') || src.includes('youtu.be')) {
      const id = src.match(/(?:youtu\.be\/|v=)([\w-]+)/)?.[1] || src;
      return { mode: 'iframe', src: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` };
    }

    if (type === 'embed' || src.startsWith('http')) {
      return { mode: 'iframe', src: src.includes('?') ? `${src}&autoplay=1` : `${src}?autoplay=1` };
    }

    return { mode: 'iframe', src: `https://www.youtube.com/embed/${src}?autoplay=1&rel=0` };
  }

  function openVideo(value, type) {
    const resolved = resolveVideoSource(value, type);
    if (!resolved) return;

    iframe.hidden = true;
    video.hidden = true;

    if (resolved.mode === 'file') {
      video.src = resolved.src;
      video.hidden = false;
      video.play();
    } else {
      iframe.src = resolved.src;
      iframe.hidden = false;
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    window.TFC_LENIS?.stop();
  }

  function closeVideo() {
    modal.classList.remove('open');
    iframe.src = '';
    iframe.hidden = true;
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.hidden = true;
    document.body.style.overflow = '';
    window.TFC_LENIS?.start();
  }

  function handlePlayClick(e) {
    const card = e.currentTarget.closest('.film-card');
    const btn = e.target.closest('.play-btn');
    const el = btn || card;
    if (!el || el.classList.contains('no-video')) return;

    e.stopPropagation();
    const value = el.dataset.video || card?.dataset.video;
    const type = el.dataset.videoType || card?.dataset.videoType;
    if (value?.trim()) openVideo(value, type);
  }

  document.querySelectorAll('.play-btn[data-video]').forEach(btn => {
    btn.addEventListener('click', handlePlayClick);
  });

  document.querySelectorAll('.film-card[data-video]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (card.classList.contains('no-video')) return;
      if (e.target.closest('.play-btn')) return;
      openVideo(card.dataset.video, card.dataset.videoType);
    });
  });

  closeBtn?.addEventListener('click', closeVideo);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeVideo();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideo();
  });
}

function initTestimonials() {
  const slides = document.querySelectorAll('.testimonial-slide');
  const dotsContainer = document.getElementById('testimonialDots');
  if (!slides.length || !dotsContainer) return;

  let current = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.hero-dot');

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  setInterval(() => goTo((current + 1) % slides.length), 6000);
}

function initTaglineAnimation() {
  const text = document.getElementById('taglineText');
  const line = document.getElementById('taglineLine');
  if (!text) return;

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      text.classList.add('visible');
      line?.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.5 });

  observer.observe(text);
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('name') || '';
    const subject = encodeURIComponent(`TFC Enquiry from ${name}`);
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${data.get('email') || ''}`,
        `Phone: ${data.get('phone') || ''}`,
        `Event Date: ${data.get('date') || ''}`,
        `Location: ${data.get('location') || ''}`,
        '',
        String(data.get('message') || ''),
      ].join('\n')
    );

    window.location.href = `mailto:hello@tfcfilms.co?subject=${subject}&body=${body}`;

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.textContent = "Opening your email app...";
    btn.style.background = '#2d6a2d';
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = '';
      form.reset();
    }, 3000);
  });
}

function initTrackList() {
  document.querySelectorAll('.track-item').forEach(track => {
    track.addEventListener('click', () => {
      document.querySelectorAll('.track-item').forEach(t => t.classList.remove('playing'));
      track.classList.add('playing');
    });
  });
}

function initFaq() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

function initSmoothNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  if (!navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(section => observer.observe(section));
}