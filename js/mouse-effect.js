/* 自定义粒子背景 + 纳米粒子掉落 + 交互高亮 — 完整版 */
(function () {
  'use strict';

  /* =====================================================
   * 第一部分：自定义粒子背景 — 轻量网状版
   * 无鼠标聚集，均匀网络分布，高性能
   * ===================================================== */
  function initParticleBg() {
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-particles';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');

    let w, h;
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function getColor() {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      return dark
        ? { line: '74,158,255', dot: '100,180,255' }
        : { line: '26,58,92', dot: '40,80,120' };
    }

    // ===== 物理粒子系统 =====
    const N = 60;
    const CONNECT = 160;
    const MOUSE_RADIUS = 280;    // 鼠标影响范围
    const MOUSE_FORCE = 0.06;    // 鼠标引力强度
    const REPULSE = 400;         // 粒子间排斥力
    const REPULSE_RADIUS = 100;  // 排斥范围
    const DAMPING = 0.88;        // 速度阻尼（0-1，越小刹车越快）
    const MAX_SPEED = 10;

    const pts = [];
    for (let i = 0; i < N; i++) {
      pts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0, vy: 0,
      });
    }

    // 鼠标位置
    let mx = -9999, my = -9999;
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
    });
    document.addEventListener('mouseleave', function () {
      mx = -9999;
      my = -9999;
    });

    new MutationObserver(() => {}).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });

    function draw() {
      const c = getColor();
      ctx.clearRect(0, 0, w, h);

      // ===== 物理更新 =====
      for (let i = 0; i < N; i++) {
        const p = pts[i];

        // 1. 鼠标引力（快速吸引，范围大）
        if (mx > 0 && my > 0) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS && dist > 1) {
            const force = MOUSE_FORCE * (1 - dist / MOUSE_RADIUS);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // 2. 粒子间排斥（防止聚团）
        for (let j = i + 1; j < N; j++) {
          const other = pts[j];
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < REPULSE_RADIUS * REPULSE_RADIUS && dist2 > 1) {
            const dist = Math.sqrt(dist2);
            const strength = REPULSE / (dist2 + 10);
            const pushX = (dx / dist) * strength;
            const pushY = (dy / dist) * strength;
            p.vx += pushX;
            p.vy += pushY;
            other.vx -= pushX;
            other.vy -= pushY;
          }
        }

        // 3. 速度阻尼 + 限速
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED;
          p.vy = (p.vy / speed) * MAX_SPEED;
        }

        // 更新位置
        p.x += p.vx;
        p.y += p.vy;

        // 边界弹性反弹
        if (p.x < 0) { p.x = 0; p.vx *= -0.4; }
        if (p.x > w) { p.x = w; p.vx *= -0.4; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.4; }
        if (p.y > h) { p.y = h; p.vy *= -0.4; }
      }

      // ===== 绘制连线 =====
      for (let i = 0; i < N; i++) {
        const pi = pts[i];
        for (let j = i + 1; j < N; j++) {
          const pj = pts[j];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < CONNECT * CONNECT) {
            const dist = Math.sqrt(dist2);
            const alpha = (1 - dist / CONNECT) * 0.5;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.strokeStyle = `rgba(${c.line},${alpha})`;
            ctx.lineWidth = 1.5 + (1 - dist / CONNECT) * 1.5; // 近粗远细
            ctx.stroke();
          }
        }
      }

      // ===== 鼠标连线（鼠标作为网络结点） =====
      if (mx > 0 && my > 0) {
        for (const p of pts) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT) {
            const alpha = (1 - dist / CONNECT) * 0.7;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(${c.line},${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        // 鼠标光点
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.dot},0.6)`;
        ctx.fill();
      }

      // ===== 绘制粒子 =====
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.dot},0.8)`;
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    draw();
  }

  /* =====================================================
   * 第二部分：纳米粒子掉落特效
   * ===================================================== */
  const NANITE_CONFIG = {
    maxParticles: 60,
    spawnInterval: 100,
    particleLife: 1200,
    particleSizeMin: 1,
    particleSizeMax: 2.5,
    fallSpeed: 0.6,
    driftRange: 0.8,
    moveThreshold: 2,
    spawnCooldown: 100,
  };

  const HOVER_SELECTORS = [
    'a', 'button', '.card-widget', '.recent-post-item',
    '.tag-cloud a', '.menu-item a', '.social-icon',
    '.avatar-img', '.post-title-link', '.article-title',
    '.category-list a', '.tag-list a', '.archive-list a',
    '#card-toc .toc-link', '.card-archives a',
    '.flink-list a', '.msg-card',
  ].join(',');

  function getNaniteColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      base:   isDark ? '180, 210, 240' : '200, 220, 245',
      shine:  isDark ? '220, 235, 255' : '230, 240, 255',
      accent: isDark ? '150, 200, 255' : '100, 180, 230',
    };
  }

  let isOnInteractive = false;
  let hoverX = 0, hoverY = 0;
  let lastMouseX = 0, lastMouseY = 0;
  let isMoving = false;
  let moveTimer = null;

  document.addEventListener('mouseover', function (e) {
    const target = e.target.closest(HOVER_SELECTORS);
    if (target && !isOnInteractive) {
      isOnInteractive = true;
      document.body.classList.add('nanite-active');
    }
    if (target) {
      hoverX = e.clientX; hoverY = e.clientY;
      lastMouseX = e.clientX; lastMouseY = e.clientY;
    }
  });

  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(HOVER_SELECTORS)) {
      setTimeout(() => {
        if (!document.querySelector(HOVER_SELECTORS + ':hover')) {
          isOnInteractive = false;
          isMoving = false;
          document.body.classList.remove('nanite-active');
        }
      }, 60);
    }
  });

  document.addEventListener('mousemove', function (e) {
    if (!isOnInteractive) return;
    hoverX = e.clientX;
    hoverY = e.clientY;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= NANITE_CONFIG.moveThreshold) {
      if (!isMoving) isMoving = true;
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => { isMoving = false; }, 150);
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  let naniteParticles = [];
  let lastSpawn = 0;

  function createNanite(x, y) {
    if (naniteParticles.length >= NANITE_CONFIG.maxParticles) {
      const old = naniteParticles.shift();
      if (old.el && old.el.parentNode) old.el.parentNode.removeChild(old.el);
    }
    const c = getNaniteColors();
    const size = NANITE_CONFIG.particleSizeMin + Math.random() * NANITE_CONFIG.particleSizeMax;
    const el = document.createElement('div');
    el.className = 'nanite-particle';
    const variant = Math.random();
    if (variant < 0.4) {
      el.style.background = `rgba(${c.base}, ${0.6 + Math.random() * 0.4})`;
      el.style.boxShadow = `0 0 ${size * 1.5}px rgba(${c.base}, 0.2)`;
    } else if (variant < 0.7) {
      el.style.background = `rgba(${c.accent}, ${0.5 + Math.random() * 0.4})`;
    } else {
      el.style.background = `radial-gradient(circle at 30% 30%, rgba(${c.shine},0.9), rgba(${c.base},0.4))`;
    }
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = (x + (Math.random() - 0.5) * 6) + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    const speed = NANITE_CONFIG.fallSpeed * (0.5 + Math.random() * 0.8);
    const born = Date.now();
    const life = NANITE_CONFIG.particleLife * (0.4 + Math.random() * 0.6);
    naniteParticles.push({
      el, x: parseFloat(el.style.left), y,
      vx: (Math.random() - 0.5) * NANITE_CONFIG.driftRange * 0.5,
      vy: speed * (0.6 + Math.random()),
      born, life, size,
    });
  }

  function updateNanites(now) {
    for (let i = naniteParticles.length - 1; i >= 0; i--) {
      const p = naniteParticles[i];
      const age = now - p.born;
      const progress = age / p.life;
      if (progress >= 1) {
        if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
        naniteParticles.splice(i, 1);
        continue;
      }
      p.y += p.vy;
      p.x += p.vx * 0.2;
      p.el.style.left = p.x + 'px';
      p.el.style.top = p.y + 'px';
      p.el.style.opacity = 1 - Math.pow(progress, 0.8);
      p.el.style.transform = `scale(${1 - progress * 0.2})`;
    }
  }

  function trySpawnNanites(now) {
    if (!isOnInteractive || !isMoving) return;
    if (now - lastSpawn < NANITE_CONFIG.spawnCooldown) return;
    lastSpawn = now;
    const speedBonus = Math.min(Math.abs(hoverX - lastMouseX) + Math.abs(hoverY - lastMouseY), 20) / 20;
    const count = Math.floor(speedBonus) + 1;
    for (let i = 0; i < count; i++) {
      createNanite(hoverX + (Math.random() - 0.5) * 10, hoverY + (Math.random() - 0.5) * 4);
    }
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest(HOVER_SELECTORS)) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        createNanite(e.clientX + (Math.random() - 0.5) * 12, e.clientY + (Math.random() - 0.5) * 6);
      }, i * 25);
    }
  });

  /* =====================================================
   * 启动所有特效
   * ===================================================== */
  function init() {
    initParticleBg();
  }

  // 动画主循环
  function mainLoop() {
    trySpawnNanites(Date.now());
    updateNanites(Date.now());
    requestAnimationFrame(mainLoop);
  }

  init();
  mainLoop();

  // 性能保护
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      naniteParticles.forEach(p => {
        if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
      });
      naniteParticles = [];
      isMoving = false;
    }
  });

  // 主题变化监听 (仅记录)
  new MutationObserver(() => {}).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

})();
