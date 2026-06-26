/**
 * NexaWeb — main.js
 * Handles: loader, cursor, navbar, particles canvas,
 *          typing effect, scroll animations, counter,
 *          testimonials slider, contact form (with
 *          honeypot & client-side sanitisation),
 *          back-to-top, footer year.
 *
 * No external dependencies. Vanilla ES6+.
 */

'use strict';

/* ============================================================
   UTILITY
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ============================================================
   GLOBAL MOUSE TRACKING (used by canvas & orb parallax)
   ============================================================ */
const MOUSE = { x: -9999, y: -9999 };
document.addEventListener('mousemove', e => {
  MOUSE.x = e.clientX;
  MOUSE.y = e.clientY;
}, { passive: true });

/** Sanitise a string so it can't inject HTML if we ever display it */
function sanitise(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ============================================================
   LOADER
   ============================================================ */
(function initLoader() {
  const loader = $('#loader');
  if (!loader) return;

  // Minimum display time so the animation plays fully
  const MIN_TIME = 2000;
  const start = Date.now();

  function hideLoader() {
    const elapsed = Date.now() - start;
    const delay = Math.max(0, MIN_TIME - elapsed);
    setTimeout(() => {
      loader.classList.add('hidden');
      // Trigger hero line animations after loader disappears
      setTimeout(triggerHeroAnimations, 200);
      // Remove from DOM after transition
      loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    }, delay);
  }

  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader, { once: true });
  }
})();

/* ============================================================
   HERO LINE REVEAL ANIMATIONS
   ============================================================ */
function triggerHeroAnimations() {
  $$('.line-reveal').forEach(el => el.classList.add('animated'));
  // Start counter after hero is visible
  setTimeout(startCounters, 800);
}

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
(function initCursor() {
  const cursor = $('#cursor');
  const follower = $('#cursorFollower');
  if (!cursor || !follower) return;

  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;
  let rafId = null;

  let cursorActive = false;
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
    if (!cursorActive) {
      cursorActive = true;
      cursor.classList.add('active');
      follower.classList.add('active');
    }
  }, { passive: true });

  function animateFollower() {
    followerX += (mouseX - followerX) * 0.12;
    followerY += (mouseY - followerY) * 0.12;
    follower.style.left = followerX + 'px';
    follower.style.top  = followerY + 'px';
    rafId = requestAnimationFrame(animateFollower);
  }
  animateFollower();

  // Hover effect on interactive elements
  const hoverEls = 'a, button, [role="button"], input, textarea, select, label';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(hoverEls)) {
      cursor.classList.add('is-hovering');
      follower.classList.add('is-hovering');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(hoverEls)) {
      cursor.classList.remove('is-hovering');
      follower.classList.remove('is-hovering');
    }
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    follower.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
    follower.style.opacity = '1';
  });
})();

/* ============================================================
   PARTICLE CANVAS — lightweight version
   ============================================================ */
(function initCanvas() {
  const canvas = $('#heroCanvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none'; return;
  }

  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  const COUNT = window.innerWidth < 768 ? 80 : 180;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x        = Math.random() * W;
      this.y        = init ? Math.random() * H : Math.random() * H;
      this.vx       = (Math.random() - 0.5) * 0.18;
      this.vy       = (Math.random() - 0.5) * 0.18;
      this.r        = Math.random() * 1.0 + 0.4;
      this.alpha    = Math.random() * 0.5 + 0.1;
      this.alphaDir = Math.random() > 0.5 ? 1 : -1;
      this.alphaSpd = Math.random() * 0.007 + 0.002;
    }
    update() {
      // Twinkle: alpha oscillates independently per particle
      this.alpha += this.alphaSpd * this.alphaDir;
      if (this.alpha > 0.9 || this.alpha < 0.05) this.alphaDir *= -1;

      // Mouse repulsion
      const dx = this.x - MOUSE.x, dy = this.y - MOUSE.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 90 && dist > 0) {
        const force = (1 - dist / 90) * 2.2;
        this.vx += (dx / dist) * force * 0.05;
        this.vy += (dy / dist) * force * 0.05;
      }
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > 1.5) { this.vx = (this.vx / speed) * 1.5; this.vy = (this.vy / speed) * 1.5; }
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${this.alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  function init() { resize(); particles = Array.from({ length: COUNT }, () => new Particle()); }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => resize(), { passive: true });
  init();
  animate();
})();

/* ============================================================
   SPARKLE ZONE CANVAS — dense sparkles inside cin-sparkle-zone
   Fade is handled by .cin-sparkle-mask CSS overlay (Aceternity technique):
   black div + radial-gradient mask reveals center-top only
   ============================================================ */
