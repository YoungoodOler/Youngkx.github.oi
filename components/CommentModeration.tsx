'use client';

import { useEffect, useState } from 'react';
import type { ArticleComment, DeletedComment } from '@/lib/article-interactions';
import {
  InteractionError,
  interactionRequest,
  interactionErrorMessage,
} from '@/lib/article-interactions-client';

export default function CommentDeleteButton({
  comment,
  query,
  isAdmin,
  disabled,
  onDeleted,
  onUnauthorized,
}: {
  comment: ArticleComment;
  query: string;
  isAdmin: boolean;
  disabled?: boolean;
  onDeleted: (comment: ArticleComment, result: DeletedComment) => void;
  onUnauthorized: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isAdmin) {
      setConfirming(false);
      setError('');
    }
  }, [isAdmin]);
  if (!isAdmin) return null;
  const kind = comment.parentId === null ? '评论' : '回复';
  const remove = async () => {
    if (deleting || disabled) return;
    setDeleting(true);
    setError('');
    try {
      const result = await interactionRequest<DeletedComment>(
        `/api/articles/comments/${comment.id}?${query}`,
        { method: 'DELETE' },
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
