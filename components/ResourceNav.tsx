'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ResourceNav() {
  const section = usePathname()?.split('/')[1];
  return (
    <nav className="resource-nav" aria-label="资源导航">
      <Link href="/articles/" aria-current={section === 'articles' ? 'page' : undefined}>
        <span className="nav-link-label">Article Archive</span>
      </Link>
      <Link href="/categories/" aria-current={section === 'categories' ? 'page' : undefined}>
        <span className="nav-link-label">Topic Archive</span>
      </Link>
      <Link href="/links/" aria-current={section === 'links' ? 'page' : undefined}>
        <span className="nav-link-label">Links</span>
      </Link>
      <Link href="/repo/" aria-current={section === 'repo' ? 'page' : undefined}>
        <span className="nav-link-label">Repo</span>
      </Link>
    </nav>
  );
}