(function initSparkleZone() {
  var canvas = document.getElementById('sparkleZoneCanvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none'; return;
  }

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, particles = [], rafId;

  function resize() {
    var zone = canvas.parentElement;
    W = canvas.width  = zone.offsetWidth  || 640;
    H = canvas.height = zone.offsetHeight || 160;
  }

  // tsparticles density=1200 in 400×400px → for 640×160: (640*160)/(400*400)*1200 ≈ 768
  var COUNT = window.innerWidth < 768 ? 280 : 768;

  function Sparkle() { this.init(); }
  Sparkle.prototype.init = function() {
    this.x    = Math.random() * (W || 640);
    this.y    = Math.random() * (H || 160);
    this.r    = Math.random() * 0.6 + 0.4;   // 0.4–1.0px radius (minSize 0.4, maxSize 1)
    this.a    = Math.random();                 // opacity 0.1–1.0 random start
    this.aDir = Math.random() > 0.5 ? 1 : -1;
    this.aSpd = (Math.random() * 4 + 1) * 0.006; // speed≈4 in tsparticles → ~0.006-0.03/frame
    this.vx   = (Math.random() - 0.5) * 0.6; // speed min:0.1 max:1 → avg ~0.3
    this.vy   = (Math.random() - 0.5) * 0.6;
  };
  Sparkle.prototype.tick = function() {
    this.a += this.aSpd * this.aDir;
    if (this.a > 1) { this.a = 1; this.aDir = -1; }
    if (this.a < 0.1) { this.a = 0.1; this.aDir = 1; }
    this.x += this.vx; this.y += this.vy;
    // outModes: "out" — wrap around like tsparticles
    if (this.x < -2) this.x = W + 2;
    if (this.x > W + 2) this.x = -2;
    if (this.y < -2) this.y = H + 2;
    if (this.y > H + 2) this.y = -2;
  };
  Sparkle.prototype.draw = function() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + this.a.toFixed(3) + ')';
    ctx.fill();
  };

  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < particles.length; i++) {
      particles[i].tick();
      particles[i].draw();
    }
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId) cancelAnimationFrame(rafId);
    resize();
    if (W === 0) { setTimeout(start, 50); return; }
    particles = [];
    for (var i = 0; i < COUNT; i++) particles.push(new Sparkle());
    frame();
  }

  window.addEventListener('resize', function() {
    resize();
    for (var i = 0; i < particles.length; i++) particles[i].init();
  }, { passive: true });

  window.addEventListener('load', function() {
    requestAnimationFrame(function() { requestAnimationFrame(start); });
  }, { once: true });
})();

/* ============================================================
   TYPING EFFECT
   ============================================================ */
(function initTyping() {
  const el = $('#typingText');
  if (!el) return;

  const words = [
    'páginas web',
    'anuncios efectivos',
    'presencia digital',
    'su vitrina online',
    'el sistema ideal',
  ];

  let wordIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let paused = false;

  function type() {
    if (paused) return;

    const current = words[wordIdx];

    if (!isDeleting) {
      el.textContent = current.slice(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        paused = true;
        setTimeout(() => { paused = false; isDeleting = true; type(); }, 2200);
        return;
      }
    } else {
      el.textContent = current.slice(0, charIdx - 1) || '\u00A0';
      charIdx--;
      if (charIdx === 0) {
        isDeleting = false;
        wordIdx = (wordIdx + 1) % words.length;
      }
    }

    const speed = isDeleting ? 60 : 90;
    setTimeout(type, speed);
  }

  // Wait until hero animations start before typing
  setTimeout(type, 1200);
})();

/* ============================================================
   NAVBAR — scroll behaviour, active link, progress bar
   ============================================================ */
(function initNavbar() {
  const navbar     = $('#navbar');
  const progress   = $('#navProgress');
  const hamburger  = $('#hamburger');
  const navLinks   = $('#navLinks');
  const links      = $$('.nav-link');
  const sections   = $$('section[id]');

  if (!navbar) return;

  let lastScroll = 0;
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateNav);
      ticking = true;
    }
  }

  function updateNav() {
    const scrollY = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;

    // Scrolled class
    if (scrollY > 40) navbar.classList.add('scrolled');
    else              navbar.classList.remove('scrolled');

    // Progress bar
    if (progress) progress.style.width = (scrollY / docH * 100) + '%';

    // Active nav link based on section in view
    let current = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 100;
      if (scrollY >= top) current = sec.id;
    });

    links.forEach(link => {
      link.classList.toggle('active', link.dataset.section === current);
    });

    // Back to top button
    const btt = $('#backToTop');
    if (btt) btt.classList.toggle('visible', scrollY > 500);

    lastScroll = scrollY;
    ticking = false;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Hamburger toggle
  if (hamburger && navLinks) {
    const navOverlay = $('#navOverlay');

    function closeMenu() {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      if (navOverlay) navOverlay.classList.remove('open');
    }

    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      if (navOverlay) navOverlay.classList.toggle('open', isOpen);
    });

    // Close on link click
    $$('.nav-link', navLinks).forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close on overlay click
    if (navOverlay) navOverlay.addEventListener('click', closeMenu);

    // Close on outside click (overlay is inside navbar so navbar.contains covers it)
    document.addEventListener('click', e => {
      if (navLinks.classList.contains('open') && !navbar.contains(e.target)) {
        closeMenu();
      }
    });
  }

  // Back to top
  const btt = $('#backToTop');
  if (btt) {
    btt.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
(function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  $$('.reveal').forEach(el => observer.observe(el));
})();

