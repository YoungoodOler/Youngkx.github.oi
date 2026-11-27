'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  createDefaultFriendLinksPayload,
  friendLinksPath,
  friendLinksTitle,
  organizeFriendLinks,
  validateUsefulLinksPayload,
  type UsefulLinksPayload,
} from '@/lib/useful-links';
import { useAdminSession } from './AdminSession';
import ArticleInteractions from './ArticleInteractions';
import SiteFooter from './SiteFooter';
import PageBackdrop from './PageBackdrop';
import SiteHeader from './SiteHeader';

const contactEmails = ['ykx756474427@outlook.com', 'ykx756474427@gmail.com'];

export default function LinksPage() {
  const { authorized } = useAdminSession();
  const [directory, setDirectory] = useState<UsefulLinksPayload>(createDefaultFriendLinksPayload);
  const [loadError, setLoadError] = useState(false);
  const groups = organizeFriendLinks(directory.groups);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/links', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Links API returned ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const validation = validateUsefulLinksPayload(value);
        if (!validation.ok) throw new Error(validation.error);
        setDirectory(validation.data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoadError(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="categories-page links-page">
      <PageBackdrop />
      <SiteHeader navClassName="categories-nav" resources />

      <section className="categories-hero shell">
        <div className="resource-hero-enter">
          <h1 className="resource-hero-title">{friendLinksTitle}</h1>
        </div>
      </section>

      <ArticleInteractions
        articlePath={friendLinksPath}
        layout={(guestbook, messages) => (
          <div className="friend-links-sheet shell">
            <div className="friend-links-directory">
              {groups.map((group) => (
                <section
                  className="friend-links-group"
                  key={group.id}
                  aria-labelledby={`links-tier-${group.id}`}
                >
                  <header className="friend-links-section-heading">
                    <h2 id={`links-tier-${group.id}`}>{group.title}</h2>
                    {authorized && group.id === 'youngkx' && (
                      <Link href="/links/manage/">管理友链 ↗</Link>
                    )}
                  </header>
                  {group.links.length === 0 ? (
                    <p>暂无链接。</p>
                  ) : (
                    <ul className="friend-links-grid" role="list">
                      {group.links.map((link) => (
                        <li key={link.id}>
                          <a
                            className="friend-link-card"
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span className="friend-link-copy">
                              <strong>{link.title}</strong>
                              <span>{link.description}</span>
                            </span>
                            {link.avatar && (
                              <Image
                                className="friend-link-avatar"
                                key={link.avatar}
                                src={link.avatar}
                                width={64}
                                height={64}
                                alt=""
                                unoptimized
                                referrerPolicy="no-referrer"
                                onError={(event) => {
                                  event.currentTarget.hidden = true;
                                }}
                              />
                            )}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
              {directory.ownerNote && (
                <p className="friend-links-owner-note">{directory.ownerNote}</p>
              )}
              {loadError && (
                <p className="friend-links-status" role="status">
                  暂时显示默认链接。
                </p>
              )}
            </div>

            <aside className="friend-links-sidebar">
              <section
                className="friend-links-contact"
                aria-labelledby="friend-links-contact-title"
              >
                <h2 id="friend-links-contact-title">Contact Me</h2>
                <address>
                  {contactEmails.map((email) => (
                    <a key={email} href={`mailto:${email}`}>
                      {email}
                      <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </address>
              </section>
              {guestbook}
            </aside>
            {messages}
          </div>
        )}
      />

      <SiteFooter backHref="/#top" backLabel="返回首页 ↗" />
    </main>
  );
}
