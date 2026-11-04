export const maximumCommentLength = 2000;
export const maximumNicknameLength = 32;

export type ArticleComment = {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
  parentId: number | null;
  replyTo: string | null;
  replyToId: number | null;
  replyCount: number;
};

export type ArticleReplies = {
  replies: ArticleComment[];
  nextCursor: number | null;
};

export type PublishedComment = {
  comment: ArticleComment;
  commentCount: number;
  parentReplyCount: number | null;
};

export type DeletedComment = {
  deleted: true;
  commentCount: number;
  parentId: number | null;
  parentReplyCount: number | null;
};

export function mergeCommentsInOrder(current: ArticleComment[], incoming: ArticleComment[]) {
  return [
    ...new Map([...current, ...incoming].map((comment) => [comment.id, comment])).values(),
  ].sort((left, right) => left.id - right.id);
}

export type ArticleInteractions = {
  likes: number;
  liked: boolean;
  commentCount: number;
  comments: ArticleComment[];
  nextCursor: number | null;
};