/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */
function startCounters() {
  const counterEls = $$('[data-target]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const duration = 1600;
      const start = performance.now();

      function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target;
      }

      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counterEls.forEach(el => observer.observe(el));
}

/* ============================================================
   TESTIMONIALS — scroll-snap táctil
   ============================================================ */
(function initTestimonials() {
  const scroll = $('#testimonialsScroll');
  const prevBtn = $('#tPrev');
  const nextBtn = $('#tNext');
  const dotsContainer = $('#tDots');
  if (!scroll) return;

  const cards = $$('.testimonial-card', scroll);
  const total = cards.length;
  let current = 0;
  let autoTimer = null;

  function getVisible() {
    return window.innerWidth <= 768 ? 1 : 2;
  }

  function getMaxIdx() {
    return Math.max(0, total - getVisible());
  }

  function buildDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    const maxIdx = getMaxIdx();
    for (let i = 0; i <= maxIdx; i++) {
      const dot = document.createElement('button');
      dot.className = 't-dot' + (i === current ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Testimonio ${i + 1}`);
      dot.setAttribute('aria-selected', String(i === current));
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
  }

  function goTo(idx) {
    current = Math.max(0, Math.min(idx, getMaxIdx()));
    const card = cards[current];
    if (card) {
      scroll.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
    }
    buildDots();
    resetAuto();
  }

  function next() { goTo(current >= getMaxIdx() ? 0 : current + 1); }
  function prev() { goTo(current <= 0 ? getMaxIdx() : current - 1); }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(next, 5000);
  }

  // Sync dots when user scrolls manually
  let scrollEndTimer;
  scroll.addEventListener('scroll', () => {
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      if (!cards[0]) return;
      const cardWidth = cards[0].offsetWidth + 24;
      const idx = Math.round(scroll.scrollLeft / cardWidth);
      if (idx !== current) { current = idx; buildDots(); }
    }, 120);
  }, { passive: true });

  // Mouse drag-to-scroll
  let isDragging = false, startX = 0, startScroll = 0;
  scroll.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.pageX;
    startScroll = scroll.scrollLeft;
    scroll.classList.add('grabbing');
  });
  scroll.addEventListener('mouseleave', () => { isDragging = false; scroll.classList.remove('grabbing'); });
  scroll.addEventListener('mouseup', () => { isDragging = false; scroll.classList.remove('grabbing'); });
  scroll.addEventListener('mousemove', e => {
    if (!isDragging) return;
    e.preventDefault();
    scroll.scrollLeft = startScroll - (e.pageX - startX) * 1.4;
  });

  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);

  window.addEventListener('resize', () => { goTo(0); }, { passive: true });

  buildDots();
  resetAuto();
})();

/* ============================================================
   CONTACT FORM — validation, honeypot, sanitisation
   ============================================================ */
(function initContactForm() {
  const form     = $('#contactForm');
  const status   = $('#formStatus');
  const submitBtn = $('#submitBtn');
  const btnText  = $('#btnText');
  const charCounter = $('#charCount');
  const msgArea  = $('#fmessage');

  if (!form) return;

  // Live character counter
  if (msgArea && charCounter) {
    msgArea.addEventListener('input', () => {
      charCounter.textContent = msgArea.value.length;
    }, { passive: true });
  }

  // Validation rules
  const fields = {
    fname:    { el: $('#fname'),     err: $('#fnameError'),    validate: v => v.trim().length >= 2 ? '' : 'Por favor ingrese su nombre (mínimo 2 caracteres).' },
    femail:   { el: $('#femail'),    err: $('#femailError'),   validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Ingrese un email válido.' },
    fservice: { el: $('#fservice'), err: $('#fserviceError'), validate: v => v !== '' ? '' : 'Seleccione un servicio.' },
    fmessage: { el: msgArea,        err: $('#fmessageError'), validate: v => v.trim().length >= 20 ? '' : 'Cuéntanos un poco más (mínimo 20 caracteres).' },
  };

  function validateField(key) {
    const { el, err, validate } = fields[key];
    if (!el) return true;
    const msg = validate(el.value);
    err.textContent = msg;
    el.classList.toggle('invalid', !!msg);
    return !msg;
  }

  // Validate on blur
  Object.keys(fields).forEach(key => {
    const { el } = fields[key];
    if (el) {
      el.addEventListener('blur', () => validateField(key), { passive: true });
      el.addEventListener('input', () => {
        if (el.classList.contains('invalid')) validateField(key);
      }, { passive: true });
    }
  });

  function showStatus(msg, type) {
    status.textContent = msg;
    status.className = `form-status visible ${type}`;
    status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideStatus() {
    status.className = 'form-status';
    status.textContent = '';
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    hideStatus();

    // Honeypot check
    const honey = form.querySelector('[name="_honey"]');
    if (honey && honey.value !== '') {
      // Bot detected — silently ignore
      showStatus('Mensaje enviado. Te contactaremos pronto.', 'success');
      return;
    }

    // Validate all fields
    let valid = true;
    Object.keys(fields).forEach(key => {
      if (!validateField(key)) valid = false;
    });
    if (!valid) {
      showStatus('Por favor corrige los errores antes de enviar.', 'error');
      return;
    }

    // Collect & sanitise data
    const payload = {
      nombre:   sanitise(fields.fname.el.value.trim()),
      email:    sanitise(fields.femail.el.value.trim()),
      empresa:  sanitise(($('#fcompany') || { value: '' }).value.trim()),
      servicio: sanitise(fields.fservice.el.value),
      mensaje:  sanitise(fields.fmessage.el.value.trim()),
    };

    // Loading state
    submitBtn.classList.add('loading');
    btnText.textContent = 'Enviando';

    try {
      /**
       * TODO: replace this endpoint with your actual backend.
       * For now we simulate a successful submission.
       * When deploying, use a server-side handler (Node/PHP/Cloud Function)
       * with rate limiting and CSRF protection.
       */
      await new Promise(resolve => setTimeout(resolve, 1500));

      // On real deployment, use:
      // const res = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) throw new Error('Server error');

      showStatus('¡Mensaje enviado! Te contactaremos en menos de 24 horas. 🚀', 'success');
      form.reset();
      if (charCounter) charCounter.textContent = '0';
      Object.values(fields).forEach(({ el }) => el && el.classList.remove('invalid'));

    } catch (err) {
      console.error('Form submission error:', err);
      showStatus('Hubo un error al enviar. Por favor intenta de nuevo o escríbenos directo a innovajmz@gmail.com', 'error');
    } finally {
      submitBtn.classList.remove('loading');
      btnText.textContent = 'Enviar Mensaje';
    }
  });
})();

/* ============================================================
   FOOTER YEAR
   ============================================================ */
(function setFooterYear() {
  const el = $('#footerYear');
  if (el) el.textContent = new Date().getFullYear();
})();

/* ============================================================
   SMOOTH ANCHOR SCROLLING (with offset for fixed navbar)
   ============================================================ */
document.addEventListener('click', e => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const hash = anchor.getAttribute('href');
  if (hash === '#') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const target = document.querySelector(hash);
  if (!target) return;
  e.preventDefault();
  const navH = ($('#navbar') || { offsetHeight: 80 }).offsetHeight;
  const top = target.getBoundingClientRect().top + window.scrollY - navH - 8;
  window.scrollTo({ top, behavior: 'smooth' });
}, { passive: false });

/* ============================================================
   SECURITY: disable right-click inspect in production
   (Comment out if not needed — some users find this annoying)
   ============================================================ */
// document.addEventListener('contextmenu', e => e.preventDefault());

/* ============================================================
   PERFORMANCE: lazy-load any future images
   ============================================================ */
if ('IntersectionObserver' in window) {
  const lazyImages = $$('img[data-src]');
  if (lazyImages.length) {
    const imgObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imgObserver.unobserve(img);
        }
      });
    });
    lazyImages.forEach(img => imgObserver.observe(img));
  }
}

/* ============================================================
   ORB PARALLAX — subtle mouse-driven depth on bg orbs
   CSS animation uses standalone `translate` property;
   JS uses `transform` — they compose independently.
   ============================================================ */
(function initOrbParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const orbs = $$('.bg-orb');
  if (!orbs.length) return;

  let targetNX = 0, targetNY = 0;
  let currentNX = 0, currentNY = 0;

  // Reuse MOUSE from global tracker (already set via mousemove above)
  function tick() {
    // Normalized: -0.5 → 0.5
    targetNX = (MOUSE.x / window.innerWidth  - 0.5);
    targetNY = (MOUSE.y / window.innerHeight - 0.5);

    // Smooth follow
    currentNX += (targetNX - currentNX) * 0.04;
    currentNY += (targetNY - currentNY) * 0.04;

    orbs.forEach(orb => {
      const speed = parseFloat(orb.dataset.speed || '18');
      const tx = currentNX * speed;
      const ty = currentNY * speed;
      // `transform` is free because CSS keyframes use `translate` property
      orb.style.transform = `translate(${tx}px, ${ty}px)`;
    });

    requestAnimationFrame(tick);
  }
  tick();
})();

/* ============================================================
   BENEFITS ORB — click to expand + parallax
   ============================================================ */
(function initBenefitsOrb() {
  // ── Radial Orbital Timeline ──────────────────────────────
  const roScene = document.getElementById('roScene');
  if (!roScene) return;

  const roData = [
    {
      id: 0, title: 'Más Clientes', category: 'Crecimiento', energy: 92,
      desc: 'Personas interesadas en lo que usted vende llegando directamente, sin intermediarios.',
      chips: ['Contacto directo', 'Clientes reales', 'WhatsApp integrado'],
      relatedIds: [2, 3],
      icon: '<path d="M15 2C8 2 2 8 2 15c0 2.2.6 4.3 1.7 6L2 28l7.2-1.7A13 13 0 1 0 15 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 14c0 4.5 4.5 7 8 7l1.2-2-2-1.3-1.2.6c-1.4 0-2.8-1.4-2.8-2.8l.6-1.2-1.3-2L10 14z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    },
    {
      id: 1, title: 'Presencia Digital', category: 'Marca', energy: 88,
      desc: 'Una página web que refleja la calidad de su negocio y genera confianza antes de que escriban.',
      chips: ['Diseño a medida', '100% móvil', 'Entrega en 2 semanas'],
      relatedIds: [0, 4],
      icon: '<rect x="2" y="5" width="26" height="18" rx="3" stroke="currentColor" stroke-width="2"/><path d="M10 28h10M15 23v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 15l5 5 9-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    {
      id: 2, title: 'Publicidad Dirigida', category: 'Marketing', energy: 85,
      desc: 'Anuncios en Meta y Google que llegan exactamente a quienes quieren lo que usted vende, en su zona.',
      chips: ['Meta Ads', 'Google Ads', 'Reportes semanales'],
      relatedIds: [0, 5],
      icon: '<circle cx="15" cy="15" r="12" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="15" r="6" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="15" r="2.5" fill="currentColor"/>'
    },
    {
      id: 3, title: 'Sistema 24/7', category: 'Eficiencia', energy: 80,
      desc: 'Su web y sus anuncios generan resultados todos los días, incluso fuera del horario laboral.',
      chips: ['Activo 24/7', '365 días', 'Sin esfuerzo extra'],
      relatedIds: [0, 5],
      icon: '<path d="M3 24L10 14l6 6 5-7 6 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="6" r="3.5" stroke="currentColor" stroke-width="2"/>'
    },
    {
      id: 4, title: 'SEO & Visibilidad', category: 'Posicionamiento', energy: 78,
      desc: 'Su negocio aparece cuando alguien busca exactamente lo que usted ofrece en Google.',
      chips: ['Google Search', 'Palabras clave', 'Posicionamiento local'],
      relatedIds: [1, 3],
      icon: '<circle cx="13" cy="13" r="9" stroke="currentColor" stroke-width="2"/><path d="M22 22l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    },
    {
      id: 5, title: 'Resultados Claros', category: 'Análisis', energy: 90,
      desc: 'Reportes mensuales de cuántas visitas, consultas y conversiones genera su inversión.',
      chips: ['Google Analytics', 'Métricas reales', 'Reportes mensuales'],
      relatedIds: [2, 3],
      icon: '<path d="M4 20h16M4 20V8l6 4 5-6 5 6v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    }
  ];

  let rotAngle = 0, autoRotate = true, activeId = null;
  const RADIUS = window.innerWidth < 600 ? 130 : 210;

  const nodeEls = roData.map(item => {
    const el = document.createElement('div');
    el.className = 'ro-node';
    el.setAttribute('data-id', item.id);
    el.innerHTML = `
      <div class="ro-node-glow"></div>
      <div class="ro-node-circle">
        <svg width="18" height="18" viewBox="0 0 30 30" fill="none">${item.icon}</svg>
      </div>
      <span class="ro-node-label">${item.title}</span>
      <div class="ro-card">
        <div class="ro-card-category">${item.category}</div>
        <div class="ro-card-title">${item.title}</div>
        <p class="ro-card-desc">${item.desc}</p>
        <div class="ro-card-bar">
          <div class="ro-card-bar-header"><span>Impacto</span><span>${item.energy}%</span></div>
          <div class="ro-card-bar-track"><div class="ro-card-bar-fill"></div></div>
        </div>
        <div class="ro-card-chips">${item.chips.map(c => `<span class="ro-card-chip">${c}</span>`).join('')}</div>
      </div>`;
    el.addEventListener('click', e => { e.stopPropagation(); toggleNode(item.id); });
    roScene.appendChild(el);
    return { el, item };
  });

  function getPos(i, total, angle) {
    const a = ((i / total) * 360 + angle) % 360;
    const rad = (a * Math.PI) / 180;
    return {
      x: RADIUS * Math.cos(rad),
      y: RADIUS * Math.sin(rad),
      zIdx: Math.round(100 + 50 * Math.cos(rad)),
      opacity: Math.max(0.35, Math.min(1, 0.35 + 0.65 * ((1 + Math.sin(rad)) / 2)))
    };
  }

  function updatePositions() {
    nodeEls.forEach(({ el }, i) => {
      const { x, y, zIdx, opacity } = getPos(i, roData.length, rotAngle);
      el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      el.style.zIndex = el.classList.contains('active') ? 200 : zIdx;
      if (!el.classList.contains('active')) el.style.opacity = opacity;
    });
  }

  function toggleNode(id) {
    if (activeId === id) { deactivateAll(); return; }
    deactivateAll();
    activeId = id;
    autoRotate = false;
    const item = roData.find(d => d.id === id);
    nodeEls.forEach(({ el, item: d }) => {
      if (d.id === id) {
        el.classList.add('active');
        el.style.opacity = 1;
        setTimeout(() => { el.querySelector('.ro-card-bar-fill').style.width = item.energy + '%'; }, 50);
      } else if (item.relatedIds.includes(d.id)) {
        el.classList.add('related'); el.style.opacity = 0.85;
      } else {
        el.style.opacity = 0.2;
      }
    });
    const idx = roData.findIndex(d => d.id === id);
    rotAngle = 270 - (idx / roData.length) * 360;
    updatePositions();
  }

  function deactivateAll() {
    activeId = null; autoRotate = true;
    nodeEls.forEach(({ el }) => {
      el.classList.remove('active', 'related');
      const fill = el.querySelector('.ro-card-bar-fill');
      if (fill) fill.style.width = '0%';
    });
  }

  roScene.addEventListener('click', () => { if (activeId !== null) deactivateAll(); });

  (function tick() {
    if (autoRotate) { rotAngle = (rotAngle + 0.18) % 360; updatePositions(); }
    requestAnimationFrame(tick);
  })();
})();

/* ============================================================
   AURORA BG — versión ligera: 3 capas, sin partículas, sin trail
   ============================================================ */
(function initAuroraBg() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none'; return;
  }

  const ctx = canvas.getContext('2d');
  let W, H, t = 0;
  let scrollRaw = 0, scrollEased = 0;
  let mx = 0.5, my = 0.5, mxEased = 0.5, myEased = 0.5;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', () => { scrollRaw = window.scrollY; }, { passive: true });
  document.addEventListener('mousemove', e => { mx = e.clientX / W; my = e.clientY / H; }, { passive: true });

  /* ── 3 capas de ola, paso 4px (era 2px × 6 capas) ──────── */
  function drawWave(wi, baseH) {
    const yBase = H * (0.18 + wi * 0.28);
    const amp   = H * (0.13 + wi * 0.04);
    const spd   = 0.36 + wi * 0.20;
    const freq  = 0.0015 + wi * 0.0006;

    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const y = yBase
        + Math.sin(x * freq + t * spd + wi)    * amp
        + Math.cos(x * 0.003 + t * 0.26)       * (amp * 0.38)
        + (myEased - 0.5) * H * 0.055;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = `hsla(${baseH + wi * 18},88%,${36 - wi * 4}%,${0.38 - wi * 0.05})`;
    ctx.fill();
  }

  /* ── Click ripples (simple, sin sparks) ─────────────────── */
  const ripples = [];
  document.addEventListener('click', e => {
    ripples.push({ x: e.clientX, y: e.clientY, r: 0, alpha: 0.75 });
  });

  function drawRipples(baseH) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r    += 9; rp.alpha -= 0.025;
      if (rp.alpha <= 0) { ripples.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${baseH},90%,70%,${rp.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /* ── Render loop ─────────────────────────────────────────── */
  function frame() {
    t += 0.007;
    scrollEased += (scrollRaw - scrollEased) * 0.04;
    mxEased     += (mx        - mxEased)     * 0.06;
    myEased     += (my        - myEased)     * 0.06;

    const sp    = scrollEased / Math.max(1, document.body.scrollHeight - H);
    const baseH = 210 + sp * 40;

    ctx.fillStyle = `hsl(${baseH},48%,3.5%)`;
    ctx.fillRect(0, 0, W, H);

    drawWave(0, baseH);
    drawWave(1, baseH);
    drawWave(2, baseH);

    // Cursor glow suave
    const gx = mxEased * W, gy = myEased * H;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.22);
    g.addColorStop(0, `hsla(${baseH},85%,65%,0.13)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawRipples(baseH);
    requestAnimationFrame(frame);
  }

  resize();
  frame();
})();

/* ============================================================
   GSAP SCROLL ANIMATIONS + 3D CARD TILT
   ============================================================ */
(function initGSAP() {
  if (typeof gsap === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  // NOTE: .reveal animations are handled by IntersectionObserver (initReveal).
  // GSAP only handles tilt, magnetic, parallax — no opacity overrides.

  // ── Parallax on bg-orbs (scrub:1 for smooth, was 2 which lagged) ──
  document.querySelectorAll('.bg-orb').forEach(orb => {
    gsap.to(orb, {
      y: -(parseFloat(orb.dataset.speed || 10) * 4),
      ease: 'none',
      scrollTrigger: {
        trigger: orb.parentElement,
        scrub: 1,
        start: 'top bottom',
        end: 'bottom top',
      },
    });
  });

  // ── 3D card tilt on mouse ─────────────────────────────────
  const tiltCards = document.querySelectorAll('.service-card, .plan-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      gsap.to(card, {
        rotateY: x * 12,
        rotateX: -y * 12,
        scale: 1.025,
        ease: 'power2.out',
        duration: 0.35,
        transformPerspective: 900,
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        ease: 'power3.out',
        duration: 0.55,
      });
    });
  });

  // ── Magnetic buttons ─────────────────────────────────────
  document.querySelectorAll('.btn-primary, .nav-cta').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width  / 2;
      const y = e.clientY - r.top  - r.height / 2;
      gsap.to(btn, { x: x * 0.22, y: y * 0.22, duration: 0.35, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: 'elastic.out(1, 0.5)' });
    });
  });

  // ── Cinematic Hero ────────────────────────────────────────
  (function initCinematicHero() {
    var hero     = document.querySelector('.cin-hero');
    if (!hero) return;
    var mainCard = document.getElementById('cinMainCard');
    if (!mainCard) return;

    var mockup   = document.getElementById('cinMockup');  // iPhone bezel — 3D tilt target
    var isMobile = window.innerWidth < 768;
    var rafId    = null;

    // ── Mouse tracking (window listener, matching React original) ──
    window.addEventListener('mousemove', function(e) {
      if (window.scrollY > window.innerHeight * 2) return;

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function() {
        var rect   = mainCard.getBoundingClientRect();
        var mouseX = e.clientX - rect.left;
        var mouseY = e.clientY - rect.top;

        // Sheen: set in px (card-relative) so radial-gradient positions correctly
        mainCard.style.setProperty('--mouse-x', mouseX + 'px');
        mainCard.style.setProperty('--mouse-y', mouseY + 'px');

        // 3D tilt: based on window position, ±12° like original
        if (mockup) {
          var xVal = (e.clientX / window.innerWidth  - 0.5) * 2;
          var yVal = (e.clientY / window.innerHeight - 0.5) * 2;
          gsap.to(mockup, { rotationY: xVal * 12, rotationX: -yVal * 12, ease: 'power3.out', duration: 1.2 });
        }
      });
    }, { passive: true });

    // ── GSAP initial states ───────────────────────────────
    // autoAlpha:1 overrides CSS `.gsap-reveal { visibility:hidden }` without breaking gradient text
    gsap.set('.cin-text-days',  { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' });
    // Card is centered by flex — just push it below the viewport
    gsap.set(mainCard, { y: window.innerHeight + 200, autoAlpha: 1 });
    gsap.set(['.cin-card-left-text', '.cin-card-right-text', '.cin-mockup-wrapper', '.cin-float-badge', '.cin-phone-widget'], { autoAlpha: 0 });
    gsap.set('.cin-cta-wrapper', { autoAlpha: 0, scale: 0.8, filter: 'blur(30px)' });

    // ── Intro timeline (timed, not scroll-driven) ─────────
    var introTl = gsap.timeline({ delay: 0.3 });
    introTl
      .to('.cin-text-days', { duration: 1.4, clipPath: 'inset(0 0% 0 0)', ease: 'power4.inOut' });

    // ── Scroll timeline (2000px pin, scrub) ───────────────
    var scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=2000',
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      },
    });

    scrollTl
      // Phase 1 (0→1.5): hero fades + card slides up
      .to(['.cin-text-wrapper', '.cin-grid'], { scale: 1.15, filter: 'blur(20px)', opacity: 0.2, ease: 'power2.inOut', duration: 1.5 }, 0)
      .to(mainCard, { y: 0, ease: 'power3.inOut', duration: 1.5 }, 0)
      // Phase 2 (1.5→2.3): card expands to full screen
      .to(mainCard, { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 0.8 })
      // All content at t=0 with power3.out — user sees smooth scroll-driven animation:
      // card enters viewport at ~t=0.4 with content already ~48% visible and animating in
      .fromTo('.cin-mockup-wrapper',
        { y: 200, z: -300, rotationX: 25, rotationY: -15, autoAlpha: 0, scale: 0.7 },
        { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: 'power3.out', duration: 2.0 }, 0)
      .fromTo('.cin-phone-widget',
        { y: 30, autoAlpha: 0, scale: 0.95 },
        { y: 0, autoAlpha: 1, scale: 1, stagger: 0.08, ease: 'power3.out', duration: 1.8 }, 0)
      .to('.cin-progress-ring', { strokeDashoffset: 60, duration: 1.8, ease: 'power3.inOut' }, 0)
      .to('.cin-counter-val', { innerHTML: 47, snap: { innerHTML: 1 }, duration: 1.8, ease: 'expo.out' }, 0)
      .fromTo('.cin-float-badge',
        { y: 60, autoAlpha: 0, scale: 0.7, rotationZ: -8 },
        { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: 'power3.out', duration: 1.8, stagger: 0.1 }, 0)
      .fromTo('.cin-card-left-text',  { x: -40, autoAlpha: 0 },            { x: 0, autoAlpha: 1, ease: 'power3.out', duration: 1.8 }, 0)
      .fromTo('.cin-card-right-text', { x:  40, autoAlpha: 0, scale: 0.9 }, { x: 0, autoAlpha: 1, scale: 1, ease: 'power3.out', duration: 1.8 }, 0)
      // Short hold: content fully visible, then fast exit sequence
      .to({}, { duration: 0.2 })
      .set('.cin-text-wrapper', { autoAlpha: 0 })
      .set('.cin-cta-wrapper',  { autoAlpha: 1 })
      .to({}, { duration: 0.1 })
      // Fast exit
      .to(['.cin-mockup-wrapper', '.cin-float-badge', '.cin-card-left-text', '.cin-card-right-text'],
        { scale: 0.92, y: -30, autoAlpha: 0, ease: 'power2.in', duration: 0.35, stagger: 0.03 })
      // Pullback + CTA (fast)
      .to(mainCard, { width: isMobile ? '92vw' : '85vw', height: isMobile ? '92vh' : '85vh', borderRadius: isMobile ? '32px' : '40px', ease: 'expo.inOut', duration: 0.6 }, 'pullback')
      .to('.cin-cta-wrapper', { scale: 1, filter: 'blur(0px)', ease: 'expo.inOut', duration: 0.6 }, 'pullback')
      // Card flies up and out
      .to(mainCard, { y: -window.innerHeight - 300, ease: 'power3.in', duration: 0.6 });
  })();

  // ── Parallax cases section ───────────────────────────────
  (function() {
    const section  = document.querySelector('.cases');
    const scene    = section && section.querySelector('.parallax-scene');
    const inner    = document.getElementById('parallaxInner');
    if (!section || !inner || !scene) return;

    const rowRight = section.querySelector('.parallax-row--right');
    const rowLeft  = section.querySelector('.parallax-row--left');

    gsap.set(inner, { transformPerspective: 1000 });

    // Calcular overflow de cada fila para saber cuánto barrer
    function rowOverflow(row) {
      return Math.max(0, row.scrollWidth - window.innerWidth);
    }
    const overflowRight = rowOverflow(rowRight);
    const overflowLeft  = rowOverflow(rowLeft);
    const sweepRight    = overflowRight > 0 ? overflowRight / 2 : 80;
    const sweepLeft     = overflowLeft  > 0 ? overflowLeft  / 2 : 60;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=130%',
        pin: scene,
        scrub: 1.2,
        anticipatePin: 1,
      },
    });

    // Phase 1 (0–30%): tilt flattens + opacity ramps up
    tl.fromTo(inner,
      { rotateX: 12, rotateZ: 10, opacity: 0.3 },
      { rotateX: 0,  rotateZ: 0,  opacity: 1, ease: 'none', duration: 0.3 },
      0
    );

    // Fila 1: empieza desplazada a la derecha, barre hacia la izquierda → el usuario ve todos los cards
    tl.fromTo(rowRight, { x:  sweepRight }, { x: -sweepRight, ease: 'none', duration: 1 }, 0);
    // Fila 2: empieza desplazada a la izquierda, barre hacia la derecha
    tl.fromTo(rowLeft,  { x: -sweepLeft  }, { x:  sweepLeft,  ease: 'none', duration: 1 }, 0);
  })();

  ScrollTrigger.refresh();
})();

// Cookie consent + Meta Pixel
function loadMetaPixel() {
  if (window.fbq) return;
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window,document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1020785677790513');
  fbq('track', 'PageView');
}

function acceptCookies() {
  localStorage.setItem('cookie_consent', 'accepted');
  document.getElementById('cookie-banner').style.display = 'none';
  loadMetaPixel();
}
function declineCookies() {
  localStorage.setItem('cookie_consent', 'declined');
  document.getElementById('cookie-banner').style.display = 'none';
}

(function() {
  var consent = localStorage.getItem('cookie_consent');
  if (!consent) {
    document.getElementById('cookie-banner').style.display = 'block';
  } else if (consent === 'accepted') {
    loadMetaPixel();
  }
})();
