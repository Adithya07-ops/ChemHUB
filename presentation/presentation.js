/* ============================================================
   ChemHub Presentation — presentation.js
   Animated background canvas + particle system
   ============================================================ */

'use strict';

/* ── Animated background particles ── */
function initSlideParticles(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], animId;

  const COLORS = [
    'rgba(233,30,140,',
    'rgba(168,85,247,',
    'rgba(0,229,255,',
    'rgba(16,185,129,',
  ];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function spawn() {
    return {
      x: Math.random() * W,
      y: H + 10,
      r: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.3 + Math.random() * 0.6),
      alpha: 0,
      maxAlpha: 0.25 + Math.random() * 0.35,
      life: 0,
      maxLife: 200 + Math.random() * 200,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Subtle grid dots
    ctx.fillStyle = 'rgba(233,30,140,0.025)';
    const step = 48;
    for (let x = 0; x < W; x += step) {
      for (let y = 0; y < H; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Spawn
    if (particles.length < 55 && Math.random() < 0.35) {
      particles.push(spawn());
    }

    // Update & draw
    particles = particles.filter(p => p.life < p.maxLife);
    for (const p of particles) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      const t = p.life / p.maxLife;
      p.alpha = t < 0.15
        ? (t / 0.15) * p.maxAlpha
        : t > 0.75
          ? ((1 - t) / 0.25) * p.maxAlpha
          : p.maxAlpha;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();
    }

    animId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
  };
}

/* ── Connection lines between particles (for hero) ── */
function initHeroCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [], animId;

  const ACCENT_COLORS = [
    [233, 30, 140],
    [168, 85, 247],
    [0, 229, 255],
  ];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    nodes = Array.from({ length: 28 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 2 + Math.random() * 2,
      color: ACCENT_COLORS[i % ACCENT_COLORS.length],
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(233,30,140,0.03)';
    ctx.lineWidth = 1;
    const gs = 60;
    for (let x = 0; x < W; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Move nodes
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    }

    // Connections
    const D = 180;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < D) {
          const alpha = (1 - dist / D) * 0.18;
          const [r, g, b] = nodes[i].color;
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    for (const n of nodes) {
      const [r, g, b] = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
      ctx.fill();
      // glow
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.08)`;
      ctx.fill();
    }

    animId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
  };
}

/* ── Number counter animation ── */
function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const update = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* ── Main Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Reveal to be ready
  const waitFor = (fn, cb) => {
    if (fn()) { cb(); }
    else { setTimeout(() => waitFor(fn, cb), 100); }
  };

  waitFor(() => typeof Reveal !== 'undefined', () => {
    Reveal.initialize({
      hash: true,
      history: true,
      progress: true,
      slideNumber: 'c/t',
      controls: true,
      keyboard: true,
      center: false,
      transition: 'fade',
      transitionSpeed: 'slow',
      backgroundTransition: 'fade',
      width: '100%',
      height: '100%',
      margin: 0,
      minScale: 0.5,
      maxScale: 2.0,
      plugins: [],
    });

    // Hero canvas init
    const heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) initHeroCanvas(heroCanvas);

    // Per-slide particle canvases
    document.querySelectorAll('.slide-particle-canvas').forEach(c => {
      initSlideParticles(c);
    });

    // Counter animations on fragment visible
    Reveal.on('fragmentshown', e => {
      const counters = e.fragment.querySelectorAll('[data-count]');
      counters.forEach(el => {
        animateCounter(el, parseInt(el.dataset.count, 10));
      });
    });

    // Also trigger counters on slide change
    Reveal.on('slidechanged', e => {
      if (e.currentSlide) {
        e.currentSlide.querySelectorAll('[data-count]:not(.counted)').forEach(el => {
          el.classList.add('counted');
          animateCounter(el, parseInt(el.dataset.count, 10));
        });
      }
    });
  });
});
