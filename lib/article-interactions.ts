export const maximumCommentLength = 2000;
export const maximumNicknameLength = 32;

export type ArticleComment = {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
  parentId: number | null;
  replyTo: string | null;
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

export type ArticleInteractions = {
  likes: number;
  liked: boolean;
  commentCount: number;
  comments: ArticleComment[];
  nextCursor: number | null;
};
