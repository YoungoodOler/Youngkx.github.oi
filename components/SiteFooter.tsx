'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AdminLoginForm, useAdminSession } from './AdminSession';
import { useSiteExperience } from './SiteExperience';

const launchedAt = new Date('2023-10-23T00:00:00+08:00').getTime();
const siteBuiltAt = process.env.NEXT_PUBLIC_SITE_BUILT_AT;
const siteUpdatedDate = siteBuiltAt
  ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeZone: 'Asia/Shanghai' }).format(
      new Date(siteBuiltAt),
    )
  : null;

function getRuntime() {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - launchedAt) / 1000));
  const totalDays = Math.floor(totalSeconds / 86400);
  const years = Math.floor(totalDays / 365);
  const days = totalDays % 365;
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${years} 年 ${days} 天 ${hours} 时 ${minutes} 分 ${seconds} 秒`;
}

export default function SiteFooter({
  backHref,
  backLabel,
  hideSignOut = false,
  showThemeToggle = true,
}: {
  backHref: string;
  backLabel: string;
  hideSignOut?: boolean;
  showThemeToggle?: boolean;
}) {
  const [runtime, setRuntime] = useState('计算中');
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const { authorized, checking, signOut } = useAdminSession();
  const { theme, toggleTheme } = useSiteExperience();

  const logout = async () => {
    setError('');
    try {
      await signOut();
      dialog.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '暂时无法退出，请稍后重试。');
    }
  };

  useEffect(() => {
    const update = () => setRuntime(getRuntime());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="footer site-footer shell">
      <div className="site-footer-brand">
        <span>Youngkx</span>
        <button
          className={authorized ? 'site-admin-entry' : 'site-admin-entry site-admin-entry--login'}
          type="button"
          aria-label={authorized ? undefined : '站长登录'}
          aria-haspopup="dialog"
          onClick={() => {
            setError('');
            dialog.current?.showModal();
          }}
        >
          {authorized ? '站长操作' : <span className="site-admin-lock" aria-hidden="true" />}
        </button>
      </div>
      <div className="site-status">
        <span>已运行：{runtime}</span>
        {siteUpdatedDate && (
          <span>
            最近更新：<time dateTime={siteBuiltAt}>{siteUpdatedDate}</time>
          </span>
        )}
      </div>
      <div className="site-footer-actions">
        {showThemeToggle && (
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="切换主题"
          >
            <span className="theme-icon" aria-hidden="true">
              {theme === 'dark' ? '☼' : '◐'}
            </span>
            <span className="theme-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        )}
        <Link href={backHref}>{backLabel}</Link>
      </div>
      <dialog ref={dialog} className="site-admin-dialog" aria-labelledby="site-admin-title">
        <header>
          <h2 id="site-admin-title">{authorized ? '站长操作' : '站长登录'}</h2>
          <button type="button" aria-label="关闭" onClick={() => dialog.current?.close()}>
            ×
          </button>
        </header>
        {authorized ? (
          <>
            <div className="site-admin-actions">
              <Link href="/links/manage/" onClick={() => dialog.current?.close()}>
                友链管理 ↗
              </Link>
              <Link href="/repo/manage/" onClick={() => dialog.current?.close()}>
                Repo 管理 ↗
              </Link>
              {!hideSignOut && (
                <button
                  className="admin-action"
                  type="button"
                  disabled={checking}
                  onClick={() => void logout()}
                >
                  退出登录
                </button>
              )}
            </div>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
          </>
        ) : (
          <AdminLoginForm />
        )}
      </dialog>
    </footer>
  );
}
