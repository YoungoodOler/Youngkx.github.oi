/* 纳米粒子掉落特效 — 银蓝极细版 */
(function () {
  'use strict';

  const CONFIG = {
    maxParticles: 80,
    particleLife: 1200,
    particleSizeMin: 1,
    particleSizeMax: 2.5,
    fallSpeed: 0.6,
    driftRange: 0.8,
    moveThreshold: 2,        // 鼠标移动 px 以上才算移动
    spawnCooldown: 100,      // 粒子生成冷却 (ms)
  };

  const HOVER_SELECTORS = [
    'a', 'button', '.card-widget', '.recent-post-item',
    '.tag-cloud a', '.menu-item a', '.social-icon',
    '.avatar-img', '.post-title-link', '.article-title',
    '.category-list a', '.tag-list a', '.archive-list a',
    '#card-toc .toc-link', '.card-archives a',
    '.flink-list a', '.msg-card',
  ].join(',');

  /* ===== 银蓝色金属配色 (冷暖适中) ===== */
  function getColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      base:   isDark ? '180, 210, 240' : '200, 220, 245',
      shine:  isDark ? '220, 235, 255' : '230, 240, 255',
      accent: isDark ? '150, 200, 255' : '100, 180, 230',
    };
  }

  /* ===== 鼠标状态 ===== */
  let isOnInteractive = false;
  let hoverX = 0, hoverY = 0;
  let lastMouseX = 0, lastMouseY = 0;
  let isMoving = false;
  let moveTimer = null;

  /* ===== Canvas Nest 控制 ===== */
  let canvasEl = null;

  function findCanvasNest() {
    const canvases = document.querySelectorAll('canvas');
    for (const c of canvases) {
      if (c.style.zIndex === '-1' || parseInt(c.style.zIndex) < 0) {
        canvasEl = c; break;
      }
    }
    if (!canvasEl && canvases.length > 0) canvasEl = canvases[0];
  }

  function setCanvasOpacity(opacity) {
    if (!canvasEl) return;
    canvasEl.style.transition = 'opacity 0.35s ease';
    canvasEl.style.opacity = String(opacity);
    canvasEl.style.pointerEvents = opacity < 1 ? 'none' : '';
  }

  /* ===== 悬停检测 ===== */
  document.addEventListener('mouseover', function (e) {
    const target = e.target.closest(HOVER_SELECTORS);
    if (target && !isOnInteractive) {
      isOnInteractive = true;
      document.body.classList.add('nanite-active');
      setCanvasOpacity(0.12);
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
          setCanvasOpacity(1);
        }
      }, 60);
    }
  });

  /* ===== 鼠标移动追踪 (仅当在交互元素上) ===== */
  document.addEventListener('mousemove', function (e) {
    if (!isOnInteractive) return;
    hoverX = e.clientX;
    hoverY = e.clientY;

    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= CONFIG.moveThreshold) {
      if (!isMoving) isMoving = true;
      // 重置不动计时器
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => { isMoving = false; }, 150);
    }

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  /* ===== 粒子系统 ===== */
  let particles = [];
  let lastSpawn = 0;

  function createNanite(x, y) {
    if (particles.length >= CONFIG.maxParticles) {
      const old = particles.shift();
      if (old.el && old.el.parentNode) old.el.parentNode.removeChild(old.el);
    }

    const c = getColors();
    // 1~2.5px 极细粒子
    const size = CONFIG.particleSizeMin + Math.random() * CONFIG.particleSizeMax;
    const el = document.createElement('div');
    el.className = 'nanite-particle';

    // 银蓝金属渐变
    const variant = Math.random();
    if (variant < 0.4) {
      // 银白
      el.style.background = `rgba(${c.base}, ${0.6 + Math.random() * 0.4})`;
      el.style.boxShadow = `0 0 ${size * 1.5}px rgba(${c.base}, 0.2)`;
    } else if (variant < 0.7) {
      // 浅蓝
      el.style.background = `rgba(${c.accent}, ${0.5 + Math.random() * 0.4})`;
      el.style.boxShadow = `0 0 ${size * 1.5}px rgba(${c.accent}, 0.15)`;
    } else {
      // 金属高光
      el.style.background = `radial-gradient(circle at 30% 30%, 
        rgba(${c.shine}, 0.9), 
        rgba(${c.base}, 0.4))`;
      el.style.boxShadow = `0 0 ${size * 2}px rgba(${c.base}, 0.15)`;
    }

    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = (x + (Math.random() - 0.5) * 6) + 'px';
    el.style.top = y + 'px';

    document.body.appendChild(el);

    const speed = CONFIG.fallSpeed * (0.5 + Math.random() * 0.8);
    const born = Date.now();
    const life = CONFIG.particleLife * (0.4 + Math.random() * 0.6);

    particles.push({
      el,
      x: parseFloat(el.style.left),
      y,
      vx: (Math.random() - 0.5) * CONFIG.driftRange * 0.5,
      vy: speed * (0.6 + Math.random()),
      born, life, size,
    });
  }

  function updateParticles(now) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = now - p.born;
      const progress = age / p.life;

      if (progress >= 1) {
        if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
        particles.splice(i, 1);
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

  function trySpawn(now) {
    if (!isOnInteractive || !isMoving) return;
    if (now - lastSpawn < CONFIG.spawnCooldown) return;
    lastSpawn = now;

    // 移动速度快时产生更多粒子
    const speedBonus = Math.min(
      Math.abs(hoverX - lastMouseX) + Math.abs(hoverY - lastMouseY),
      20
    ) / 20;
    const count = Math.floor(speedBonus) + 1;

    for (let i = 0; i < count; i++) {
      createNanite(
        hoverX + (Math.random() - 0.5) * 10,
        hoverY + (Math.random() - 0.5) * 4
      );
    }
  }

  /* ===== 点击爆发 ===== */
  document.addEventListener('click', function (e) {
    if (!e.target.closest(HOVER_SELECTORS)) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        createNanite(
          e.clientX + (Math.random() - 0.5) * 12,
          e.clientY + (Math.random() - 0.5) * 6
        );
      }, i * 25);
    }
  });

  /* ===== 初始化 ===== */
  function init() {
    findCanvasNest();
  }

  /* ===== 主循环 ===== */
  function animate() {
    trySpawn(Date.now());
    updateParticles(Date.now());
    requestAnimationFrame(animate);
  }

  init();
  animate();

  /* ===== 性能保护 ===== */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      particles.forEach(p => {
        if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
      });
      particles = [];
      isMoving = false;
      setCanvasOpacity(1);
    }
  });

  /* ===== 主题监听 ===== */
  new MutationObserver(() => {}).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

})();
