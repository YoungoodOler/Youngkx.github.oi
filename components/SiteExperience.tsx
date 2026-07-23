'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import Scene from './Scene';

type Theme = 'dark' | 'light';
type TransitionMode = 'theme' | 'page-in' | 'page-out' | null;
type ActiveTransitionMode = Exclude<TransitionMode, null>;

type SiteExperienceValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const SiteExperienceContext = createContext<SiteExperienceValue | null>(null);

function resolveInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function createRandom(seed = 8431) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function smoothstep(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function ParticleTransitionCanvas({
  mode,
  targetTheme,
  origin,
}: {
  mode: ActiveTransitionMode;
  targetTheme: Theme;
  origin: { x: number; y: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio, 1.2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.scale(ratio, ratio);

    const count = width < 700
      ? 1600
      : Math.max(2400, Math.min(5200, Math.round((width * height) / 420)));
    const random = createRandom(width + height + (targetTheme === 'light' ? 37 : 71));
    const originX = origin.x * width;
    const originY = origin.y * height;
    const maximumDimension = Math.max(width, height);
    const darkPalette = ['242,246,252', '188,204,226', '132,155,186', '222,211,195'];
    const lightPalette = ['31,50,79', '70,95,128', '104,120,141', '119,109,97'];
    const palette = targetTheme === 'light' ? lightPalette : darkPalette;
    const particles = Array.from({ length: count }, (_, index) => {
      const startX = random() * width;
      const startY = random() * height;
      const originAngle = Math.atan2(startY - originY, startX - originX);
      const burstAngle = originAngle + (random() - 0.5) * 2.45;
      const bend = (random() - 0.5) * Math.PI * 2.4;
      const travelDistance = maximumDimension * (0.25 + random() * 0.82);
      const targetX = startX + Math.cos(burstAngle) * travelDistance;
      const targetY = startY + Math.sin(burstAngle) * travelDistance;
      const releaseAngle = burstAngle + (random() - 0.5) * 1.7;
      const releaseDistance = maximumDimension * (0.62 + random() * 0.72);
      return {
        startX,
        startY,
        targetX,
        targetY,
        controlAX: startX + Math.cos(burstAngle + bend) * travelDistance * (0.24 + random() * 0.2),
        controlAY: startY + Math.sin(burstAngle + bend) * travelDistance * (0.24 + random() * 0.2),
        controlBX: targetX - Math.cos(burstAngle - bend * 0.38) * travelDistance * (0.16 + random() * 0.2),
        controlBY: targetY - Math.sin(burstAngle - bend * 0.38) * travelDistance * (0.16 + random() * 0.2),
        releaseAX: targetX + Math.cos(releaseAngle - bend * 0.22) * releaseDistance * 0.2,
        releaseAY: targetY + Math.sin(releaseAngle - bend * 0.22) * releaseDistance * 0.2,
        releaseBX: targetX + Math.cos(releaseAngle + bend * 0.3) * releaseDistance * 0.62,
        releaseBY: targetY + Math.sin(releaseAngle + bend * 0.3) * releaseDistance * 0.62,
        exitX: targetX + Math.cos(releaseAngle) * releaseDistance,
        exitY: targetY + Math.sin(releaseAngle) * releaseDistance,
        size: 0.42 + random() * 2.55,
        strength: 0.5 + random() * 0.5,
        phase: random() * Math.PI * 2,
        delay: random() * 0.2,
        colorIndex: index % palette.length,
      };
    });
    const positions = new Float32Array(count * 5);

    const duration = mode === 'theme' ? 1400 : mode === 'page-in' ? 1100 : 1050;
    const startedAt = performance.now();
    let frame = 0;

    const drawPhase = (rawProgress: number, covering: boolean) => {
      const veilProgress = covering
        ? smoothstep((rawProgress - 0.66) / 0.34)
        : 1 - smoothstep(rawProgress / 0.62);
      const veilColor = targetTheme === 'light' ? '238, 240, 239' : '10, 13, 19';
      if (veilProgress > 0) {
        context.fillStyle = `rgba(${veilColor},${Math.min(1, veilProgress * 1.04)})`;
        context.fillRect(0, 0, width, height);
      }

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const delay = covering ? particle.delay : particle.delay * 0.32;
        const local = Math.max(0, Math.min(1, (rawProgress - delay) / (1 - delay)));
        const travel = 1 - Math.pow(1 - local, covering ? 2.7 : 2.25);
        const inverse = 1 - travel;
        const previousTravel = Math.max(0, travel - (0.018 + local * 0.052));
        const previousInverse = 1 - previousTravel;
        const startX = covering ? particle.startX : particle.targetX;
        const startY = covering ? particle.startY : particle.targetY;
        const controlAX = covering ? particle.controlAX : particle.releaseAX;
        const controlAY = covering ? particle.controlAY : particle.releaseAY;
        const controlBX = covering ? particle.controlBX : particle.releaseBX;
        const controlBY = covering ? particle.controlBY : particle.releaseBY;
        const endX = covering ? particle.targetX : particle.exitX;
        const endY = covering ? particle.targetY : particle.exitY;
        const turbulence = Math.sin(travel * Math.PI) * (18 + particle.size * 14);
        const x = inverse * inverse * inverse * startX
          + 3 * inverse * inverse * travel * controlAX
          + 3 * inverse * travel * travel * controlBX
          + travel * travel * travel * endX
          + Math.sin(particle.phase + travel * 15.5) * turbulence;
        const y = inverse * inverse * inverse * startY
          + 3 * inverse * inverse * travel * controlAY
          + 3 * inverse * travel * travel * controlBY
          + travel * travel * travel * endY
          + Math.cos(particle.phase * 1.37 + travel * 13.2) * turbulence;
        const previousTurbulence = Math.sin(previousTravel * Math.PI) * (18 + particle.size * 14);
        const previousX = previousInverse * previousInverse * previousInverse * startX
          + 3 * previousInverse * previousInverse * previousTravel * controlAX
          + 3 * previousInverse * previousTravel * previousTravel * controlBX
          + previousTravel * previousTravel * previousTravel * endX
          + Math.sin(particle.phase + previousTravel * 15.5) * previousTurbulence;
        const previousY = previousInverse * previousInverse * previousInverse * startY
          + 3 * previousInverse * previousInverse * previousTravel * controlAY
          + 3 * previousInverse * previousTravel * previousTravel * controlBY
          + previousTravel * previousTravel * previousTravel * endY
          + Math.cos(particle.phase * 1.37 + previousTravel * 13.2) * previousTurbulence;
        const offset = index * 5;
        positions[offset] = x;
        positions[offset + 1] = y;
        positions[offset + 2] = previousX;
        positions[offset + 3] = previousY;
        positions[offset + 4] = local;
      }

      context.globalCompositeOperation = targetTheme === 'light' ? 'source-over' : 'lighter';
      for (let colorIndex = 0; colorIndex < palette.length; colorIndex += 1) {
        context.beginPath();
        for (let index = 0; index < particles.length; index += 1) {
          const particle = particles[index];
          if (particle.colorIndex !== colorIndex) continue;
          const offset = index * 5;
          const local = positions[offset + 4];
          if ((covering && local <= 0) || local >= 0.995) continue;
          context.moveTo(positions[offset + 2], positions[offset + 3]);
          context.lineTo(positions[offset], positions[offset + 1]);
        }
        context.strokeStyle = `rgba(${palette[colorIndex]},${targetTheme === 'light' ? 0.22 : 0.34})`;
        context.lineWidth = 0.68 + colorIndex * 0.11;
        context.stroke();
      }

      for (let colorIndex = 0; colorIndex < palette.length; colorIndex += 1) {
        context.fillStyle = `rgb(${palette[colorIndex]})`;
        for (let index = 0; index < particles.length; index += 1) {
          const particle = particles[index];
          if (particle.colorIndex !== colorIndex) continue;
          const offset = index * 5;
          const local = positions[offset + 4];
          if (covering && local <= 0) continue;
          const alpha = covering
            ? smoothstep(local / 0.14)
            : 1 - smoothstep((local - 0.06) / 0.86);
          const flip = 0.35 + Math.abs(Math.cos(particle.phase + local * Math.PI * 4.4)) * 1.65;
          context.globalAlpha = alpha * particle.strength * (targetTheme === 'light' ? 0.7 : 0.96);
          context.fillRect(
            positions[offset] - particle.size * flip * 0.5,
            positions[offset + 1] - particle.size * 0.5,
            particle.size * flip,
            particle.size,
          );
        }
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
    };

    const render = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      context.clearRect(0, 0, width, height);

      if (mode === 'theme') {
        if (progress < 0.5) drawPhase(progress * 2, true);
        else drawPhase((progress - 0.5) * 2, false);
      } else {
        drawPhase(progress, mode === 'page-out');
      }

      if (progress < 1) frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [mode, origin, targetTheme]);

  return <canvas ref={canvasRef} className="site-transition-canvas" />;
}

export function useSiteExperience() {
  const value = useContext(SiteExperienceContext);
  if (!value) throw new Error('useSiteExperience must be used inside SiteExperience');
  return value;
}

export default function SiteExperience({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>('dark');
  const [transitionMode, setTransitionMode] = useState<TransitionMode>(null);
  const [transitionTheme, setTransitionTheme] = useState<Theme>('dark');
  const [transitionOrigin, setTransitionOrigin] = useState({ x: 0.86, y: 0.12 });
  const timers = useRef<number[]>([]);
  const transitionModeRef = useRef<TransitionMode>(null);
  const lastPointerOrigin = useRef({ x: 0.86, y: 0.12 });

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const setMode = useCallback((mode: TransitionMode) => {
    transitionModeRef.current = mode;
    setTransitionMode(mode);
  }, []);

  useEffect(() => {
    const initial = resolveInitialTheme();
    setTheme(initial);
    setTransitionTheme(initial);

    if (sessionStorage.getItem('youngkx-page-transition') === '1') {
      const savedOrigin = sessionStorage.getItem('youngkx-transition-origin');
      if (savedOrigin) {
        const [x, y] = savedOrigin.split(',').map(Number);
        if (Number.isFinite(x) && Number.isFinite(y)) setTransitionOrigin({ x, y });
      }
      sessionStorage.removeItem('youngkx-page-transition');
      sessionStorage.removeItem('youngkx-transition-origin');
      setMode('page-in');
      timers.current.push(window.setTimeout(() => {
        document.documentElement.classList.remove('page-entering');
      }, 50));
      timers.current.push(window.setTimeout(() => setMode(null), 1150));
    }

    return () => {
      clearTimers();
      document.documentElement.classList.remove('theme-changing', 'site-leaving');
    };
  }, [clearTimers, setMode]);

  useEffect(() => {
    const rememberPointer = (event: PointerEvent) => {
      lastPointerOrigin.current = {
        x: event.clientX / Math.max(1, window.innerWidth),
        y: event.clientY / Math.max(1, window.innerHeight),
      };
    };
    document.addEventListener('pointerdown', rememberPointer, { passive: true });
    return () => document.removeEventListener('pointerdown', rememberPointer);
  }, []);

  const toggleTheme = useCallback(() => {
    if (transitionModeRef.current) return;
    const next = theme === 'dark' ? 'light' : 'dark';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setTheme(next);
      setTransitionTheme(next);
      document.documentElement.dataset.theme = next;
      localStorage.setItem('youngkx-theme', next);
      return;
    }

    setTransitionTheme(next);
    setTransitionOrigin(lastPointerOrigin.current);
    setMode('theme');
    document.documentElement.classList.add('theme-changing');

    timers.current.push(window.setTimeout(() => {
      setTheme(next);
      document.documentElement.dataset.theme = next;
      localStorage.setItem('youngkx-theme', next);
    }, 690));

    timers.current.push(window.setTimeout(() => {
      document.documentElement.classList.remove('theme-changing');
      setMode(null);
    }, 1450));
  }, [setMode, theme]);

  useEffect(() => {
    const navigateWithTransition = (event: MouseEvent) => {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
        || transitionModeRef.current
      ) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (
        !anchor
        || anchor.target === '_blank'
        || anchor.hasAttribute('download')
        || anchor.dataset.transition === 'off'
      ) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const sameDocument = destination.pathname === window.location.pathname
        && destination.search === window.location.search;
      if (sameDocument) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      event.preventDefault();
      clearTimers();
      const origin = {
        x: event.clientX / Math.max(1, window.innerWidth),
        y: event.clientY / Math.max(1, window.innerHeight),
      };
      lastPointerOrigin.current = origin;
      setTransitionOrigin(origin);
      setTransitionTheme(theme);
      setMode('page-out');
      document.documentElement.classList.add('site-leaving');
      sessionStorage.setItem('youngkx-page-transition', '1');
      sessionStorage.setItem('youngkx-transition-origin', `${origin.x},${origin.y}`);

      timers.current.push(window.setTimeout(() => {
        window.location.assign(destination.href);
      }, 1070));
    };

    document.addEventListener('click', navigateWithTransition);
    return () => document.removeEventListener('click', navigateWithTransition);
  }, [clearTimers, setMode, theme]);

  return (
    <SiteExperienceContext.Provider value={{ theme, toggleTheme }}>
      <div className="scroll-morph global-particle-scene">
        <Scene theme={theme} showSubject={pathname === '/'} />
      </div>
      {children}
      {transitionMode && (
        <div
          className={`site-transition site-transition--${transitionMode} site-transition--to-${transitionTheme}`}
          aria-hidden="true"
        >
          <ParticleTransitionCanvas mode={transitionMode} targetTheme={transitionTheme} origin={transitionOrigin} />
        </div>
      )}
    </SiteExperienceContext.Provider>
  );
}
