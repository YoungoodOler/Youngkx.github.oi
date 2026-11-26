'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  createEmptyUsefulLinksPayload,
  friendLinkTiers,
  maximumOwnerNoteLength,
  organizeFriendLinks,
  validateUsefulLinksPayload,
  type UsefulLink,
  type UsefulLinkGroup,
  type UsefulLinksPayload,
} from '@/lib/useful-links';
import { useAdminSession } from './AdminSession';
import PageBackdrop from './PageBackdrop';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

type Notice = { tone: 'neutral' | 'success' | 'error'; text: string };

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function LinksManager() {
  const { authorized, preview, checking, expire } = useAdminSession();
  const canManage = authorized || preview;
  const [payload, setPayload] = useState<UsefulLinksPayload>(createEmptyUsefulLinksPayload);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>({ tone: 'neutral', text: '正在加载友链…' });
  const importRef = useRef<HTMLInputElement>(null);
  const editingTitle = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canManage) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch('/api/links', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const validation = validateUsefulLinksPayload(await response.json());
        if (!response.ok || !validation.ok) throw new Error('Unable to load friend links.');
        if (controller.signal.aborted) return;
        setPayload({ ...validation.data, groups: organizeFriendLinks(validation.data.groups) });
        setLoaded(true);
        setNotice({ tone: 'neutral', text: '' });
      } catch {
        if (!controller.signal.aborted) {
          setNotice({ tone: 'error', text: '友链加载失败，请刷新后重试。' });
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [canManage]);

  useEffect(() => {
    if (editingLinkId) editingTitle.current?.focus();
  }, [editingLinkId]);

  useEffect(() => {
    if (canManage && loaded && window.location.hash === '#links-owner-note') {
      document.getElementById('links-owner-note')?.scrollIntoView({ block: 'start' });
    }
  }, [canManage, loaded]);

  const setGroups = (groups: UsefulLinkGroup[]) => {
    setPayload((current) => ({ ...current, groups }));
  };

  const updateGroup = (groupId: string, patch: Partial<UsefulLinkGroup>) => {
    setGroups(
      payload.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
    );
  };

  const addLink = (groupId: string) => {
    const link: UsefulLink = {
      id: crypto.randomUUID(),
      title: '',
      href: '',
      label: '博客',
      description: '',
    };
    setGroups(
      payload.groups.map((group) =>
        group.id === groupId ? { ...group, links: [...group.links, link] } : group,
      ),
    );
    setEditingLinkId(link.id);
  };

  const changeTier = (source: UsefulLinkGroup, link: UsefulLink, targetId: string) => {
    if (source.id === targetId) return;
    setGroups(
      payload.groups.map((group) => {
        if (group.id === source.id) {
          return { ...group, links: group.links.filter((item) => item.id !== link.id) };
        }
        if (group.id === targetId) return { ...group, links: [...group.links, link] };
        return group;
      }),
    );
  };

  const updateLink = (group: UsefulLinkGroup, linkId: string, patch: Partial<UsefulLink>) => {
    updateGroup(group.id, {
      links: group.links.map((link) => (link.id === linkId ? { ...link, ...patch } : link)),
    });
  };

  const save = async () => {
    const validation = validateUsefulLinksPayload(payload);
    if (!validation.ok) {
      setNotice({ tone: 'error', text: validation.error });
      return;
    }
    setSaving(true);
    setNotice({ tone: 'neutral', text: '正在保存…' });
    try {
      const response = await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const value = (await response.json()) as unknown;
      if (!response.ok) {
        if (response.status === 401) expire();
        throw new Error(
          typeof value === 'object' && value !== null && 'error' in value
            ? String(value.error)
            : '保存失败，请重试。',
        );
      }
      const saved = validateUsefulLinksPayload(value);
      if (!saved.ok) throw new Error(saved.error);
      setPayload(saved.data);
      setNotice({ tone: 'success', text: '已保存更改。' });
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : '保存失败，请重试。',
      });
    } finally {
      setSaving(false);
    }
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || saving) return;
    if (file.size > 256 * 1024) {
      setNotice({ tone: 'error', text: 'JSON 文件不能超过 256 KiB。' });
      return;
    }
    try {
      const validation = validateUsefulLinksPayload(JSON.parse(await file.text()));
      if (!validation.ok) {
        setNotice({ tone: 'error', text: validation.error });
        return;
      }
      setPayload({ ...validation.data, groups: organizeFriendLinks(validation.data.groups) });
      setEditingLinkId(null);
      setNotice({ tone: 'success', text: '已导入，检查后点击保存。' });
    } catch {
      setNotice({ tone: 'error', text: '所选文件不是有效的 JSON。' });
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'youngkx-friend-links.json';
    anchor.click();
    URL.revokeObjectURL(href);
    setNotice({ tone: 'success', text: '已下载 JSON 备份。' });
  };

  return (
    <main className="categories-page links-manager-page">
      <PageBackdrop />
      <SiteHeader navClassName="categories-nav" resources />

      <section className="categories-hero shell links-manager-hero">
        <h1>友链管理</h1>
      </section>

      <section className="links-editor shell" aria-label="友链编辑器">
        <header className="links-editor-toolbar">
          {canManage && loaded && (
            <>
              <button
                className="manager-button manager-button--primary"
                type="button"
                disabled={saving}
                onClick={() => addLink('friend-links')}
              >
                + 新增站点
              </button>
              <button
                className="manager-button"
                type="button"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? '正在保存…' : '保存更改'}
              </button>
              <details className="links-editor-backup">
                <summary>备份</summary>
                <div>
                  <button
                    className="manager-button"
                    type="button"
                    disabled={saving}
                    onClick={exportJson}
                  >
                    导出 JSON
                  </button>
                  <button
                    className="manager-button"
                    type="button"
                    disabled={saving}
                    onClick={() => importRef.current?.click()}
                  >
                    导入 JSON
                  </button>
                </div>
              </details>
            </>
          )}
          <Link className="links-editor-view" href="/links/">
            查看友链页 ↗
          </Link>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importJson(event)}
            hidden
          />
        </header>

        {!canManage && !checking && <p className="links-editor-status">请从页脚的站长入口登录。</p>}
        {canManage && (
          <p className={`links-editor-status links-editor-status--${notice.tone}`} role="status">
            {notice.text}
          </p>
        )}

        {canManage && loaded && (
          <fieldset className="links-editor-content" aria-label="编辑友链和手记" disabled={saving}>
            <section className="links-editor-sites" aria-labelledby="links-editor-sites-title">
              <header className="friend-links-section-heading">
                <h2 id="links-editor-sites-title">站点</h2>
              </header>
              {payload.groups.map((group) => (
                <section className="links-editor-group" key={group.id}>
                  <header>
                    <h3>{group.title || '未命名分组'}</h3>
                    <button
                      className="links-editor-text-button"
                      type="button"
                      onClick={() => addLink(group.id)}
                    >
                      + 新增
                    </button>
                  </header>

                  {group.links.map((link, linkIndex) => (
                    <article className="links-editor-site" key={link.id}>
                      <button
                        className="links-editor-site-toggle"
                        type="button"
                        aria-expanded={editingLinkId === link.id}
                        onClick={() => setEditingLinkId(editingLinkId === link.id ? null : link.id)}
                      >
                        <span>
                          <strong>{link.title || '新站点'}</strong>
                          {link.href && <small>{link.href}</small>}
                        </span>
                        <span>{editingLinkId === link.id ? '收起' : '编辑'}</span>
                      </button>
                      {editingLinkId === link.id && (
                        <div className="links-editor-site-fields">
                          <div className="manager-fields">
                            <label>
                              站点名称
                              <input
                                ref={editingTitle}
                                value={link.title}
                                maxLength={120}
                                onChange={(event) =>
                                  updateLink(group, link.id, { title: event.target.value })
                                }
                              />
                            </label>
                            <label>
                              站点网址
                              <input
                                value={link.href}
                                inputMode="url"
                                placeholder="https://example.com/"
                                onChange={(event) =>
                                  updateLink(group, link.id, { href: event.target.value })
                                }
                              />
                            </label>
                            <label>
                              头像网址（选填）
                              <input
                                value={link.avatar ?? ''}
                                inputMode="url"
                                placeholder="https://example.com/avatar.png"
                                maxLength={2048}
                                onChange={(event) =>
                                  updateLink(group, link.id, { avatar: event.target.value })
                                }
                              />
                            </label>
                            <label>
                              标签
                              <input
                                value={link.label}
                                maxLength={40}
                                onChange={(event) =>
                                  updateLink(group, link.id, { label: event.target.value })
                                }
                              />
                            </label>
                            <label>
                              分组
                              <select
                                aria-label="分组"
                                value={group.id}
                                onChange={(event) => changeTier(group, link, event.target.value)}
                              >
                                {friendLinkTiers.map((tier) => (
                                  <option key={tier.id} value={tier.id}>
                                    {tier.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="manager-field-wide">
                              站点简介
                              <textarea
                                value={link.description}
                                maxLength={320}
                                rows={2}
                                onChange={(event) =>
                                  updateLink(group, link.id, { description: event.target.value })
                                }
                              />
                            </label>
                          </div>
                          <div className="links-editor-row-actions">
                            <button
                              type="button"
                              aria-label="向上移动友链"
                              disabled={linkIndex === 0}
                              onClick={() =>
                                updateGroup(group.id, {
                                  links: moveItem(group.links, linkIndex, -1),
                                })
                              }
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-label="向下移动友链"
                              disabled={linkIndex === group.links.length - 1}
                              onClick={() =>
                                updateGroup(group.id, {
                                  links: moveItem(group.links, linkIndex, 1),
                                })
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
                              删除站点
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </section>
              ))}
            </section>

            <section className="links-manager-note" id="links-owner-note">
              <div className="manager-fields">
                <label className="manager-field-wide">
                  站长手记
                  <textarea
                    value={payload.ownerNote ?? ''}
                    maxLength={maximumOwnerNoteLength}
                    placeholder="写几句想留在友链页的话。"
                    rows={6}
                    onChange={(event) => {
                      const ownerNote = event.currentTarget.value;
                      setPayload((current) => ({ ...current, ownerNote }));
                    }}
                  />
                </label>
              </div>
              <p>留空时公开页面隐藏手记。</p>
            </section>
          </fieldset>
        )}
      </section>

      <SiteFooter backHref="/links/" backLabel="返回友链页 ↗" hideSignOut />
    </main>
  );
}
