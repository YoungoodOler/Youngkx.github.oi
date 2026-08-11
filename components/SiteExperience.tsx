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
import { LazyMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';

const Scene = dynamic(() => import('./Scene'), { ssr: false });
const loadMotionFeatures = () => import('./motion-features').then((module) => module.default);

type Theme = 'dark' | 'light';
type TransitionMode = 'theme' | 'page-in' | 'page-out' | null;
type ActiveTransitionMode = Exclude<TransitionMode, null>;

const transitionWaveSize = 512;
const transitionWaveMask = transitionWaveSize - 1;
const transitionWaveScale = transitionWaveSize / (Math.PI * 2);
const transitionWave = (() => {
  const values = new Float32Array(transitionWaveSize);
  for (let index = 0; index < values.length; index += 1) {
    values[index] = Math.sin((index / transitionWaveSize) * Math.PI * 2);
  }
  return values;
})();

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

function isCompactTransition() {
  return window.innerWidth < 700 || window.matchMedia('(pointer: coarse)').matches;
}

function getTransitionDuration(mode: ActiveTransitionMode) {
  const compact = isCompactTransition();
  if (mode === 'theme') return compact ? 860 : 1120;
  if (mode === 'page-in') return compact ? 720 : 900;
  return compact ? 760 : 900;
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
    const compact = isCompactTransition();
    const ratio = compact ? 1 : Math.min(window.devicePixelRatio, 1.2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.scale(ratio, ratio);

    const count = compact
      ? 1050
      : Math.max(2400, Math.min(5200, Math.round((width * height) / 420)));
    const random = createRandom(width + height + (targetTheme === 'light' ? 37 : 71));
    const originX = origin.x * width;
    const originY = origin.y * height;
    const maximumDimension = Math.max(width, height);
    const darkPalette = ['242,246,252', '188,204,226', '132,155,186', '222,211,195'];
    const lightPalette = ['31,50,79', '70,95,128', '104,120,141', '119,109,97'];
    const palette = targetTheme === 'light' ? lightPalette : darkPalette;
    const startX = new Float32Array(count);
    const startY = new Float32Array(count);
    const targetX = new Float32Array(count);
    const targetY = new Float32Array(count);
    const coverDeltaX = new Float32Array(count);
    const coverDeltaY = new Float32Array(count);
    const exitDeltaX = new Float32Array(count);
    const exitDeltaY = new Float32Array(count);
    const coverNormalX = new Float32Array(count);
    const coverNormalY = new Float32Array(count);
    const releaseNormalX = new Float32Array(count);
    const releaseNormalY = new Float32Array(count);
    const coverCurve = new Float32Array(count);
    const releaseCurve = new Float32Array(count);
    const particleWidth = new Float32Array(count);
    const particleHeight = new Float32Array(count);
    const turbulenceSize = new Float32Array(count);
    const phaseX = new Uint16Array(count);
    const phaseY = new Uint16Array(count);
    const delay = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const initialX = random() * width;
      const initialY = random() * height;
      const originAngle = Math.atan2(initialY - originY, initialX - originX);
      const burstAngle = originAngle + (random() - 0.5) * 2.45;
      const bend = (random() - 0.5) * Math.PI * 2.4;
      const travelDistance = maximumDimension * (0.25 + random() * 0.82);
      const destinationX = initialX + Math.cos(burstAngle) * travelDistance;
      const destinationY = initialY + Math.sin(burstAngle) * travelDistance;
      const releaseAngle = burstAngle + (random() - 0.5) * 1.7;
      const releaseDistance = maximumDimension * (0.62 + random() * 0.72);
      const releasedX = destinationX + Math.cos(releaseAngle) * releaseDistance;
      const releasedY = destinationY + Math.sin(releaseAngle) * releaseDistance;
      const coverDistance = Math.max(
        1,
        Math.hypot(destinationX - initialX, destinationY - initialY),
      );
      const exitDistance = Math.max(
        1,
        Math.hypot(releasedX - destinationX, releasedY - destinationY),
      );
      const coverBend = maximumDimension * (0.08 + random() * 0.17) * (Math.sin(bend) < 0 ? -1 : 1);
      const releaseBend = maximumDimension * (0.1 + random() * 0.2) * (Math.cos(bend) < 0 ? -1 : 1);
      const size = 0.42 + random() * 2.55;
      const strength = 0.5 + random() * 0.5;
      const stretch = 0.55 + random() * 1.7;
      const renderedSize = size * (0.72 + strength * 0.28);
      startX[index] = initialX;
      startY[index] = initialY;
      targetX[index] = destinationX;
      targetY[index] = destinationY;
      coverDeltaX[index] = destinationX - initialX;
      coverDeltaY[index] = destinationY - initialY;
      exitDeltaX[index] = releasedX - destinationX;
      exitDeltaY[index] = releasedY - destinationY;
      coverNormalX[index] = -(destinationY - initialY) / coverDistance;
      coverNormalY[index] = (destinationX - initialX) / coverDistance;
      releaseNormalX[index] = -(releasedY - destinationY) / exitDistance;
      releaseNormalY[index] = (releasedX - destinationX) / exitDistance;
      coverCurve[index] = coverBend;
      releaseCurve[index] = releaseBend;
      particleWidth[index] = renderedSize * stretch;
      particleHeight[index] = renderedSize;
      turbulenceSize[index] = size;
      phaseX[index] = Math.floor(random() * transitionWaveSize);
      phaseY[index] = Math.floor(random() * transitionWaveSize);
      delay[index] = random() * 0.2;
    }
    const positions = new Float32Array(count * 5);
    for (let index = 0; index < count; index += 1) {
      const offset = index * 5;
      const startsFromRelease = mode === 'page-in';
      positions[offset] = startsFromRelease ? targetX[index] : startX[index];
      positions[offset + 1] = startsFromRelease ? targetY[index] : startY[index];
      positions[offset + 2] = positions[offset];
      positions[offset + 3] = positions[offset + 1];
    }

    const duration = getTransitionDuration(mode);
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

      const phaseDelayScale = covering ? 1 : 0.32;
      for (let index = 0; index < count; index += 1) {
        const particleDelay = delay[index] * phaseDelayScale;
        const local = Math.max(0, Math.min(1, (rawProgress - particleDelay) / (1 - particleDelay)));
        const remaining = 1 - local;
        const travel = covering ? 1 - remaining * remaining * remaining : local * (2 - local);
        const particleStartX = covering ? startX[index] : targetX[index];
        const particleStartY = covering ? startY[index] : targetY[index];
        const deltaX = covering ? coverDeltaX[index] : exitDeltaX[index];
        const deltaY = covering ? coverDeltaY[index] : exitDeltaY[index];
        const normalX = covering ? coverNormalX[index] : releaseNormalX[index];
        const normalY = covering ? coverNormalY[index] : releaseNormalY[index];
        const curve = covering ? coverCurve[index] : releaseCurve[index];
        const arcIndex = Math.min(transitionWaveSize / 2, (travel * 256 + 0.5) | 0);
        const arcWave = transitionWave[arcIndex];
        const arc = arcWave * curve;
        const turbulence = arcWave * (18 + turbulenceSize[index] * 14);
        const waveX =
          transitionWave[
            (phaseX[index] + ((travel * 15.5 * transitionWaveScale + 0.5) | 0)) & transitionWaveMask
          ];
        const waveY =
          transitionWave[
            (phaseY[index] + ((travel * 13.2 * transitionWaveScale + 0.5) | 0) + 128) &
              transitionWaveMask
          ];
        const x = particleStartX + deltaX * travel + normalX * arc + waveX * turbulence;
        const y = particleStartY + deltaY * travel + normalY * arc + waveY * turbulence;
        const trail = 0.012 + local * 0.025;
        const previousX = x - deltaX * trail;
        const previousY = y - deltaY * trail;
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
        for (let index = colorIndex; index < count; index += palette.length) {
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

      const particleAlpha =
        (covering ? smoothstep(rawProgress / 0.18) : 1 - smoothstep((rawProgress - 0.08) / 0.84)) *
        (targetTheme === 'light' ? 0.7 : 0.96);
      for (let colorIndex = 0; colorIndex < palette.length; colorIndex += 1) {
        context.beginPath();
        for (let index = colorIndex; index < count; index += palette.length) {
          const offset = index * 5;
          const local = positions[offset + 4];
          if (covering && local <= 0) continue;
          context.rect(
            positions[offset] - particleWidth[index] * 0.5,
            positions[offset + 1] - particleHeight[index] * 0.5,
            particleWidth[index],
            particleHeight[index],
          );
        }
        context.fillStyle = `rgba(${palette[colorIndex]},${particleAlpha})`;
        context.fill();
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
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('dark');
  const [transitionMode, setTransitionMode] = useState<TransitionMode>(null);
  const [transitionTheme, setTransitionTheme] = useState<Theme>('dark');
  const [transitionOrigin, setTransitionOrigin] = useState({ x: 0.86, y: 0.12 });
  const timers = useRef<number[]>([]);
  const transitionModeRef = useRef<TransitionMode>(null);
  const lastPointerOrigin = useRef({ x: 0.86, y: 0.12 });
  const pendingNavigation = useRef(false);
  const previousPathname = useRef(pathname);

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
      const pageInDuration = getTransitionDuration('page-in');
      timers.current.push(
        window.setTimeout(() => {
          document.documentElement.classList.remove('page-entering');
        }, 50),
      );
      timers.current.push(window.setTimeout(() => setMode(null), pageInDuration + 40));
    }

    return () => {
      clearTimers();
      document.documentElement.classList.remove('theme-changing', 'site-leaving');
    };
  }, [clearTimers, setMode]);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (!pendingNavigation.current) return;

    pendingNavigation.current = false;
    clearTimers();
    document.documentElement.classList.remove('site-leaving');
    document.documentElement.classList.add('page-entering');
    setMode('page-in');
    const pageInDuration = getTransitionDuration('page-in');
    timers.current.push(
      window.setTimeout(() => {
        document.documentElement.classList.remove('page-entering');
      }, 50),
    );
    timers.current.push(window.setTimeout(() => setMode(null), pageInDuration + 40));
  }, [clearTimers, pathname, setMode]);

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
    const themeDuration = getTransitionDuration('theme');

    timers.current.push(
      window.setTimeout(
        () => {
          setTheme(next);
          document.documentElement.dataset.theme = next;
          localStorage.setItem('youngkx-theme', next);
        },
        themeDuration / 2 - 20,
      ),
    );

    timers.current.push(
      window.setTimeout(() => {
        document.documentElement.classList.remove('theme-changing');
        setMode(null);
      }, themeDuration + 40),
    );
  }, [setMode, theme]);

  useEffect(() => {
    const navigateWithTransition = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        transitionModeRef.current
      )
        return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        anchor.dataset.transition === 'off'
      )
        return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const sameDocument =
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search;
      if (sameDocument) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      event.preventDefault();
      clearTimers();
      const origin =
        event.detail === 0
          ? lastPointerOrigin.current
          : {
              x: event.clientX / Math.max(1, window.innerWidth),
              y: event.clientY / Math.max(1, window.innerHeight),
            };
      lastPointerOrigin.current = origin;
      setTransitionOrigin(origin);
      setTransitionTheme(theme);
      setMode('page-out');
      document.documentElement.classList.add('site-leaving');
      pendingNavigation.current = true;

      const href = `${destination.pathname}${destination.search}${destination.hash}`;
      router.prefetch(href);
      const pageOutDuration = getTransitionDuration('page-out');

      timers.current.push(
        window.setTimeout(() => {
          router.push(href);
        }, pageOutDuration - 30),
      );
    };

    document.addEventListener('click', navigateWithTransition, true);
    return () => document.removeEventListener('click', navigateWithTransition, true);
  }, [clearTimers, router, setMode, theme]);

  return (
    <SiteExperienceContext.Provider value={{ theme, toggleTheme }}>
      <LazyMotion features={loadMotionFeatures} strict>
        <div className="scroll-morph global-particle-scene">
          <Scene theme={theme} showSubject={pathname === '/'} />
        </div>
        {children}
        {transitionMode && (
          <div
            className={`site-transition site-transition--${transitionMode} site-transition--to-${transitionTheme}`}
            aria-hidden="true"
          >
            <ParticleTransitionCanvas
              mode={transitionMode}
              targetTheme={transitionTheme}
              origin={transitionOrigin}
            />
          </div>
        )}
      </LazyMotion>
    </SiteExperienceContext.Provider>
  );
}
