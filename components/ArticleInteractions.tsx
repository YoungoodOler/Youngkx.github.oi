'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  maximumCommentLength,
  maximumNicknameLength,
  type ArticleComment,
  type ArticleInteractions as Interactions,
  type ArticleReplies,
  type PublishedComment,
} from '@/lib/article-interactions';

class InteractionError extends Error {}

async function interactionRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
    ...init,
  });
  const payload = await response.json();
  if (!response.ok) throw new InteractionError(payload.error || '操作失败，请稍后再试。');
  return payload as T;
}

function errorMessage(error: unknown) {
  if (error instanceof InteractionError) {
    return error.message;
  }
  return '暂时无法连接，请稍后重试。你的评论内容会保留在输入框中。';
}

function commentDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function CommentDetails({ comment, reply }: { comment: ArticleComment; reply?: boolean }) {
  return (
    <>
      <div className="article-comment-avatar" aria-hidden="true">
        {Array.from(comment.nickname)[0]}
      </div>
      <div className="article-comment-body">
        <header>
          <strong>{comment.nickname}</strong>
          <time dateTime={comment.createdAt}>{commentDate(comment.createdAt)}</time>
        </header>
        <p>
          {reply && comment.replyTo && (
            <span className="article-reply-to">回复 @{comment.replyTo}： </span>
          )}
          {comment.content}
        </p>
      </div>
    </>
  );
}

