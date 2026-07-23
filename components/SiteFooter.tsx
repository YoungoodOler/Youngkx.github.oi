'use client';

import { useEffect, useState } from 'react';

const launchedAt = new Date('2023-10-23T00:00:00+08:00').getTime();

function getRuntime() {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - launchedAt) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days} 天 ${hours} 时 ${minutes} 分 ${seconds} 秒`;
}

export default function SiteFooter({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  const [runtime, setRuntime] = useState('计算中');

  useEffect(() => {
    const update = () => setRuntime(getRuntime());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="footer site-footer shell">
      <span>Youngkx</span>
      <div className="site-status">
        <span>已运行：{runtime}</span>
        <span>最近更新：2026 年 7 月 24 日</span>
      </div>
      <a href={backHref}>{backLabel}</a>
    </footer>
  );
}
