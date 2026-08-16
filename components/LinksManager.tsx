'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  createEmptyUsefulLinksPayload,
  validateUsefulLinksPayload,
  type UsefulLink,
  type UsefulLinkGroup,
  type UsefulLinksPayload,
} from '@/lib/useful-links';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

type Notice = { tone: 'neutral' | 'success' | 'error'; text: string };

function authorizationHeaders(token: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function createId(prefix: 'group' | 'link') {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function LinksManager() {
  const [payload, setPayload] = useState<UsefulLinksPayload>(createEmptyUsefulLinksPayload);
  const [token, setToken] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>({
    tone: 'neutral',
    text: 'Loading the current directory.',
  });
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const storedToken = sessionStorage.getItem('youngkx-links-token') ?? '';
    setToken(storedToken);

    const load = async () => {
      try {
        const [linksResponse, authResponse] = await Promise.all([
          fetch('/api/links', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/links/admin', {
            cache: 'no-store',
            headers: authorizationHeaders(storedToken),
            signal: controller.signal,
          }),
        ]);
        const value = (await linksResponse.json()) as unknown;
        const validation = validateUsefulLinksPayload(value);
        if (validation.ok) setPayload(validation.data);
        setAuthorized(authResponse.ok);
        setNotice(
          authResponse.ok
            ? { tone: 'neutral', text: 'Directory loaded. Changes are not live until saved.' }
            : { tone: 'neutral', text: 'Enter the admin token to edit this directory.' },
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setNotice({ tone: 'error', text: 'Unable to load the link manager.' });
      } finally {
        if (!controller.signal.aborted) setCheckingAuth(false);
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    setCheckingAuth(true);
    try {
      const response = await fetch('/api/links/admin', {
        cache: 'no-store',
        headers: authorizationHeaders(token.trim()),
      });
      if (!response.ok) {
        setAuthorized(false);
        setNotice({ tone: 'error', text: 'The admin token is not valid.' });
        return;
      }
      sessionStorage.setItem('youngkx-links-token', token.trim());
      setAuthorized(true);
      setNotice({ tone: 'success', text: 'Manager unlocked for this browser tab.' });
    } catch {
      setNotice({ tone: 'error', text: 'Unable to verify the admin token.' });
    } finally {
      setCheckingAuth(false);
    }
  };

  const setGroups = (groups: UsefulLinkGroup[]) => {
    setPayload((current) => ({ ...current, groups }));
  };

  const addGroup = () => {
    setGroups([
      ...payload.groups,
      {
        id: createId('group'),
        title: 'New Collection',
        description: 'A collection of useful links.',
        links: [],
      },
    ]);
  };

  const updateGroup = (groupId: string, patch: Partial<UsefulLinkGroup>) => {
    setGroups(
      payload.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
    );
  };

  const addLink = (groupId: string) => {
    const link: UsefulLink = {
      id: createId('link'),
      title: '',
      href: '',
      label: 'Website',
      description: '',
    };
    setGroups(
      payload.groups.map((group) =>
        group.id === groupId ? { ...group, links: [...group.links, link] } : group,
      ),
    );
  };

  const updateLink = (groupId: string, linkId: string, patch: Partial<UsefulLink>) => {
    setGroups(
      payload.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              links: group.links.map((link) => (link.id === linkId ? { ...link, ...patch } : link)),
            }
          : group,
      ),
    );
  };

  const save = async () => {
    const validation = validateUsefulLinksPayload(payload);
    if (!validation.ok) {
      setNotice({ tone: 'error', text: validation.error });
      return;
    }
    setSaving(true);
    setNotice({ tone: 'neutral', text: 'Saving changes.' });
    try {
      const response = await fetch('/api/links', {
        method: 'PUT',
        headers: {
          ...authorizationHeaders(token.trim()),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation.data),
      });
      const value = (await response.json()) as unknown;
      if (!response.ok) {
        const message =
          typeof value === 'object' && value !== null && 'error' in value
            ? String(value.error)
            : 'Unable to save changes.';
        setNotice({ tone: 'error', text: message });
        return;
      }
      const saved = validateUsefulLinksPayload(value);
      if (saved.ok) setPayload(saved.data);
      setNotice({ tone: 'success', text: 'Saved. The public Links page is now updated.' });
    } catch {
      setNotice({ tone: 'error', text: 'Unable to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 256 * 1024) {
      setNotice({ tone: 'error', text: 'The JSON file must be smaller than 256 KiB.' });
      return;
    }
    try {
      const value = JSON.parse(await file.text()) as unknown;
      const validation = validateUsefulLinksPayload(value);
      if (!validation.ok) {
        setNotice({ tone: 'error', text: validation.error });
        return;
      }
      setPayload(validation.data);
      setNotice({ tone: 'success', text: 'JSON imported. Review it, then select Save Changes.' });
    } catch {
      setNotice({ tone: 'error', text: 'The selected file is not valid JSON.' });
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'youngkx-links.json';
    anchor.click();
    URL.revokeObjectURL(href);
    setNotice({ tone: 'success', text: 'A JSON backup has been downloaded.' });
  };

  return (
    <main className="categories-page links-manager-page">
      <SiteHeader navClassName="categories-nav" />

      <section className="categories-hero shell links-manager-hero">
        <div>
          <h1>Link Manager</h1>
          <p>Add, Describe, Reorder, Import, And Publish</p>
        </div>
      </section>

      <section className="links-manager shell">
        <header className="links-manager-toolbar">
          <div>
            <span>Private Workspace</span>
            <strong>
              {payload.groups.reduce((total, group) => total + group.links.length, 0)} Links
            </strong>
          </div>
          <div>
            <Link className="manager-button" href="/links/">
              View Page ↗
            </Link>
            {authorized && (
              <>
                <button className="manager-button" type="button" onClick={exportJson}>
                  Export JSON
                </button>
                <button
                  className="manager-button"
                  type="button"
                  onClick={() => importRef.current?.click()}
                >
                  Import JSON
                </button>
                <button
                  className="manager-button manager-button--primary"
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
          <input
            ref={importRef}
            className="manager-file-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importJson(event)}
          />
        </header>

        <p className={`manager-notice manager-notice--${notice.tone}`} aria-live="polite">
          {notice.text}
        </p>

        {!authorized ? (
          <form className="manager-unlock" onSubmit={(event) => void unlock(event)}>
            <label htmlFor="links-admin-token">Admin Token</label>
            <input
              id="links-admin-token"
              type="password"
              value={token}
              autoComplete="current-password"
              placeholder="Paste the production admin token"
              onChange={(event) => setToken(event.target.value)}
            />
            <button className="manager-button manager-button--primary" disabled={checkingAuth}>
              {checkingAuth ? 'Checking…' : 'Unlock Manager'}
            </button>
          </form>
        ) : (
          <div className="manager-groups">
            {payload.groups.map((group, groupIndex) => (
              <section className="manager-group" key={group.id}>
                <header>
                  <span>{String(groupIndex + 1).padStart(2, '0')}</span>
                  <div className="manager-fields manager-fields--group">
                    <label>
                      Group Title
                      <input
                        value={group.title}
                        maxLength={80}
                        onChange={(event) => updateGroup(group.id, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      Group Description
                      <input
                        value={group.description}
                        maxLength={240}
                        onChange={(event) =>
                          updateGroup(group.id, { description: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="manager-row-actions">
                    <button
                      type="button"
                      aria-label="Move group up"
                      disabled={groupIndex === 0}
                      onClick={() => setGroups(moveItem(payload.groups, groupIndex, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move group down"
                      disabled={groupIndex === payload.groups.length - 1}
                      onClick={() => setGroups(moveItem(payload.groups, groupIndex, 1))}
                    >
                      ↓
                    </button>
                    <button
                      className="manager-danger"
                      type="button"
                      onClick={() =>
                        setGroups(payload.groups.filter((item) => item.id !== group.id))
                      }
                    >
                      Delete
                    </button>
                  </div>
                </header>

                <div className="manager-links">
                  {group.links.map((link, linkIndex) => (
                    <article className="manager-link" key={link.id}>
                      <span>{String(linkIndex + 1).padStart(2, '0')}</span>
                      <div className="manager-fields">
                        <label>
                          Title
                          <input
                            value={link.title}
                            maxLength={120}
                            placeholder="Cloudflare Dashboard"
                            onChange={(event) =>
                              updateLink(group.id, link.id, { title: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          URL
                          <input
                            value={link.href}
                            inputMode="url"
                            placeholder="https://example.com"
                            onChange={(event) =>
                              updateLink(group.id, link.id, { href: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Short Label
                          <input
                            value={link.label}
                            maxLength={40}
                            placeholder="Tool"
                            onChange={(event) =>
                              updateLink(group.id, link.id, { label: event.target.value })
                            }
                          />
                        </label>
                        <label className="manager-field-wide">
                          Description
                          <textarea
                            value={link.description}
                            maxLength={320}
                            rows={2}
                            placeholder="What this link is useful for."
                            onChange={(event) =>
                              updateLink(group.id, link.id, { description: event.target.value })
                            }
                          />
                        </label>
                      </div>
                      <div className="manager-row-actions">
                        <button
                          type="button"
                          aria-label="Move link up"
                          disabled={linkIndex === 0}
                          onClick={() =>
                            updateGroup(group.id, { links: moveItem(group.links, linkIndex, -1) })
                          }
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label="Move link down"
                          disabled={linkIndex === group.links.length - 1}
                          onClick={() =>
                            updateGroup(group.id, { links: moveItem(group.links, linkIndex, 1) })
                          }
                        >
                          ↓
                        </button>
                        <button
                          className="manager-danger"
                          type="button"
                          onClick={() =>
                            updateGroup(group.id, {
                              links: group.links.filter((item) => item.id !== link.id),
                            })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                  <button
                    className="manager-add-link"
                    type="button"
                    onClick={() => addLink(group.id)}
                  >
                    + Add Link To {group.title}
                  </button>
                </div>
              </section>
            ))}

            <button className="manager-add-group" type="button" onClick={addGroup}>
              <span>+</span>
              <strong>
                {payload.groups.length ? 'Add Another Group' : 'Create Your First Group'}
              </strong>
              <small>Use groups for tools, reading, services, or anything else.</small>
            </button>
          </div>
        )}
      </section>

      <SiteFooter backHref="/links/" backLabel="返回链接页 ↗" />
    </main>
  );
}
