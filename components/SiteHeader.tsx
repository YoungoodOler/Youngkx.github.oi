'use client';

import Link from 'next/link';
import { useSiteExperience } from './SiteExperience';
import ResourceNav from './ResourceNav';
import SiteBrand from './SiteBrand';

export default function SiteHeader() {
  const { theme } = useSiteExperience();

  return (
    <header className="nav shell inner-header">
      <SiteBrand href="/#top" theme={theme} />
      <nav className="nav-links" aria-label="主导航">
        <Link href="/#top">
          <span className="nav-link-label">Home</span>
        </Link>
      </nav>
      <ResourceNav />
    </header>
  );
}
