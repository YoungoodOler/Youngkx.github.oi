'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  createEmptyUsefulLinksPayload,
  validateUsefulLinksPayload,
  type UsefulLinkGroup,
  type UsefulLinksPayload,
} from '@/lib/useful-links';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

export default function LinksPage({ groups }: { groups: UsefulLinkGroup[] }) {
  const [directory, setDirectory] = useState<UsefulLinksPayload>({
    ...createEmptyUsefulLinksPayload(),
    groups,
  });
  const [loading, setLoading] = useState(true);
  const linkCount = useMemo(
    () => directory.groups.reduce((total, group) => total + group.links.length, 0),
    [directory.groups],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/links', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Links API returned ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const validation = validateUsefulLinksPayload(value);
        if (validation.ok) setDirectory(validation.data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Unable to load links directory.', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="categories-page links-page">
      <SiteHeader navClassName="categories-nav" />

      <section className="categories-hero shell">
        <m.div
          initial={{ opacity: 0, y: 72, filter: 'blur(18px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.92, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1>Useful Links</h1>
          <p>{linkCount} Links · A Personal Directory</p>
          <Link className="links-manage-link" href="/links/manage/">
            Manage Links ↗
          </Link>
        </m.div>
      </section>

      <section className="category-directory shell">
        {directory.groups.length === 0 ? (
          <m.section
            className="category-group"
            initial={{ opacity: 0, y: 68, filter: 'blur(15px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.82, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <header>
              <span>00</span>
              <div>
                <h2>Ready For Your Links</h2>
                <p>
                  {loading
                    ? 'Loading your personal directory.'
                    : 'Add the tools, references, and places you return to most.'}
                </p>
              </div>
              <b>0 Links</b>
            </header>
          </m.section>
        ) : (
          directory.groups.map((group, groupIndex) => (
            <m.section
              className="category-group"
              id={group.id}
              key={group.id}
              initial={{ opacity: 0, y: 68, filter: 'blur(15px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{
                duration: 0.82,
                delay: groupIndex * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <header>
                <span>{String(groupIndex + 1).padStart(2, '0')}</span>
                <div>
                  <h2>{group.title}</h2>
                  <p>{group.description}</p>
                </div>
                <b>{group.links.length} Links</b>
              </header>
              <div className="category-posts">
                {group.links.map((link) => (
                  <a href={link.href} key={link.id} target="_blank" rel="noreferrer">
                    <span>{link.label}</span>
                    <span className="useful-link-copy">
                      <strong>{link.title}</strong>
                      <small>{link.description}</small>
                    </span>
                    <i>↗</i>
                  </a>
                ))}
              </div>
            </m.section>
          ))
        )}
      </section>

      <SiteFooter backHref="/#top" backLabel="返回首页 ↗" />
    </main>
  );
}
