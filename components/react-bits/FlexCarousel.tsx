'use client';

import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { mountLiquidCarousel } from './flex-carousel/mount';
import './FlexCarousel.css';

export type FlexCarouselItem = {
  cover: StaticImageData;
  href: string;
  title: string;
  subtitle: string;
  label: string;
};

function Digits({ value }: { value: number }) {
  return (
    <span className="flex-carousel__digits">
      {String(value)
        .padStart(2, '0')
        .split('')
        .map((digit, index) => (
          <span key={index} className="flex-carousel__digit">
            <span
              className="flex-carousel__reel"
              style={{ transform: `translateY(${-Number(digit) * 10}%)` }}
            >
              {Array.from('0123456789', (number) => (
                <span key={number}>{number}</span>
              ))}
            </span>
          </span>
        ))}
    </span>
  );
}

export default function FlexCarousel({ items }: { items: readonly FlexCarouselItem[] }) {
  const router = useRouter();
  const trackId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLAnchorElement>(null);
  const itemsRef = useRef(items);
  const engineRef = useRef<ReturnType<typeof mountLiquidCarousel>>(null);
  const activeRef = useRef(0);
  const fallbackPointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressPosterClick = useRef(false);
  const [active, setActive] = useState(0);
  const [usingLiquid, setUsingLiquid] = useState(false);
  const count = items.length;
  const coverKey = items.map(({ cover }) => cover.src).join('|');
  const current = items[active] ?? items[0];

  const select = useCallback((index: number) => {
    activeRef.current = index;
    setActive(index);
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const container = containerRef.current;
    const surface = surfaceRef.current;
    if (!container || !surface || !coverKey || typeof IntersectionObserver === 'undefined') return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let alive = true;
    let inView = false;
    let mounting = false;

    const syncRenderer = () => {
      if (motion.matches) {
        engineRef.current?.destroy();
        engineRef.current = null;
        setUsingLiquid(false);
        return;
      }
      if (!inView || mounting || engineRef.current) return;

      mounting = true;
      void import('./flex-carousel/mount')
        .then(({ mountLiquidCarousel }) => {
          if (!alive || !inView || motion.matches) return;
          const covers = itemsRef.current.map(({ cover }) => cover);
          const index = Math.min(activeRef.current, covers.length - 1);
          if (index !== activeRef.current) select(index);

          engineRef.current = mountLiquidCarousel(surface, container, covers, index, {
            onChange: select,
            onSelect: (index, event) => {
              const item = itemsRef.current[index];
              if (!item) return;
              if (event.metaKey || event.ctrlKey) {
                window.open(item.href, '_blank', 'noopener');
              } else {
                router.push(item.href);
              }
            },
            onContextLost: () => {
              engineRef.current = null;
              setUsingLiquid(false);
            },
          });
          setUsingLiquid(Boolean(engineRef.current));
        })
        .catch(() => {
          if (alive) setUsingLiquid(false);
        })
        .finally(() => {
          mounting = false;
        });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        syncRenderer();
      },
      { rootMargin: '120px 0px' },
    );
    observer.observe(surface);
    motion.addEventListener('change', syncRenderer);
    return () => {
      alive = false;
      observer.disconnect();
      motion.removeEventListener('change', syncRenderer);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [coverKey, router, select]);

  if (!current) return null;

  function step(delta: number) {
    if (engineRef.current) engineRef.current.step(delta);
    else select((activeRef.current + delta + count) % count);
  }

  function goTo(index: number) {
    if (engineRef.current) engineRef.current.goTo(index);
    else select(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'ArrowLeft':
        step(-1);
        break;
      case 'ArrowRight':
        step(1);
        break;
      case 'Home':
        goTo(0);
        break;
      case 'End':
        goTo(count - 1);
        break;
      case 'Enter':
      case ' ':
        if (event.target !== event.currentTarget) return;
        captionRef.current?.click();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div
      ref={containerRef}
      className="flex-carousel"
      data-renderer={usingLiquid ? 'liquid' : 'poster'}
      style={
        {
          height: 'clamp(400px, 42vw, 540px)',
          overscrollBehaviorY: 'auto',
          '--flex-carousel-half': '25%',
        } as CSSProperties
      }
      role="region"
      aria-roledescription="轮播"
      aria-label="站点入口"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div
        id={trackId}
        ref={surfaceRef}
        style={{ position: 'absolute', inset: 0 }}
        aria-hidden="true"
      />
      {!usingLiquid && (
        <Link
          href={current.href}
          tabIndex={-1}
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'absolute',
            inset: '25% 6%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            suppressPosterClick.current = false;
            fallbackPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const pointer = fallbackPointer.current;
            if (!pointer || pointer.id !== event.pointerId) return;
            fallbackPointer.current = null;
            const dx = event.clientX - pointer.x;
            const dy = event.clientY - pointer.y;
            if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
            suppressPosterClick.current = true;
            step(dx < 0 ? 1 : -1);
          }}
          onPointerCancel={() => {
            fallbackPointer.current = null;
          }}
          onClick={(event) => {
            if (suppressPosterClick.current) event.preventDefault();
          }}
        >
          <Image
            src={current.cover}
            alt=""
            draggable={false}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
            }}
          />
        </Link>
      )}
      <div className="flex-carousel__caption">
        <Link
          ref={captionRef}
          href={current.href}
          aria-label={current.label}
          style={{ pointerEvents: 'auto' }}
        >
          <span key={current.cover.src} className="flex-carousel__title">
            <small className="flex-carousel__subtitle">{current.subtitle}</small>
          </span>
        </Link>
        <div className="manager-row-actions" style={{ pointerEvents: 'auto' }}>
          <button
            type="button"
            aria-label="上一张卡片"
            aria-controls={trackId}
            disabled={count < 2}
            onClick={() => step(-1)}
          >
            ←
          </button>
          <span className="flex-carousel__count" aria-hidden="true">
            <Digits value={active + 1} />
            <span className="flex-carousel__slash">/</span>
            <span>{String(count).padStart(2, '0')}</span>
          </span>
          <button
            type="button"
            aria-label="下一张卡片"
            aria-controls={trackId}
            disabled={count < 2}
            onClick={() => step(1)}
          >
            →
          </button>
        </div>
      </div>
      <div className="flex-carousel__live" aria-live="polite" aria-atomic="true">
        {`${current.title}，第 ${active + 1} 张，共 ${count} 张`}
      </div>
    </div>
  );
}