function CommentThread({
  comment,
  query,
  onPublished,
}: {
  comment: ArticleComment;
  query: string;
  onPublished: (result: PublishedComment) => void;
}) {
  const [replies, setReplies] = useState<ArticleComment[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<ArticleComment | null>(null);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [website, setWebsite] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    try {
      setNickname(
        (localStorage.getItem('youngkx-comment-nickname') ?? '').slice(0, maximumNicknameLength),
      );
    } catch {
      /* Optional browser storage. */
    }
  }, []);

  const loadReplies = async (before?: number) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await interactionRequest<ArticleReplies>(
        `/api/articles/replies?${query}&parent=${comment.id}${before ? `&before=${before}` : ''}`,
      );
      setReplies((current) =>
        before
          ? [
              ...current,
              ...result.replies.filter(
                (reply) => !current.some((existing) => existing.id === reply.id),
              ),
            ]
          : result.replies,
      );
      setNextCursor(result.nextCursor);
      setExpanded(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  };

  const openReply = (selected: ArticleComment) => {
    setTarget(selected);
    setNotice('');
    setError('');
    requestId.current = null;
    if (!expanded && comment.replyCount > 0) void loadReplies();
    else setExpanded(true);
  };

  const submitReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target || posting || loading || !content.trim()) return;
    setPosting(true);
    setError('');
    try {
      requestId.current ??= crypto.randomUUID();
      const result = await interactionRequest<PublishedComment>(`/api/articles/comments?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          content,
          website,
          requestId: requestId.current,
          replyToId: target.id,
        }),
      });
      setReplies((current) => [
        result.comment,
        ...current.filter((reply) => reply.id !== result.comment.id),
      ]);
      setExpanded(true);
      onPublished(result);
      setContent('');
      setTarget(null);
      requestId.current = null;
      setNotice('回复已发布。');
      try {
        localStorage.setItem('youngkx-comment-nickname', nickname.trim());
      } catch {
        /* Optional browser storage. */
      }
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPosting(false);
    }
  };

  const formId = `reply-${comment.id}`;
  return (
    <li className="article-comment-thread">
      <div className="article-comment">
        <CommentDetails comment={comment} />
      </div>
      <div className="article-comment-actions">
        <button
          type="button"
          disabled={posting}
          onClick={() => openReply(comment)}
          aria-label={`回复 ${comment.nickname}`}
        >
          回复
        </button>
        {comment.replyCount > 0 && (
          <button
            type="button"
            disabled={loading || posting}
            aria-expanded={expanded}
            onClick={() => (expanded ? setExpanded(false) : void loadReplies())}
          >
            {loading ? '正在加载…' : expanded ? '收起回复' : `查看 ${comment.replyCount} 条回复`}
          </button>
        )}
      </div>
      {expanded && replies.length > 0 && (
        <ol className="article-reply-list" aria-label={`${comment.nickname} 的评论回复`}>
          {replies.map((reply) => (
            <li key={reply.id}>
              <div className="article-comment">
                <CommentDetails comment={reply} reply />
              </div>
              <div className="article-comment-actions">
                <button
                  type="button"
                  disabled={posting}
                  onClick={() => openReply(reply)}
                  aria-label={`回复 ${reply.nickname}`}
                >
                  回复
                </button>
              </div>
            </li>
          ))}
          {nextCursor && (
            <li>
              <button
                className="article-comments-more"
                type="button"
                disabled={loading || posting}
                onClick={() => void loadReplies(nextCursor)}
              >
                {loading ? '正在加载…' : '加载更多回复 ↓'}
              </button>
            </li>
          )}
        </ol>
      )}
      {target && (
        <form
          className="article-comment-form article-reply-form"
          onSubmit={submitReply}
          aria-label={`回复 ${target.nickname}`}
        >
          <div className="article-reply-form-heading">
            <span>回复 @{target.nickname}</span>
            <button type="button" disabled={posting} onClick={() => setTarget(null)}>
              取消回复
            </button>
          </div>
          <label htmlFor={`${formId}-nickname`}>
            用户名 <span>选填，留空为匿名访客</span>
          </label>
          <input
            id={`${formId}-nickname`}
            name="nickname"
            autoComplete="nickname"
            maxLength={maximumNicknameLength}
            placeholder="输入显示给大家的名字"
            value={nickname}
            disabled={posting}
            onChange={(event) => {
              setNickname(event.target.value);
              requestId.current = null;
            }}
          />
          <label htmlFor={`${formId}-content`}>回复内容</label>
          <textarea
            id={`${formId}-content`}
            name="content"
            rows={3}
            maxLength={maximumCommentLength}
            required
            value={content}
            disabled={posting}
            placeholder="写下你的回复……"
            onChange={(event) => {
              setContent(event.target.value);
              requestId.current = null;
            }}
          />
          <div className="comment-honeypot" aria-hidden="true">
            <label htmlFor={`${formId}-website`}>Website</label>
            <input
              id={`${formId}-website`}
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
          <div className="article-comment-form-footer">
            <p>
              友善交流，回复公开展示。
              <span>
                {content.length} / {maximumCommentLength}
              </span>
            </p>
            <button
              className="article-comment-submit"
              type="submit"
              disabled={posting || loading || !content.trim()}
            >
              {posting ? '正在发布…' : '发布回复'} <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="interaction-error" role="alert">
          {error}
        </p>
      )}
      <div className="interaction-feedback" aria-live="polite" role="status">
        {notice}
      </div>
    </li>
  );
}

export default function ArticleInteractions({ articlePath }: { articlePath: string }) {
  const query = new URLSearchParams({ article: articlePath }).toString();
  const [data, setData] = useState<Interactions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [liking, setLiking] = useState(false);
  const [posting, setPosting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [website, setWebsite] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const requestId = useRef<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setLoadError('');
      try {
        const result = await interactionRequest<Interactions>(
          `/api/articles/interactions?${query}`,
          {
            signal: signal
              ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
              : AbortSignal.timeout(15_000),
          },
        );
        if (!signal?.aborted) setData(result);
      } catch (error) {
        if (!signal?.aborted) setLoadError(errorMessage(error));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    try {
      setNickname(
        (localStorage.getItem('youngkx-comment-nickname') ?? '').slice(0, maximumNicknameLength),
      );
    } catch {
      // Commenting also works when browser storage is disabled.
    }
    return () => controller.abort();
  }, [load]);

  const toggleLike = async () => {
    if (!data || liking) return;
    setLiking(true);
    setActionError('');
    setNotice('');
    try {
      const result = await interactionRequest<{ likes: number; liked: boolean }>(
        `/api/articles/like?${query}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ liked: !data.liked }),
        },
      );
      setData((current) => (current ? { ...current, ...result } : current));
      setNotice(result.liked ? '谢谢你的喜欢。' : '已取消点赞。');
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setLiking(false);
    }
  };

  const postComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (posting || !content.trim()) return;
    setPosting(true);
    setActionError('');
    setNotice('');
    try {
      requestId.current ??= crypto.randomUUID();
      const result = await interactionRequest<PublishedComment>(`/api/articles/comments?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, content, website, requestId: requestId.current }),
      });
      setData((current) =>
        current
          ? {
              ...current,
              comments: [
                result.comment,
                ...current.comments.filter((comment) => comment.id !== result.comment.id),
              ],
              commentCount: result.commentCount,
            }
          : current,
      );
      setContent('');
      requestId.current = null;
      setNotice('评论已发布，感谢分享你的想法。');
      try {
        localStorage.setItem('youngkx-comment-nickname', nickname.trim());
      } catch {
        // Remembering a nickname is optional.
      }
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  const loadMore = async () => {
    if (!data?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setActionError('');
    try {
      const result = await interactionRequest<Interactions>(
        `/api/articles/interactions?${query}&before=${data.nextCursor}`,
      );
      setData((current) =>
        current
          ? {
              ...current,
              comments: [
                ...current.comments,
                ...result.comments.filter(
                  (comment) => !current.comments.some((existing) => existing.id === comment.id),
                ),
              ],
              nextCursor: result.nextCursor,
              commentCount: result.commentCount,
            }
          : current,
      );
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section
      className="article-interactions"
      aria-labelledby="article-comments-title"
      aria-busy={loading}
    >
      <div className="article-appreciation">
        <div>
          <span className="interaction-eyebrow">THANKS FOR READING</span>
          <p>读到这里，留下一个共鸣。</p>
        </div>
        <button
          type="button"
          className={`article-like${data?.liked ? ' is-liked' : ''}`}
          aria-label={data?.liked ? '取消点赞' : '点赞文章'}
          aria-pressed={data?.liked ?? false}
          disabled={!data || loading || liking}
          onClick={toggleLike}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
          </svg>
          <span>{liking ? '正在保存' : data?.liked ? '已点赞' : '点赞'}</span>
          <span className="article-like-count">{data?.likes ?? '—'}</span>
        </button>
      </div>

      <div className="article-comments-heading">
        <div>
          <span className="interaction-eyebrow">CONVERSATION</span>
          <h2 id="article-comments-title">
            评论 <span>{data?.commentCount ?? '—'}</span>
          </h2>
        </div>
        <p>无需登录，写下你的想法就好。</p>
      </div>

      {loadError && (
        <div className="interaction-error" role="alert">
          <span>评论加载失败。{loadError}</span>
          <button
            type="button"
            className="interaction-retry"
            disabled={loading}
            onClick={() => void load()}
          >
            重新加载
          </button>
        </div>
      )}

      <form className="article-comment-form" onSubmit={postComment}>
        <label htmlFor="comment-nickname">
          用户名 <span>选填，留空为匿名访客</span>
        </label>
        <input
          id="comment-nickname"
          name="nickname"
          type="text"
          autoComplete="nickname"
          maxLength={maximumNicknameLength}
          placeholder="输入显示给大家的名字"
          value={nickname}
          disabled={posting}
          onChange={(event) => {
            setNickname(event.target.value);
            requestId.current = null;
          }}
        />
        <label htmlFor="comment-content">评论内容</label>
        <textarea
          id="comment-content"
          name="content"
          rows={5}
          maxLength={maximumCommentLength}
          placeholder="分享你的看法，或留下一个问题……"
          required
          value={content}
          disabled={posting}
          aria-describedby="comment-guidance"
          onChange={(event) => {
            setContent(event.target.value);
            requestId.current = null;
          }}
        />
        <div className="comment-honeypot" aria-hidden="true">
          <label htmlFor="comment-website">Website</label>
          <input
            id="comment-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <div className="article-comment-form-footer">
          <p id="comment-guidance">
            友善交流，评论公开展示。
            <span>
              {content.length} / {maximumCommentLength}
            </span>
          </p>
          <button
            className="article-comment-submit"
            type="submit"
            disabled={!data || loading || posting || !content.trim()}
          >
            {posting ? '正在发布…' : '发布评论'} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>

      <div className="interaction-feedback" aria-live="polite" role="status">
        {notice}
      </div>
      {actionError && (
        <p className="interaction-error" role="alert">
          {actionError}
        </p>
      )}

      {loading && !data && (
        <p className="article-comments-empty" role="status">
          正在加载评论…
        </p>
      )}
      {!loading && data?.commentCount === 0 && (
        <p className="article-comments-empty">还没有评论，来留下第一条想法吧。</p>
      )}
      {data && data.comments.length > 0 && (
        <ol className="article-comment-list" aria-label="文章评论">
          {data.comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              query={query}
              onPublished={(result) =>
                setData((current) =>
                  current
                    ? {
                        ...current,
                        commentCount: result.commentCount,
                        comments: current.comments.map((root) =>
                          root.id === comment.id
                            ? { ...root, replyCount: result.parentReplyCount ?? root.replyCount }
                            : root,
                        ),
                      }
                    : current,
                )
              }
            />
          ))}
        </ol>
      )}
      {data?.nextCursor && (
        <button
          className="article-comments-more"
          type="button"
          disabled={loadingMore}
          onClick={loadMore}
        >
          {loadingMore ? '正在加载…' : '加载更多评论 ↓'}
        </button>
      )}
    </section>
  );
}
