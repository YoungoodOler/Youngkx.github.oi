import { absoluteUrl, siteOrigin } from '../lib/site';

type Comment = { nickname: string; content: string; createdAt: string };
type Original = Pick<Comment, 'nickname' | 'content'>;
type CommentEmail = { articleTitle: string; href: string; comment: Comment } & (
  | { kind: 'owner'; isReply: boolean; authorEmail: string | null; original: Original | null }
  | { kind: 'reply'; original: Original }
);

const logo = absoluteUrl('/youngkx-logo.png');
const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',Arial,sans-serif";
const emailDate = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Shanghai',
});
const characters: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => characters[character]);
}

function paragraph(content: string) {
  return `<p class="mail-text" style="margin:0 0 18px;color:#3d3d42;font-size:15px;line-height:1.75;overflow-wrap:anywhere;word-wrap:break-word;">${content}</p>`;
}

function infoRow(label: string, value: string) {
  return `<tr><th scope="row" width="86" align="left" valign="top" class="mail-muted" style="padding:4px 12px 4px 0;color:#636368;font-size:13px;font-weight:400;line-height:1.6;white-space:nowrap;">${label}</th>
    <td valign="top" class="mail-title" style="padding:4px 0;color:#19191b;font-size:14px;line-height:1.6;overflow-wrap:anywhere;word-wrap:break-word;">${escapeHtml(value)}</td></tr>`;
}

