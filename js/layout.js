(function () {
  const base = document.body.dataset.base || '';
  const page = document.body.dataset.page || '';

  const navItems = [
    { id: 'home', href: 'index.html', label: 'Home', icon: 'home' },
    { id: 'films', href: 'films.html', label: 'Films', icon: 'films' },
    { id: 'tales', href: 'tales-from-the-culture.html', label: 'Tales', icon: 'tales' },
    { id: 'about', href: 'about-us.html', label: 'About', icon: 'about' },
    { id: 'crew', href: 'crew.html', label: 'Crew', icon: 'crew' },
    { id: 'workshop', href: 'workshop.html', label: 'Workshop', icon: 'workshop' },
    { id: 'blog', href: 'blogs.html', label: 'Blog', icon: 'blog' },
    { id: 'contact', href: 'contact.html', label: 'Contact', icon: 'contact' },
  ];

  const icons = {
    home: '<path d="M3 10.5L12 3l9 7.5V19a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8.5z"/>',
    films: '<path d="M18.7 16.2C17.4 15.4 16 15.2 14.7 15.3C16 13.9 16.7 12 16.7 10C16.7 5.6 13.2 2 8.9 2C4.5 2 1 5.6 1 10C1 14.4 4.5 18 8.9 18C10 18 11 17.8 12 17.3C13.2 16.8 15.8 15.8 18.1 17.3C18.4 17.4 18.7 17.3 18.9 17.1C19.1 16.8 19 16.4 18.7 16.2Z"/>',
    tales: '<circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="10" r="3"/><path d="M10 2.5V1M10 19V17.5M2.5 10H1M19 10H17.5"/>',
    about: '<path d="M10 1.5C7.5 1.5 5.5 3.5 5.5 6C5.5 8.5 7.5 10.5 10 10.5C12.5 10.5 14.5 8.5 14.5 6C14.5 3.5 12.5 1.5 10 1.5ZM3 17.5C3 14 6 12 10 12C14 12 17 14 17 17.5V18.5H3V17.5Z"/>',
    crew: '<path d="M11.7 6.8H8.3C7.9 6.8 7.5 7 7.2 7.3C7 7.5 6.8 7.9 6.8 8.3V11.7C6.8 12.1 6.9 12.4 7.1 12.7C7.3 12.8 7.4 13 7.6 13.1V18C7.6 18.3 7.8 18.5 8.1 18.5H11.9C12.2 18.5 12.4 18.3 12.4 18V13.1C12.6 13 12.7 12.8 12.9 12.7C13.1 12.4 13.2 12.1 13.2 11.7V8.3C13.2 7.9 13 7.5 12.8 7.3C12.5 7 12.1 6.8 11.7 6.8Z"/><circle cx="10" cy="3.6" r="2.1"/>',
    workshop: '<path d="M16.4 13.7V9.9L18.7 8.6C19 8.4 19.2 8.1 19.2 7.7C19.2 7.3 19 6.9 18.7 6.7L11.1 2.3C10.4 1.9 9.6 1.9 8.9 2.3L1.3 6.7C1 6.9 0.8 7.3 0.8 7.7C0.8 8.1 1 8.4 1.3 8.6L3.6 9.9V13.7C3.6 14.5 4 15.2 4.7 15.6L7.8 17.4C8.5 17.8 9.2 18 10 18C10.8 18 11.5 17.8 12.2 17.4L15.3 15.6C16 15.2 16.4 14.5 16.4 13.7Z"/>',
    blog: '<path d="M17.6 3.9C16.3 3.6 12.9 3.3 10.3 3.3H9.7C7.2 3.3 3.9 3.6 2.5 3.8C2.4 4.8 2.3 6.7 2.3 7.8C2.3 9.1 2.4 11.4 2.5 12.1C2.8 13.3 3.9 14.3 5.1 14.6C5.7 14.7 7.9 14.8 9.3 14.9V16.4L7 17.8C6.9 17.8 6.9 17.9 6.7 18.2C6.7 18.3 6.7 18.4 6.7 18.5C6.7 18.6 6.8 18.7 6.9 18.7C7 18.8 7.1 18.8 7.2 18.8C7.3 18.8 7.4 18.8 7.5 18.7L10.3 17.2C12.9 17.2 16.3 16.9 17.6 16.6V3.9Z"/>',
    contact: '<path d="M10.7 3.3C10.3 3.3 10 3 10 2.6C10 2.3 10.3 2 10.7 2C12.5 2 14.4 2.7 15.9 4.1C16.6 4.8 17.1 5.7 17.4 6.5C17.8 7.4 18 8.4 18 9.3C18 9.7 17.7 10 17.4 10C17 10 16.7 9.7 16.7 9.3C16.7 8.5 16.6 7.7 16.3 7C16 6.3 15.5 5.6 14.9 5.1C13.8 3.9 12.2 3.3 10.7 3.3Z"/>',
  };

  const curveSvg = `<svg viewBox="0 0 30 30" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M26 -33C26 -35.7614 28.2386 -38 31 -38C33.7614 -38 36 -35.7614 36 -33V16.5C36 21.7467 40.2533 26 45.5 26C50.7467 26 55 30.2533 55 35.5V72.5C55 77.7467 50.7467 82 45.5 82C40.2533 82 36 86.2533 36 91.5V141C36 143.761 33.7614 146 31 146C28.2386 146 26 143.761 26 141V106C26 97.5992 26 93.3988 24.3651 90.1901C22.927 87.3677 20.6323 85.073 17.8099 83.6349C14.6012 82 10.4008 82 2 82H-136C-144.401 82 -148.601 82 -151.81 80.3651C-154.632 78.927 -156.927 76.6323 -158.365 73.8099C-160 70.6012 -160 66.4008 -160 58V50C-160 41.5992 -160 37.3988 -158.365 34.1901C-156.927 31.3677 -154.632 29.073 -151.81 27.6349C-148.601 26 -144.401 26 -136 26H2C10.4008 26 14.6012 26 17.8099 24.3651C20.6323 22.927 22.927 20.6323 24.3651 17.8099C26 14.6012 26 10.4008 26 2V-33Z"/></svg>`;

  function navCurves() {
    return `<span class="menu-curve-wrap" aria-hidden="true">
      <span class="menu-curve-top">${curveSvg}</span>
      <span class="menu-curve-bottom">${curveSvg}</span>
    </span>`;
  }

  function navLink(item) {
    const active = page === item.id ? ' active' : '';
    const curves = active ? navCurves() : '';
    return `<li class="sc-nav-item"><a href="${base}${item.href}" class="sc-nav-link${active}">
      <svg viewBox="0 0 20 20" fill="currentColor">${icons[item.icon]}</svg>
      ${item.label}${curves}
    </a></li>`;
  }

  const headerNav = [
    { id: 'pricing', href: 'pricing.html', label: 'Pricing' },
  ];

  function headerNavLink(item) {
    const active = page === item.id ? ' active' : '';
    return `<a href="${base}${item.href}" class="shell-top-link${active}">${item.label}</a>`;
  }

  const shellTopBar = `
  <div class="shell-top-bar">
    <form class="shell-search" action="${base}films-search.html" method="get" role="search">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>
      <input type="search" name="q" placeholder="Search a film here" aria-label="Search films">
    </form>
    <div class="shell-top-actions">
      ${headerNav.map(headerNavLink).join('')}
      <a href="${base}faqs.html" class="btn is-black">FAQs</a>
      <a href="${base}contact.html" class="btn">Enquire
        <svg viewBox="0 0 14 12" fill="currentColor"><path d="M8.2 0.3L13.3 5.4C13.6 5.7 13.6 6.3 13.3 6.6L8.2 11.7C7.9 12 7.4 12 7.1 11.7C6.8 11.3 6.8 10.8 7.1 10.5L10.8 6.8H1.7C1.3 6.8 0.9 6.4 0.9 6C0.9 5.6 1.3 5.2 1.7 5.2H10.8L7.1 1.5C6.8 1.2 6.8 0.7 7.1 0.3C7.4 0 7.9 0 8.2 0.3Z"/></svg>
      </a>
    </div>
  </div>`;

  const sidebar = `
  <aside class="sc-sidebar" id="site-sidebar">
    <div class="sc-sidebar-stars" aria-hidden="true"></div>
    <div class="sc-sidebar-sparkles" aria-hidden="true"></div>
    <div class="sc-sidebar-inner">
      <div class="sc-logo-wrap">
        <a href="${base}index.html" class="sc-logo" title="TFC Films &amp; CO. — Tales From the Culture">
          <img src="${base}images/tfc-logo.svg" alt="TFC — Tales From the Culture" class="sc-logo-img" width="56" height="56">
        </a>
      </div>
      <ul class="sc-nav-list">${navItems.map(navLink).join('')}</ul>
      <div class="sc-sidebar-cta">
        <a href="${base}contact.html" class="glow-cta" aria-label="Enquire about your story">
          <div class="glow-cta-ring" aria-hidden="true"></div>
          <div class="glow-cta-inner">
            <h4>We'd love to<br>hear your story!</h4>
            <span class="btn">Enquire
              <svg viewBox="0 0 14 12" fill="currentColor" aria-hidden="true"><path d="M8.2 0.3L13.3 5.4C13.6 5.7 13.6 6.3 13.3 6.6L8.2 11.7C7.9 12 7.4 12 7.1 11.7C6.8 11.3 6.8 10.8 7.1 10.5L10.8 6.8H1.7C1.3 6.8 0.9 6.4 0.9 6C0.9 5.6 1.3 5.2 1.7 5.2H10.8L7.1 1.5C6.8 1.2 6.8 0.7 7.1 0.3C7.4 0 7.9 0 8.2 0.3Z"/></svg>
            </span>
          </div>
        </a>
      </div>
    </div>
  </aside>`;

  const footer = `
  <footer class="footer">
    <div class="footer-bg">
      <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1920&q=80" alt="">
    </div>
    <div class="footer-content container">
      <div class="footer-top">
        <div class="footer-brand">
          <img src="${base}images/tfc-logo-wordmark.svg" alt="TFC Films &amp; CO. — Tales From the Culture" class="tfc-wordmark" width="280" height="58">
          <p>Award-winning cinematic storytellers crafting real films that honour culture, love, and legacy.</p>
        </div>
        <div class="footer-col">
          <h4>Explore</h4>
          <ul>
            <li><a href="${base}films.html">Films</a></li>
            <li><a href="${base}tales-from-the-culture.html">Tales From the Culture</a></li>
            <li><a href="${base}about-us.html">About Us</a></li>
            <li><a href="${base}crew.html">Crew</a></li>
            <li><a href="${base}workshop.html">Workshops</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Resources</h4>
          <ul>
            <li><a href="${base}blogs.html">Blog</a></li>
            <li><a href="${base}faqs.html">FAQs</a></li>
            <li><a href="${base}films-search.html">Search Films</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:hello@tfcfilms.co">hello@tfcfilms.co</a></li>
            <li><a href="tel:+919876543210">+91 98765 43210</a></li>
            <li><a href="${base}contact.html">Enquire</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="social-links">
          <a href="#" class="social-link" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg></a>
          <a href="#" class="social-link" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
          <a href="#" class="social-link" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#0a0a0a"/></svg></a>
          <a href="#" class="social-link" aria-label="Vimeo"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.98 6.17c-.09 1.88-1.4 4.46-3.93 7.73-2.62 3.41-4.84 5.12-6.65 5.12-1.12 0-2.07-.99-2.85-2.97L8.5 8.07c-.52-1.88-1.08-2.82-1.68-2.82-.13 0-.58.27-1.35.8L3.66 4.5c1.33-1.17 2.64-2.35 3.93-3.53C8.93 0 9.92-.02 10.4.01c2.17.14 3.5 1.6 3.99 4.38.54 3.19.91 5.17 1.11 5.94.61 2.77 1.28 4.15 2.01 4.15.57 0 1.42-.9 2.55-2.7 1.13-1.8 1.73-3.17 1.81-4.11.08-1.55-.45-2.32-1.58-2.32-.56 0-1.13.13-1.71.39 1.13-3.68 3.29-5.47 6.47-5.38 2.36.07 3.47 1.6 3.33 4.59z"/></svg></a>
        </div>
        <p class="copyright">&copy; 2026 TFC Films &amp; CO. — Tales From the Culture. All rights reserved.</p>
      </div>
    </div>
  </footer>
  <div class="modal" id="videoModal" role="dialog" aria-label="Video player">
    <div class="modal-content">
      <button class="modal-close" id="modalClose" aria-label="Close video">&times;</button>
      <iframe id="modalIframe" src="" allow="autoplay; fullscreen" allowfullscreen hidden></iframe>
      <video id="modalVideo" controls playsinline hidden></video>
    </div>
  </div>`;

  document.body.classList.add('shell-layout');

  const darkThemes = ['home-page', 'magic-page', 'about-page', 'tales-page', 'films-page-magic'];
  if (darkThemes.some((c) => document.body.classList.contains(c))) {
    document.body.classList.add('theme-dark');
  } else {
    document.body.classList.add('theme-light');
  }

  if (!document.getElementById('sidebar-magic-css')) {
    const magicCss = document.createElement('link');
    magicCss.id = 'sidebar-magic-css';
    magicCss.rel = 'stylesheet';
    magicCss.href = `${base}css/sidebar-magic.css?v=3`;
    document.head.appendChild(magicCss);
  }

  if (!document.getElementById('tfc-logo-css')) {
    const logoCss = document.createElement('link');
    logoCss.id = 'tfc-logo-css';
    logoCss.rel = 'stylesheet';
    logoCss.href = `${base}css/logo.css?v=1`;
    document.head.appendChild(logoCss);
  }

  if (!document.getElementById('theme-contrast-css')) {
    const contrastCss = document.createElement('link');
    contrastCss.id = 'theme-contrast-css';
    contrastCss.rel = 'stylesheet';
    contrastCss.href = `${base}css/theme-contrast.css?v=1`;
    document.head.appendChild(contrastCss);
  }

  const oldHeader = document.getElementById('site-header');
  if (oldHeader) oldHeader.remove();

  const existingSidebar = document.getElementById('site-sidebar');
  if (existingSidebar) existingSidebar.remove();
  document.body.insertAdjacentHTML('afterbegin', sidebar);

  if (!document.getElementById('scMenuBtn')) {
    document.body.insertAdjacentHTML('beforeend', `
      <button class="sc-menu-btn" id="scMenuBtn" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>`);
  }

  let shell = document.querySelector('.main-shell');
  let mainContent = document.querySelector('.main_content');

  if (!shell) {
    shell = document.createElement('div');
    shell.className = 'main-shell';
    mainContent = document.createElement('div');
    mainContent.className = 'main_content';

    const footerEl = document.getElementById('site-footer');
    const scripts = [...document.body.querySelectorAll('script')];
    const toMove = [...document.body.children].filter((el) => {
      if (el.id === 'site-sidebar' || el.id === 'scMenuBtn') return false;
      if (el.tagName === 'SCRIPT') return false;
      if (el.classList.contains('main-shell')) return false;
      return true;
    });

    toMove.forEach((el) => mainContent.appendChild(el));
    shell.appendChild(mainContent);
    document.body.insertBefore(shell, document.getElementById('scMenuBtn'));
    scripts.forEach((s) => document.body.appendChild(s));
  } else {
    mainContent = shell.querySelector('.main_content') || shell;
  }

  if (!mainContent.querySelector('.shell-top-bar')) {
    mainContent.insertAdjacentHTML('afterbegin', shellTopBar);
  }

  const footerEl = document.getElementById('site-footer');
  if (footerEl) footerEl.innerHTML = footer;

  if (!document.getElementById('sidebar-magic-js')) {
    const magicScript = document.createElement('script');
    magicScript.id = 'sidebar-magic-js';
    magicScript.src = `${base}js/sidebar-magic.js`;
    magicScript.defer = true;
    document.body.appendChild(magicScript);
  }
})();