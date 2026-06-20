(function () {
  const API = '/api';
  const SITE = location.origin;

  const MAIN_PAGES = [
    { label: 'Home', path: '/', icon: '🏠' },
    { label: 'Films', path: '/films', icon: '🎬' },
    { label: 'Tales From the Culture', path: '/tales-from-the-culture', icon: '✨' },
    { label: 'About Us', path: '/about-us', icon: '👥' },
    { label: 'Crew', path: '/crew', icon: '🎥' },
    { label: 'Workshop', path: '/workshop', icon: '🎓' },
    { label: 'Blog', path: '/blogs', icon: '📝' },
    { label: 'FAQs', path: '/faqs', icon: '❓' },
    { label: 'Pricing', path: '/pricing', icon: '💰' },
    { label: 'Contact', path: '/contact', icon: '📩' },
    { label: 'Film Search', path: '/films-search', icon: '🔍' },
  ];

  const FILM_SLUGS = [
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

  function slugToLabel(slug) {
    return slug.replace(/---/g, ' & ').replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // State
  let currentPath = null;
  let editMode = false;
  let deviceWidth = '';

  // Elements
  const loginEl = document.getElementById('cmsLogin');
  const shellEl = document.getElementById('cmsShell');
  const loginForm = document.getElementById('loginForm');
  const loginPwd = document.getElementById('loginPwd');
  const loginBtn = document.getElementById('loginBtn');
  const loginErr = document.getElementById('loginErr');
  const logoutBtn = document.getElementById('logoutBtn');
  const mainList = document.getElementById('mainPageList');
  const filmList = document.getElementById('filmPageList');
  const filmsCount = document.getElementById('filmsCount');
  const filmsToggle = document.getElementById('filmsToggle');
  const pageSearch = document.getElementById('pageSearch');
  const breadPage = document.getElementById('breadPage');
  const editModeBtn = document.getElementById('editModeBtn');
  const openTabBtn = document.getElementById('openTabBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const cmsFrame = document.getElementById('cmsFrame');
  const cmsFrameWrap = document.getElementById('cmsFrameWrap');
  const cmsWelcome = document.getElementById('cmsWelcome');
  const cmsPreviewWrap = document.getElementById('cmsPreviewWrap');
  const cmsUrlBar = document.getElementById('cmsUrlBar');
  const editIndicator = document.getElementById('editIndicator');
  const cmsStatus = document.getElementById('cmsStatus');
  const sidebarToggle = document.getElementById('sidebarToggle');

  // ── Auth ──────────────────────────────────────────────────────

  async function checkSession() {
    try {
      const res = await fetch(`${API}/session`, { credentials: 'include' });
      const d = await res.json();
      return d.authed;
    } catch { return false; }
  }

  async function doLogin(pwd) {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';
    loginErr.textContent = '';
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Login failed');
      showShell();
    } catch (e) {
      loginErr.textContent = e.message;
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  }

  async function doLogout() {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    location.reload();
  }

  // ── Shell ─────────────────────────────────────────────────────

  function showShell() {
    loginEl.remove();
    shellEl.hidden = false;
    buildNav();
  }

  // ── Navigation ────────────────────────────────────────────────

  function buildNav() {
    // Main pages
    mainList.innerHTML = '';
    MAIN_PAGES.forEach(pg => {
      const li = document.createElement('li');
      li.className = 'cms-nav-item';
      const a = document.createElement('a');
      a.href = '#';
      a.dataset.path = pg.path;
      a.innerHTML = `<span>${pg.icon}</span> ${pg.label}`;
      a.addEventListener('click', e => { e.preventDefault(); loadPage(pg.path, pg.label); });
      li.appendChild(a);
      mainList.appendChild(li);
    });

    // Films
    filmsCount.textContent = FILM_SLUGS.length;
    filmList.innerHTML = '';
    FILM_SLUGS.forEach(slug => {
      const label = slugToLabel(slug);
      const li = document.createElement('li');
      li.className = 'cms-nav-item';
      const a = document.createElement('a');
      a.href = '#';
      a.dataset.path = `/films/${slug}`;
      a.innerHTML = `<span>🎞️</span> ${label}`;
      a.addEventListener('click', e => { e.preventDefault(); loadPage(`/films/${slug}`, label); });
      li.appendChild(a);
      filmList.appendChild(li);
    });

    // Films toggle
    filmsToggle.addEventListener('click', () => {
      filmList.classList.toggle('is-hidden');
      filmsToggle.classList.toggle('is-collapsed');
    });
  }

  // ── Search ────────────────────────────────────────────────────

  pageSearch.addEventListener('input', () => {
    const q = pageSearch.value.trim().toLowerCase();
    document.querySelectorAll('.cms-nav-item').forEach(li => {
      const text = li.textContent.toLowerCase();
      li.hidden = q && !text.includes(q);
    });
    // Show films group if any film matches
    if (q) {
      filmList.classList.remove('is-hidden');
      filmsToggle.classList.remove('is-collapsed');
    }
  });

  // ── Load page ─────────────────────────────────────────────────

  function loadPage(path, label) {
    currentPath = path;
    editMode = false;

    // Update nav active state
    document.querySelectorAll('.cms-nav-item a').forEach(a => {
      a.classList.toggle('is-active', a.dataset.path === path);
    });

    // Update breadcrumb
    breadPage.innerHTML = `<strong>${label}</strong>`;

    // Show buttons
    editModeBtn.hidden = false;
    openTabBtn.hidden = false;
    refreshBtn.hidden = false;
    editModeBtn.textContent = '✏️ Edit Page';
    editModeBtn.style.background = '';

    // Reset edit indicator
    editIndicator.hidden = true;

    // Show preview wrap
    cmsWelcome.hidden = true;
    cmsPreviewWrap.hidden = false;

    // Load in iframe (preview mode)
    const url = `${SITE}${path}`;
    cmsUrlBar.textContent = url;
    openTabBtn.onclick = () => window.open(url, '_blank');
    cmsFrame.src = url;
    setStatus('Loading…');
    cmsFrame.onload = () => setStatus('');
  }

  // ── Edit mode ─────────────────────────────────────────────────

  editModeBtn.addEventListener('click', () => {
    if (!currentPath) return;
    editMode = !editMode;

    if (editMode) {
      const editUrl = `${SITE}${currentPath}?edit=1`;
      cmsUrlBar.textContent = editUrl + ' [EDIT MODE]';
      cmsFrame.src = editUrl;
      editIndicator.hidden = false;
      editModeBtn.innerHTML = '👁️ Preview';
      editModeBtn.style.background = 'rgba(201,168,76,.2)';
      setStatus('Edit mode — click any text, image, or video on the page');
    } else {
      const previewUrl = `${SITE}${currentPath}`;
      cmsUrlBar.textContent = previewUrl;
      cmsFrame.src = previewUrl;
      editIndicator.hidden = true;
      editModeBtn.innerHTML = '✏️ Edit Page';
      editModeBtn.style.background = '';
      setStatus('');
    }
  });

  refreshBtn.addEventListener('click', () => {
    if (cmsFrame.src) { cmsFrame.src = cmsFrame.src; setStatus('Reloading…'); }
  });

  // ── Device preview ────────────────────────────────────────────

  document.querySelectorAll('.cms-device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cms-device-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      deviceWidth = btn.dataset.width;
      if (deviceWidth) {
        cmsFrame.style.width = deviceWidth + 'px';
        cmsFrameWrap.classList.add('is-device');
      } else {
        cmsFrame.style.width = '100%';
        cmsFrameWrap.classList.remove('is-device');
      }
    });
  });

  // ── Sidebar toggle ────────────────────────────────────────────

  sidebarToggle.addEventListener('click', () => {
    shellEl.classList.toggle('sidebar-collapsed');
  });

  // ── Logout ────────────────────────────────────────────────────

  logoutBtn.addEventListener('click', doLogout);

  // ── Login form ────────────────────────────────────────────────

  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    if (loginPwd.value) doLogin(loginPwd.value);
  });

  // ── Status ────────────────────────────────────────────────────

  function setStatus(msg) { cmsStatus.textContent = msg; }

  // ── Boot ─────────────────────────────────────────────────────

  (async () => {
    const authed = await checkSession();
    if (authed) showShell();
    else loginPwd.focus();
  })();
})();
