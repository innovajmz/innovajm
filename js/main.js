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

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
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
   PARTICLE CANVAS
   ============================================================ */
(function initCanvas() {
  const canvas = $('#heroCanvas');
  if (!canvas) return;

  // Skip if reduce motion is preferred
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  let W, H, particles = [], connections = [];
  const PARTICLE_COUNT = 70;
  const MAX_DIST = 140;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.r  = Math.random() * 2.0 + 0.7;
      this.alpha = Math.random() * 0.45 + 0.18;
    }
    update() {
      // Mouse repulsion — particles flee the cursor
      const dx = this.x - MOUSE.x;
      const dy = this.y - MOUSE.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 110 && dist > 0) {
        const force = (1 - dist / 110) * 3.5;
        this.vx += (dx / dist) * force * 0.055;
        this.vy += (dy / dist) * force * 0.055;
      }
      // Speed clamp
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > 3.2) {
        this.vx = (this.vx / speed) * 3.2;
        this.vy = (this.vy / speed) * 3.2;
      }
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(4,77,140,${this.alpha})`;
      ctx.fill();
    }
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  }

  let tick = 0;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    tick++;

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const opacity = (1 - dist / MAX_DIST) * 0.18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(4,77,140,${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => { resize(); }, { passive: true });
  init();
  animate();
})();

/* ============================================================
   TYPING EFFECT
   ============================================================ */
(function initTyping() {
  const el = $('#typingText');
  if (!el) return;

  const words = [
    'páginas que venden',
    'anuncios que convierten',
    'una web efectiva',
    'publicidad que atrae',
    'clientes por WhatsApp',
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
      el.textContent = current.slice(0, charIdx - 1);
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
