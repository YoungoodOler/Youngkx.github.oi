'use client';

import { useEffect, useRef } from 'react';

export default function ElectricLogo({
  theme,
  onReady,
}: {
  theme: 'dark' | 'light';
  onReady: () => void;
}) {
  const logoRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const logo = logoRef.current;
    if (!logo) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let animation: AbortController | undefined;

    const sync = () => {
      if (!visible || preference.matches) {
        animation?.abort();
        animation = undefined;
        if (preference.matches) onReady();
        return;
      }
      if (animation) return;
      const controller = new AbortController();
      animation = controller;
      import('./electric-logo/mount')
        .then(({ mountElectricLogo }) =>
          mountElectricLogo(logo, () => themeRef.current, controller.signal, onReady),
        )
        .then((mounted) => {
          if (!mounted && !controller.signal.aborted) onReady();
        })
        .catch(() => {
          if (!controller.signal.aborted) onReady();
          controller.abort();
        });
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(logo);
    preference.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', sync);
      animation?.abort();
    };
  }, [onReady]);

  return <div ref={logoRef} className="electric-logo" aria-hidden="true" />;
}
