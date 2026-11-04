'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { ArticleComment, DeletedComment } from '@/lib/article-interactions';
import {
  commentManagementTokenKey,
  InteractionError,
  interactionRequest,
  interactionErrorMessage,
  rememberCommentManagementToken,
} from '@/lib/article-interactions-client';

export default function CommentModeration({
  token,
  onChange,
}: {
  token: string | null;
  onChange: (token: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let stored = '';
    try {
      stored = sessionStorage.getItem(commentManagementTokenKey) ?? '';
    } catch {
      /* Optional browser storage. */
    }
    if (stored) {
      setInput(stored);
      setChecking(true);
      void interactionRequest('/api/articles/admin', {
        headers: { Authorization: `Bearer ${stored}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      })
        .then(() => {
          if (!controller.signal.aborted) onChange(stored);
        })
        .catch((failure: unknown) => {
          if (
            !controller.signal.aborted &&
            failure instanceof InteractionError &&
            failure.status === 401
          ) {
            rememberCommentManagementToken(null);
            setInput('');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }
    return () => controller.abort();
  }, [onChange]);

  const unlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || checking) return;
    setChecking(true);
    setError('');
    try {
      const value = input.trim();
      await interactionRequest('/api/articles/admin', {
        headers: { Authorization: `Bearer ${value}` },
      });
      rememberCommentManagementToken(value);
      onChange(value);
      setInput('');
      setOpen(false);
    } catch (failure) {
      setError(interactionErrorMessage(failure));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="comment-moderation">
      {token ? (
        <div className="comment-moderation-status">
          <span>管理员模式</span>
          <button
            type="button"
            onClick={() => {
              rememberCommentManagementToken(null);
              onChange(null);
              setInput('');
            }}
          >
            退出管理
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={checking}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {checking ? '正在验证…' : '管理评论'}
          </button>
          {open && (
            <form className="comment-moderation-form" onSubmit={unlock}>
              <label htmlFor="comments-admin-token">管理口令</label>
              <div>
                <input
                  id="comments-admin-token"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={input}
                  disabled={checking}
                  onChange={(event) => setInput(event.target.value)}
                />
                <button type="submit" disabled={checking || !input.trim()}>
                  {checking ? '正在验证…' : '解锁管理'}
                </button>
              </div>
              {error && (
                <p className="interaction-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function CommentDeleteButton({
  comment,
  query,
  token,
  disabled,
  onDeleted,
  onUnauthorized,
}: {
  comment: ArticleComment;
  query: string;
  token: string | null;
  disabled?: boolean;
  onDeleted: (comment: ArticleComment, result: DeletedComment) => void;
  onUnauthorized: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token) {
      setConfirming(false);
      setError('');
    }
  }, [token]);
  if (!token) return null;
  const kind = comment.parentId === null ? '评论' : '回复';
  const remove = async () => {
    if (deleting || disabled) return;
    setDeleting(true);
    setError('');
    try {
      const result = await interactionRequest<DeletedComment>(
        `/api/articles/comments/${comment.id}?${query}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      onDeleted(comment, result);
      setConfirming(false);
    } catch (failure) {
      if (failure instanceof InteractionError && failure.status === 401) onUnauthorized();
      else setError(interactionErrorMessage(failure));
    } finally {
      setDeleting(false);
    }
  };
  return (
    <span className="comment-delete-control">
      {!confirming ? (
        <button
          className="comment-delete-button"
          type="button"
          disabled={disabled}
          aria-label={`删除${kind} ${comment.id}`}
          onClick={() => setConfirming(true)}
        >
          删除
        </button>
      ) : (
        <span className="comment-delete-confirmation" role="group" aria-label="确认删除">
          <span>
            {comment.parentId === null && comment.replyCount > 0
              ? `删除此评论及其 ${comment.replyCount} 条回复？`
              : `删除此${kind}？`}
          </span>
          <button
            className="comment-delete-button"
            type="button"
            disabled={deleting || disabled}
            onClick={remove}
          >
            {deleting ? '正在删除…' : '确认删除'}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              setConfirming(false);
              setError('');
            }}
          >
            取消
          </button>
        </span>
      )}
      {error && (
        <span className="interaction-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
