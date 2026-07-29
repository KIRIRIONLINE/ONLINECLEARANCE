/* ==================================================
   ClearPath — Dashboard (client portal)
   This page only renders content for signed-in students.
   Anyone arriving without a valid session is bounced back
   to index.html to log in.
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- LOADER ---------- */
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('hide'), 400);
  });
  setTimeout(() => loader.classList.add('hide'), 1800);

  /* ---------- NAVBAR ---------- */
  const navbar = document.getElementById('navbar');
  const navBurger = document.getElementById('navBurger');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });

  navBurger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  /* ---------- SCROLL REVEAL ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ==================================================
     SUPABASE CONNECTION — same project as index.html
     ================================================== */
  const SUPABASE_URL = 'https://fzifpldwscfryyiylbok.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_BvO7BSGqjaAqugwIhCTp9A_p9_3Z7cu';

  const isSupabaseConfigured =
    typeof window.supabase !== 'undefined' &&
    !SUPABASE_URL.includes('YOUR_') &&
    !SUPABASE_ANON_KEY.includes('YOUR_');

  const sb = isSupabaseConfigured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const DEMO_AUTH_KEY = 'clearpath_demo_user';

  const dashWelcomeName = document.getElementById('dashWelcomeName');
  const certName = document.getElementById('certName');
  const logoutBtn = document.getElementById('logoutBtn');

  function paintWelcome(name) {
    if (certName) certName.textContent = name;
    if (dashWelcomeName) dashWelcomeName.textContent = `Welcome, ${name}`;
  }

  function bounceToLogin() {
    // No valid session — this page is not meant to be reached directly.
    window.location.href = 'index.html?auth=required#login';
  }

  /* ---------- AUTH GUARD ---------- */
  if (isSupabaseConfigured) {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { bounceToLogin(); return; }
      let name = data.session.user.email;
      const { data: profile } = await sb.from('profiles').select('full_name').eq('id', data.session.user.id).single();
      if (profile && profile.full_name) name = profile.full_name;
      paintWelcome(name);
      initDashboard();
    });

    logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      window.location.href = 'index.html';
    });

  } else {
    const savedUser = localStorage.getItem(DEMO_AUTH_KEY);
    if (!savedUser) {
      bounceToLogin();
    } else {
      paintWelcome(savedUser);
      initDashboard();
    }

    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(DEMO_AUTH_KEY);
      window.location.href = 'index.html';
    });
  }

  /* ==================================================
     DEPARTMENTS + CLEARANCE PROGRESS
     (only wired up once the auth guard confirms a session)
     ================================================== */
  function initDashboard() {
    const departments = [
      {
        id: 'finance', icon: '💳', name: 'Finance',
        desc: 'Confirms your fee balance is settled before anything else moves.',
        steps: [
          'Clear any outstanding fee balance on your student account',
          'Finance office verifies your payment against institution records',
          'Official receipt issued and finance clearance marked complete'
        ]
      },
      {
        id: 'library', icon: '📚', name: 'Library',
        desc: 'Checks that every borrowed book and fine is settled.',
        steps: [
          'Return all borrowed books and library materials',
          'Settle any outstanding library fines',
          'Librarian confirms no items are still pending'
        ]
      },
      {
        id: 'academic', icon: '🎓', name: 'Academic Dept.',
        desc: 'Confirms coursework is complete and there are no academic holds.',
        steps: [
          'Submit any pending coursework or assignments',
          'Head of Department confirms there are no academic holds',
          'Academic clearance approved and logged'
        ]
      },
      {
        id: 'hostel', icon: '🏠', name: 'Hostel',
        desc: 'Sign-off on your room, keys and any accommodation damages.',
        steps: [
          'Vacate your room and return hostel keys',
          'Warden inspects the room for damages',
          'Hostel clearance signed off in the system'
        ]
      },
      {
        id: 'games', icon: '🏅', name: 'Games & Sports',
        desc: 'Confirms all sports equipment issued to you has been returned.',
        steps: [
          'Return any sports equipment or uniforms issued to you',
          'Games officer confirms nothing is outstanding',
          'Games department clearance approved'
        ]
      },
      {
        id: 'registrar', icon: '🏛️', name: 'Registrar',
        desc: 'The final sign-off once every other department has cleared you.',
        steps: [
          'System checks that all five departments above are cleared',
          'Registrar reviews your complete clearance file',
          'Certificate generated with a unique QR verification code'
        ]
      }
    ];

    const STORAGE_KEY = 'clearpath_cleared_depts';
    const getCleared = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const setCleared = (arr) => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

    const deptGrid = document.getElementById('deptGrid');
    const deptLegend = document.getElementById('deptLegend');

    function renderDepartments() {
      const cleared = getCleared();
      deptGrid.innerHTML = '';
      deptLegend.innerHTML = '';

      departments.forEach(dept => {
        const isCleared = cleared.includes(dept.id);

        const card = document.createElement('div');
        card.className = 'dept-card';
        card.dataset.id = dept.id;
        card.innerHTML = `
          <div class="dept-top">
            <span class="dept-icon">${dept.icon}</span>
            <span class="dept-status ${isCleared ? 'cleared' : ''}">${isCleared ? 'Cleared' : 'Pending'}</span>
          </div>
          <h3>${dept.name}</h3>
          <p>${dept.desc}</p>
          <div class="dept-process">
            <ol>
              ${dept.steps.map((s, i) => `<li><span>${i + 1}</span>${s}</li>`).join('')}
            </ol>
            <button class="dept-clear-btn ${isCleared ? 'done' : ''}" data-id="${dept.id}">
              ${isCleared ? '✓ Marked cleared' : 'Mark this department cleared'}
            </button>
          </div>
        `;
        card.addEventListener('click', (e) => {
          if (e.target.closest('.dept-clear-btn')) return;
          card.classList.toggle('open');
        });
        deptGrid.appendChild(card);

        const pill = document.createElement('span');
        pill.className = `legend-pill ${isCleared ? 'cleared' : ''}`;
        pill.textContent = `${dept.icon} ${dept.name}`;
        deptLegend.appendChild(pill);
      });

      deptGrid.querySelectorAll('.dept-clear-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const cur = getCleared();
          if (!cur.includes(id)) {
            cur.push(id);
            setCleared(cur);
            const dept = departments.find(d => d.id === id);
            showToast(`${dept.name} clearance approved ✅`);
            renderDepartments();
            updateProgress();
          }
        });
      });
    }

    /* ---------- PROGRESS RING ---------- */
    const bigFg = document.getElementById('bigRingFg');
    const bigPct = document.getElementById('bigRingPct');
    const bigLabel = document.getElementById('bigRingLabel');
    const certificate = document.getElementById('certificate');
    const certQr = document.getElementById('certQr');

    const BIG_CIRC = 603; // 2 * PI * 96

    function updateProgress() {
      const cleared = getCleared();
      const total = departments.length;
      const pct = Math.round((cleared.length / total) * 100);

      bigFg.style.strokeDashoffset = BIG_CIRC - (BIG_CIRC * pct / 100);
      bigPct.textContent = pct + '%';
      bigLabel.textContent = `${cleared.length} of ${total} cleared`;

      if (cleared.length === total) {
        certificate.classList.add('show');
        buildQr();
      } else {
        certificate.classList.remove('show');
      }
    }

    function buildQr() {
      certQr.innerHTML = '';
      for (let i = 0; i < 36; i++) {
        const cell = document.createElement('span');
        cell.style.background = Math.random() > 0.42 ? 'var(--green-900)' : 'transparent';
        certQr.appendChild(cell);
      }
    }

    renderDepartments();
    updateProgress();
  }

  /* ==================================================
     TOAST
     ================================================== */
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ==================================================
     FLOATING SCROLL-TO-TOP BUTTON
     ================================================== */
  const floatTop = document.getElementById('floatTop');
  window.addEventListener('scroll', () => {
    floatTop.classList.toggle('show', window.scrollY > 600);
  });
  floatTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

});
