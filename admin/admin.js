(function () {
  const SITE = location.origin;

  const MAIN_PAGES = [
    { label: 'Home',                 path: '/',                      icon: '🏠' },
    { label: 'Films',                path: '/films',                 icon: '🎬' },
    { label: 'Tales From Culture',   path: '/tales-from-the-culture',icon: '✨' },
    { label: 'About Us',             path: '/about-us',              icon: '👥' },
    { label: 'Crew',                 path: '/crew',                  icon: '🎥' },
    { label: 'Workshop',             path: '/workshop',              icon: '🎓' },
    { label: 'Blog',                 path: '/blogs',                 icon: '📝' },
    { label: 'FAQs',                 path: '/faqs',                  icon: '❓' },
    { label: 'Pricing',              path: '/pricing',               icon: '💰' },
    { label: 'Contact',              path: '/contact',               icon: '📩' },
    { label: 'Film Search',          path: '/films-search',          icon: '🔍' },
  ];

  const FILMS = [
    'a-walk-to-remember---ruchi-arsh','aashi-vedant','aayush-suman','aditi-jay',
    'aditi-siddharth','aisha-mustafa','aishwarya-avaneesh','akansha-avinay',
    'akshima-kush','all-you-need-is-love','alvira-saad','amrita-navraj',
    'amy-armaan','anisha-amit','anita-colm','anjali-keshav','anjena-vick',
    'ankush-chinmaya','antara-mohit','anushka-virat','apoorva-kshitij',
    'arpita-kunal','arya-federico','aslesha-sushant','ayushi-shitiz',
    'bipasha-karan','darshinee-vishal','deepika-ranveer','dhrisha-arun',
    'dia-vaibhav','dia-vaibhav-3','divine-intervention','entwined','faith',
    'faiz-fajr','gayatri-vallabh','gopalika-dhruv','gurveen-jasmin','heartbeats',
    'ishita-danny','ivy-raphael','jasprit-and-sanjana','kamakshi-justin',
    'kanika-ritik','karishma-namir','kasha-ever-after','katrina-vicky',
    'kiara-sidharth','leena-chirag','mahek-jay','mallika-rahul','manal-nadim',
    'mausam-piyush','meera-meeraj','milan-sai-suraj','moksha-aamir','monsoon-love',
    'natasha-varun','nayanthara-vignesh','nikita-varun','nikki-vishal','nurture',
    'payal-dhruveer','pernia-sahil','poojitha-harish','prerna-innayat','priya-akshay',
    'pv-sindhu-datta','radhika-anant','radhika-yashovardhan','rajkumar-patralekha',
    'rakul-jackky','renu-shivam','riccha-andrew','ridhi-raj','riya-parth',
    'roma-jaskaran','rukmani-arun','saanchi-shahaan','sabina-steve','sana-sameer',
    'sanaya-amir','saumitra-sharmin','shaana-uraaz','sheena-jay','shibani-farhan',
    'shilpa-deepak','shloka-akash','simran-vishal','sneha-navak','sriharshini-sai-teja',
    'sumedha-harsh','tanisha-sardin','tanishka-randhir','the-inseparables','tina-madhav',
    'tuisha-gaurav','varsha-harshit','varsha-saravana','vipasha-cj','yashraj-alpana','zana-james'
  ];

  function toLabel(slug) {
    return slug.replace(/---/g,' & ').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }

  // DOM refs
  const loginScreen = document.getElementById('loginScreen');
  const shell       = document.getElementById('shell');
  const loginForm   = document.getElementById('loginForm');
  const loginBtn    = document.getElementById('loginBtn');
  const loginErr    = document.getElementById('loginErr');
  const logoutBtn   = document.getElementById('logoutBtn');
  const mainList    = document.getElementById('mainList');
  const filmList    = document.getElementById('filmList');
  const searchInput = document.getElementById('search');
  const breadcrumb  = document.getElementById('breadcrumb');
  const editBtn     = document.getElementById('editBtn');
  const reloadBtn   = document.getElementById('reloadBtn');
  const newTabBtn   = document.getElementById('newTabBtn');
  const editPill    = document.getElementById('editPill');
  const welcome     = document.getElementById('welcome');
  const previewWrap = document.getElementById('previewWrap');
  const frame       = document.getElementById('previewFrame');
  const frameWrap   = document.getElementById('frameWrap');
  const urlBar      = document.getElementById('urlBar');
  const quickLinks  = document.getElementById('quickLinks');
  const sidebarBtn  = document.getElementById('sidebarBtn');
  const filmsBadge  = document.getElementById('filmsBadge');

  let currentPath = null;
  let editing = false;

  // ── Auth ────────────────────────────────────────────────────

  async function checkSession() {
    try {
      const r = await fetch('/api/session', { credentials: 'include' });
      const d = await r.json();
      return !!d.authed;
    } catch { return false; }
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const pwd = document.getElementById('pwd').value;
    if (!pwd) return;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';
    loginErr.textContent = '';
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Wrong password');
      loginScreen.style.display = 'none';
      shell.hidden = false;
      buildNav();
    } catch (err) {
      loginErr.textContent = err.message;
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    location.reload();
  });

  // ── Nav ─────────────────────────────────────────────────────

  function navItem(path, label, icon) {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = '#';
    a.dataset.path = path;
    a.innerHTML = `<span class="pg-icon">${icon}</span>${label}`;
    a.addEventListener('click', e => { e.preventDefault(); load(path, label); });
    li.appendChild(a);
    return li;
  }

  function buildNav() {
    MAIN_PAGES.forEach(p => mainList.appendChild(navItem(p.path, p.label, p.icon)));
    filmsBadge.textContent = FILMS.length;
    FILMS.forEach(s => filmList.appendChild(navItem(`/films/${s}`, toLabel(s), '🎞️')));

    // Quick links on welcome screen
    MAIN_PAGES.slice(0, 6).forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'quick-link';
      btn.textContent = p.label;
      btn.addEventListener('click', () => load(p.path, p.label));
      quickLinks.appendChild(btn);
    });

    // Section toggles
    document.querySelectorAll('.sb-section-hd').forEach(hd => {
      hd.addEventListener('click', () => {
        const sec = document.getElementById(hd.dataset.section);
        sec.classList.toggle('collapsed');
      });
    });
  }

  // ── Search ──────────────────────────────────────────────────

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    document.querySelectorAll('#nav li').forEach(li => {
      li.hidden = !!q && !li.textContent.toLowerCase().includes(q);
    });
    if (q) {
      document.getElementById('filmsSection').classList.remove('collapsed');
    }
  });

  // ── Load page ────────────────────────────────────────────────

  function load(path, label) {
    currentPath = path;
    editing = false;

    document.querySelectorAll('#nav li a').forEach(a => {
      a.classList.toggle('active', a.dataset.path === path);
    });

    breadcrumb.innerHTML = `<strong>${label}</strong>`;
    editBtn.hidden = false;
    reloadBtn.hidden = false;
    newTabBtn.hidden = false;
    editBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.59 3l3.41 3.41-9 9H4.5v-3.5l9.09-8.91z"/></svg> Edit Page`;
    editBtn.className = 'tb-action primary';
    editPill.hidden = true;

    welcome.hidden = true;
    previewWrap.hidden = false;

    const url = SITE + path;
    urlBar.textContent = url;
    newTabBtn.onclick = () => window.open(url, '_blank');
    reloadBtn.onclick = () => { frame.src = frame.src; };

    frame.src = url;
  }

  // ── Edit mode ────────────────────────────────────────────────

  editBtn.addEventListener('click', () => {
    if (!currentPath) return;
    editing = !editing;
    const editUrl = SITE + currentPath + '?edit=1';
    const previewUrl = SITE + currentPath;

    if (editing) {
      frame.src = editUrl;
      urlBar.textContent = editUrl;
      editPill.hidden = false;
      editBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path d="M2 10s3-7 8-7 8 7 8 7-3 7-8 7-8-7-8-7z"/></svg> Preview`;
      editBtn.className = 'tb-action';
    } else {
      frame.src = previewUrl;
      urlBar.textContent = previewUrl;
      editPill.hidden = true;
      editBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.59 3l3.41 3.41-9 9H4.5v-3.5l9.09-8.91z"/></svg> Edit Page`;
      editBtn.className = 'tb-action primary';
    }
  });

  // ── Device preview ───────────────────────────────────────────

  document.querySelectorAll('.dev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dev-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const w = btn.dataset.w;
      if (w) {
        frame.style.width = w + 'px';
        frameWrap.classList.add('device');
      } else {
        frame.style.width = '100%';
        frameWrap.classList.remove('device');
      }
    });
  });

  // ── Sidebar toggle ───────────────────────────────────────────

  sidebarBtn.addEventListener('click', () => {
    document.getElementById('sidebar').style.width =
      document.getElementById('sidebar').style.width === '0px' ? '' : '0px';
  });

  // ── Boot ─────────────────────────────────────────────────────

  (async () => {
    if (await checkSession()) {
      loginScreen.style.display = 'none';
      shell.hidden = false;
      buildNav();
    }
  })();
})();