function commentBlock(label: string, content: string, quote = false) {
  const copy = escapeHtml(content).replace(/\r\n|[\r\n]/g, '<br>');
  const text = quote ? `<blockquote style="margin:0;padding:0;">${copy}</blockquote>` : copy;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;margin:0 0 16px;">
    <tr><td class="mail-panel mail-text${quote ? ' mail-quote' : ''}" bgcolor="#f4f4f5" style="background:#f4f4f5;border:1px solid #e5e5e7;${quote ? 'border-left:3px solid #a1a1a6;' : ''}border-radius:8px;padding:15px 16px;color:#29292d;font-size:15px;line-height:1.75;overflow-wrap:anywhere;word-wrap:break-word;word-break:break-word;">
      <div class="mail-muted" style="color:#636368;font-size:12px;font-weight:700;line-height:1.5;margin:0 0 6px;">${escapeHtml(label)}</div>${text}
    </td></tr>
  </table>`;
}

function emailLayout(
  title: string,
  content: string,
  href: string,
  button: string,
  year: string,
  closing?: string,
) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)} | Youngkx Blog</title>
  <style>
    @media screen and (max-width:480px) {
      .mail-gutter { padding:16px 10px !important; }
      .mail-pad { padding-left:20px !important; padding-right:20px !important; }
      .mail-heading { font-size:26px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .mail-bg { background-color:#111113 !important; }
      .mail-card { background-color:#1c1c1f !important; border-color:#3a3a40 !important; }
      .mail-panel { background-color:#29292e !important; border-color:#404048 !important; }
      .mail-quote { border-left-color:#85858d !important; }
      .mail-title { color:#f5f5f6 !important; }
      .mail-text { color:#e2e2e6 !important; }
      .mail-muted { color:#b9b9c2 !important; }
      .mail-rule { border-color:#3a3a40 !important; }
      .mail-button { background-color:#e9e9ec !important; }
      .mail-button a { color:#18181b !important; }
    }
  </style>
</head>
<body class="mail-bg" style="margin:0;padding:0;background:#f2f2f3;color:#19191b;font-family:${font};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="mail-bg" bgcolor="#f2f2f3" style="width:100%;background:#f2f2f3;">
    <tr><td align="center" class="mail-gutter" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="mail-card" bgcolor="#ffffff" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dedee1;border-radius:12px;border-spacing:0;">
        <tr><td class="mail-pad mail-rule" style="padding:22px 32px;border-bottom:1px solid #e5e5e7;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td width="36" height="36" valign="middle"><img src="${logo}" alt="Youngkx Blog Logo" width="36" height="36" style="display:block;width:36px;height:36px;border:0;border-radius:7px;color:#ffffff;background:#18181b;font-size:9px;line-height:12px;"></td>
            <td valign="middle" style="padding-left:12px;"><a href="${siteOrigin}/" class="mail-title" style="color:#19191b;text-decoration:none;font-family:${font};font-size:16px;font-weight:700;line-height:1.4;">Youngkx Blog</a></td>
          </tr></table>
        </td></tr>
        <tr><td class="mail-pad" style="padding:26px 32px 28px;font-family:${font};">
          <h1 class="mail-title mail-heading" style="margin:0 0 22px;color:#19191b;font-size:30px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
          ${content}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 0;"><tr>
            <td align="center" class="mail-button" bgcolor="#18181b" style="background:#18181b;border-radius:7px;mso-padding-alt:13px 20px;">
              <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 20px;mso-padding-alt:0;color:#ffffff;font-family:${font};font-size:14px;font-weight:700;line-height:1.4;text-decoration:none;">${button}</a>
            </td>
          </tr></table>
          ${closing ? `<p class="mail-muted" style="margin:18px 0 0;color:#636368;font-size:14px;line-height:1.6;">${escapeHtml(closing)}</p>` : ''}
        </td></tr>
        <tr><td class="mail-pad mail-rule mail-muted" style="padding:18px 32px 20px;border-top:1px solid #e5e5e7;color:#636368;font-family:${font};font-size:12px;line-height:1.7;">
          <a href="${siteOrigin}/" class="mail-text" style="color:#36363a;font-weight:700;text-decoration:underline;">youngkx.cn</a><br>
          © ${escapeHtml(year)} Youngkx Blog<br>此邮件由网站自动发送，请勿直接回复。
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderCommentEmail(input: CommentEmail) {
  const { articleTitle, comment, href } = input;
  const date = new Date(comment.createdAt);
  const time = `${emailDate.format(date)}（北京时间）`;
  const year = emailDate.formatToParts(date).find(({ type }) => type === 'year')?.value ?? '';
  const footer = `Youngkx Blog · ${siteOrigin}/\n© ${year} Youngkx Blog\n此邮件由网站自动发送，请勿直接回复。`;

  if (input.kind === 'owner') {
    const { original } = input;
    const title = input.isReply ? '收到一条新回复' : '收到一条新评论';
    const fields = [
      ['评论者', comment.nickname],
      ['邮箱', input.authorEmail ?? '未填写'],
      ['文章', articleTitle],
      ['发表时间', time],
    ];
    const originalContent = input.isReply
      ? commentBlock(
          original ? `回复给 ${original.nickname}` : '原留言',
          original?.content ?? '原留言已删除。',
          true,
        )
      : '';
    const content = `<table width="100%" cellspacing="0" cellpadding="0" border="0" aria-label="留言信息" style="width:100%;table-layout:fixed;margin:0 0 18px;">${fields.map(([label, value]) => infoRow(label, value)).join('')}</table>
      ${commentBlock(input.isReply ? '回复内容' : '评论内容', comment.content)}${originalContent}`;
    const quote = original
      ? `\n\n回复给 ${original.nickname}\n${original.content}`
      : input.isReply
        ? '\n\n原留言已删除。'
        : '';
    return {
      subject: `[Youngkx Blog] ${title}`,
      text: `${title}\n\n${fields.map(([label, value]) => `${label}：${value}`).join('\n')}\n\n${comment.content}${quote}\n\n查看评论：${href}\n\n${footer}`,
      html: emailLayout(title, content, href, '查看评论', year),
    };
  }

  const title = '你的评论收到了新回复';
  const { original } = input;
  const nickname = comment.nickname.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim() || '匿名访客';
  const greeting = `${original.nickname}，你好！`;
  const article = `你在《${articleTitle}》下的留言有了新回复。`;
  const thanks = '谢谢你参与讨论。';
  const content = `${paragraph(escapeHtml(greeting) + '<br>' + escapeHtml(article))}
    ${commentBlock('你的原评论', original.content, true)}
    ${paragraph(`<strong class="mail-title" style="color:#19191b;">${escapeHtml(nickname)}</strong><br><span class="mail-muted" style="color:#636368;font-size:13px;">${escapeHtml(time)}</span>`)}
    ${commentBlock('回复内容', comment.content)}`;
  return {
    subject: `[Youngkx Blog] 你的评论收到了来自 ${nickname} 的回复`,
    text: `${title}\n\n${greeting}\n${article}\n\n你的原评论\n${original.content}\n\n${nickname} · ${time}\n${comment.content}\n\n查看回复：${href}\n\n${thanks}\n\n${footer}`,
    html: emailLayout(title, content, href, '查看回复', year, thanks),
  };
}
