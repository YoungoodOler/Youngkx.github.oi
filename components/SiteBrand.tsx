'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function SiteBrand({ href, theme }: { href: string; theme: 'dark' | 'light' }) {
  const brandRef = useRef<HTMLAnchorElement>(null);
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
    brandRef.current?.dispatchEvent(new Event('sticker-palette-change'));
  }, [theme]);

  useEffect(() => {
    const brand = brandRef.current;
    if (!brand) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let controller: AbortController | undefined;

    const syncAnimation = () => {
      controller?.abort();
      if (preference.matches) return;
      const animation = new AbortController();
      controller = animation;
      import('./react-bits/sticker-peel')
        .then(({ mountStickerPeel }) =>
          mountStickerPeel(brand, () => themeRef.current, animation.signal),
        )
        .catch(() => {
          animation.abort();
        });
    };

    syncAnimation();
    preference.addEventListener('change', syncAnimation);
    return () => {
      preference.removeEventListener('change', syncAnimation);
      controller?.abort();
    };
  }, []);

  return <Link ref={brandRef} className="brand" href={href} aria-label="Youngkx Blog 首页" />;
}
