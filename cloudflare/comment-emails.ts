import { absoluteUrl } from '../lib/site';
import { renderCommentEmail } from './comment-email-template';
import type { WorkerEnv } from './http';

type CommentEmailEnv = Pick<
  WorkerEnv,
  | 'ARTICLE_INTERACTIONS'
  | 'ASSETS'
  | 'RESEND_API_KEY'
  | 'COMMENT_EMAIL_OWNER'
  | 'COMMENT_EMAIL_FROM'
>;

type PendingEmail = { id: number; commentId: number; kind: 'owner' | 'reply'; attempts: number };

async function loadArticleTitles(assets: CommentEmailEnv['ASSETS']) {
  try {
    const response = await assets.fetch(new Request(absoluteUrl('/article-titles.json')));
    if (response.ok) return await response.json<Record<string, string>>();
    await response.body?.cancel();
  } catch {
    // An email can still link to the article if its title is unavailable.
  }
  return {};
}

async function sendCommentEmail(
  env: CommentEmailEnv,
  job: PendingEmail,
  apiKey: string,
  titles: Record<string, string>,
) {
  const db = env.ARTICLE_INTERACTIONS;
  const comment = await db
    .prepare(
      `SELECT c.article_path AS articlePath, c.parent_id AS parentId, c.created_at AS createdAt,
              c.nickname, c.content, c.email AS authorEmail, target.email AS replyEmail,
              target.nickname AS originalNickname, target.content AS originalContent
       FROM article_comments c LEFT JOIN article_comments target
       ON target.id = c.reply_to_id AND target.article_path = c.article_path
       WHERE c.id = ?`,
    )
    .bind(job.commentId)
    .first<{
      articlePath: string;
      parentId: number | null;
      createdAt: string;
      nickname: string;
      content: string;
      authorEmail: string | null;
      replyEmail: string | null;
      originalNickname: string | null;
      originalContent: string | null;
    }>();
  if (comment) {
    const to = job.kind === 'owner' ? env.COMMENT_EMAIL_OWNER : comment.replyEmail;
    const original =
      comment.originalNickname === null || comment.originalContent === null
        ? null
        : { nickname: comment.originalNickname, content: comment.originalContent };
    const path = comment.articlePath.split('/').map(encodeURIComponent).join('/');
    const details = {
      articleTitle: titles[comment.articlePath] ?? comment.articlePath,
      href: absoluteUrl(`${path}#comment-${job.commentId}`),
      comment,
    };
    const email =
      job.kind === 'owner'
        ? renderCommentEmail({
            ...details,
            kind: 'owner',
            isReply: comment.parentId !== null,
            authorEmail: comment.authorEmail,
            original,
          })
        : original && renderCommentEmail({ ...details, kind: 'reply', original });
    if (to && email) {
      let status: number | undefined;
      let transportError: string | undefined;
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          redirect: 'manual',
          signal: AbortSignal.timeout(8_000),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `youngkx-comment/${job.commentId}/${job.kind}`,
          },
          body: JSON.stringify({
            to: [to],
            from: `Youngkx Blog <${env.COMMENT_EMAIL_FROM}>`,
            ...email,
          }),
        });
        status = response.status;
        await response.body?.cancel();
      } catch (error) {
        transportError =
          error instanceof Error
            ? `${error.name}: ${error.message.replaceAll(apiKey, '[secret]').replaceAll(to, '[email]')}`.slice(
                0,
                240,
              )
            : 'Unknown transport error';
      }
      if (status === undefined || status < 200 || status >= 300) {
        console.error(
          JSON.stringify({
            message: 'comment email send failed',
            commentId: job.commentId,
            kind: job.kind,
            attempt: job.attempts,
            status,
            transportError,
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
  if (results.length === 0) return;
  const titles = await loadArticleTitles(env.ASSETS);
  for (const job of results) {
    await sendCommentEmail(env, job, env.RESEND_API_KEY, titles);
  }
}
