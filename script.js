/* ==================================================
   ClearPath — KWUST Online Student Clearance System
   Home / marketing page + single-step login
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
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
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

  /* ---------- STAT COUNTERS ---------- */
  const statNums = document.querySelectorAll('.stat-num');
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 40));
      const tick = () => {
        current += step;
        if (current >= target) { el.textContent = target; return; }
        el.textContent = current;
        requestAnimationFrame(tick);
      };
      tick();
      statObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  statNums.forEach(el => statObserver.observe(el));

  /* ==================================================
     SUPABASE CONNECTION
     Paste your project's URL and anon key below — find them in
     Supabase → Project Settings → API. Until you do, the site
     runs in Demo mode (any details work, saved on this device only).
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

  /* ==================================================
     LOGIN CARD — tabs, sign in, create profile
     Both paths redirect to the standalone dashboard.html —
     the portal never lives on this page.
     ================================================== */
  const signInBtn = document.getElementById('signInBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const welcomeText = document.getElementById('welcomeText');
  const loginSub = document.getElementById('loginSub');
  const signinForm = document.getElementById('signinForm');
  const signupForm = document.getElementById('signupForm');
  const signinHint = document.getElementById('signinHint');
  const signupHint = document.getElementById('signupHint');

  if (!isSupabaseConfigured) {
    signinHint.textContent = 'Demo mode — Supabase isn\'t connected yet, any details work.';
    signupHint.textContent = 'Demo mode — this just saves locally until Supabase is connected.';
  } else {
    signinHint.textContent = 'Connected to Supabase.';
    signupHint.textContent = 'Your profile is saved securely in Supabase.';
  }

  // tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab + 'Form').classList.add('active');
      loginSub.textContent = btn.dataset.tab === 'signin'
        ? 'Sign in to reach your clearance dashboard'
        : 'Create your student profile in seconds';
    });
  });

  function goToDashboard() {
    window.location.href = 'dashboard.html';
  }

  function reflectSignedInNav() {
    signInBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    welcomeText.textContent = 'Welcome back';
  }

  function reflectSignedOutNav() {
    signInBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }

  function isSignedIn() {
    return isSupabaseConfigured
      ? signInBtn.classList.contains('hidden')
      : !!localStorage.getItem(DEMO_AUTH_KEY);
  }

  if (isSupabaseConfigured) {
    /* -------- REAL SUPABASE AUTH -------- */

    // if a session already exists, reflect it in the nav (don't force-redirect —
    // this is still the public marketing page)
    sb.auth.getSession().then(({ data }) => {
      if (data.session) reflectSignedInNav();
    });

    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signinEmail').value.trim();
      const password = document.getElementById('signinPassword').value;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { showToast(error.message); return; }
      showToast('Signed in — welcome back!');
      goToDashboard();
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value.trim();
      const reg = document.getElementById('signupReg').value.trim();
      const dept = document.getElementById('signupDept').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;

      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) { showToast(error.message); return; }

      if (data.user) {
        await sb.from('profiles').insert({
          id: data.user.id,
          full_name: name,
          reg_number: reg,
          department: dept
        });
      }
      showToast(`Profile created — welcome, ${name}!`);
      goToDashboard();
    });

    logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      reflectSignedOutNav();
      showToast('Signed out');
    });

  } else {
    /* -------- DEMO FALLBACK (no Supabase keys yet) -------- */

    if (localStorage.getItem(DEMO_AUTH_KEY)) reflectSignedInNav();

    signinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('signinEmail').value.trim();
      const name = email.split('@')[0] || 'Student';
      localStorage.setItem(DEMO_AUTH_KEY, name);
      showToast(`Signed in — welcome back, ${name}!`);
      goToDashboard();
    });

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value.trim() || 'Student';
      localStorage.setItem(DEMO_AUTH_KEY, name);
      showToast(`Profile created — welcome, ${name}!`);
      goToDashboard();
    });

    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(DEMO_AUTH_KEY);
      reflectSignedOutNav();
      showToast('Signed out');
    });
  }

  // Dashboard nav link: only meaningful once signed in; otherwise send
  // the student to the login form instead of a dead-end redirect.
  document.getElementById('dashNavLink').addEventListener('click', (e) => {
    if (!isSignedIn()) {
      e.preventDefault();
      showToast('Sign in first to open your dashboard');
      document.getElementById('login').scrollIntoView({ behavior: 'smooth' });
    }
  });

  // If we were bounced back here from dashboard.html for lacking a session,
  // nudge the student straight to the login form.
  if (new URLSearchParams(window.location.search).get('auth') === 'required') {
    showToast('Please sign in to view your dashboard');
    setTimeout(() => document.getElementById('login').scrollIntoView({ behavior: 'smooth' }), 500);
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
     SLIDERS (photo gallery + testimonials)
     ================================================== */
  function setupSlider({ trackId, dotsId, sliderName, autoplayMs }) {
    const track = document.getElementById(trackId);
    const dotsWrap = document.getElementById(dotsId);
    const slides = Array.from(track.children);
    let index = 0;

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach(d => d.classList.remove('active'));
      dots[index].classList.add('active');
    }

    document.querySelectorAll(`[data-slider="${sliderName}"]`).forEach(btn => {
      btn.addEventListener('click', () => {
        goTo(btn.classList.contains('next') ? index + 1 : index - 1);
        resetAutoplay();
      });
    });

    let timer;
    function resetAutoplay() {
      clearInterval(timer);
      timer = setInterval(() => goTo(index + 1), autoplayMs);
    }
    resetAutoplay();
  }

  setupSlider({ trackId: 'photoTrack', dotsId: 'photoDots', sliderName: 'photo', autoplayMs: 4500 });
  setupSlider({ trackId: 'testiTrack', dotsId: 'testiDots', sliderName: 'testi', autoplayMs: 6000 });

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
