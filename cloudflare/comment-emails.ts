import { absoluteUrl } from '../lib/site';
import type { WorkerEnv } from './http';

type CommentEmailEnv = Pick<
  WorkerEnv,
  'ARTICLE_INTERACTIONS' | 'RESEND_API_KEY' | 'COMMENT_EMAIL_OWNER' | 'COMMENT_EMAIL_FROM'
>;

type PendingEmail = { id: number; commentId: number; kind: 'owner' | 'reply'; attempts: number };

async function sendCommentEmail(env: CommentEmailEnv, job: PendingEmail, apiKey: string) {
  const db = env.ARTICLE_INTERACTIONS;
  const comment = await db
    .prepare(
      `SELECT c.article_path AS articlePath, c.parent_id AS parentId, target.email AS replyEmail
       FROM article_comments c LEFT JOIN article_comments target ON target.id = c.reply_to_id
       WHERE c.id = ?`,
    )
    .bind(job.commentId)
    .first<{ articlePath: string; parentId: number | null; replyEmail: string | null }>();
  if (comment) {
    const to = job.kind === 'owner' ? env.COMMENT_EMAIL_OWNER : comment.replyEmail;
    if (to) {
      const message =
        job.kind === 'reply'
          ? '有人回复了你在 Youngkx 博客的留言。'
          : comment.parentId === null
            ? '你的博客收到了一条新评论。'
            : '你的博客收到了一条新回复。';
      const path = comment.articlePath.split('/').map(encodeURIComponent).join('/');
      const link = absoluteUrl(`${path}#article-comments-title`);
      const subject =
        job.kind === 'reply' ? 'Youngkx 博客 · 你的留言有新回复' : 'Youngkx 博客 · 新留言通知';
      let status: number | undefined;
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(8_000),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `youngkx-comment/${job.commentId}/${job.kind}`,
          },
          body: JSON.stringify({
            to: [to],
            from: `Youngkx 博客 <${env.COMMENT_EMAIL_FROM}>`,
            subject,
            text: `${message}\n\n查看文章评论：${link}`,
            html: `<p>${message}</p><p><a href="${link}">查看文章评论</a></p>`,
          }),
        });
        status = response.status;
        await response.body?.cancel();
      } catch {
        // This job remains in the outbox for the next attempt.
      }
      if (status === undefined || status < 200 || status >= 300) {
        console.error(
          JSON.stringify({
            message: 'comment email send failed',
            commentId: job.commentId,
            kind: job.kind,
            attempt: job.attempts,
            status,
          }),
        );
        return;
      }
    }
  }
  await db.prepare('DELETE FROM article_comment_email_outbox WHERE id = ?').bind(job.id).run();
}

export async function sendPendingCommentEmails(env: CommentEmailEnv, commentId?: number) {
  const db = env.ARTICLE_INTERACTIONS;
  if (commentId === undefined) {
    await db
      .prepare('DELETE FROM article_comment_email_outbox WHERE expires_at <= unixepoch()')
      .run();
  }
  if (!env.RESEND_API_KEY) return;
  // Claim each email before sending so concurrent dispatchers cannot both send it.
  const target = commentId === undefined ? '' : 'AND comment_id = ?';
  const { results } = await db
    .prepare(
      `UPDATE article_comment_email_outbox
       SET attempts = attempts + 1,
           ready_at = unixepoch() + CASE attempts WHEN 0 THEN 300 WHEN 1 THEN 900 ELSE 3600 END
       WHERE id IN (
         SELECT id FROM article_comment_email_outbox
         WHERE ready_at <= unixepoch() AND expires_at > unixepoch() ${target}
         ORDER BY ready_at, id LIMIT 20
       )
       RETURNING id, comment_id AS commentId, kind, attempts`,
    )
    .bind(...(commentId === undefined ? [] : [commentId]))
    .all<PendingEmail>();
  for (const job of results) {
    await sendCommentEmail(env, job, env.RESEND_API_KEY);
  }
}
