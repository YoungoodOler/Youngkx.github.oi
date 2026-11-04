CREATE TABLE article_likes (
  article_path TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  PRIMARY KEY (article_path, visitor_id)
) WITHOUT ROWID;

CREATE TABLE article_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_path TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 32),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at TEXT NOT NULL,
  parent_id INTEGER REFERENCES article_comments(id) ON DELETE CASCADE,
  reply_to_id INTEGER REFERENCES article_comments(id) ON DELETE SET NULL,
  UNIQUE (article_path, visitor_id, request_id)
);

CREATE INDEX article_comments_page ON article_comments (article_path, parent_id, id DESC);
CREATE INDEX article_comments_parent ON article_comments (parent_id, id DESC);
CREATE INDEX article_comments_reply_target ON article_comments (reply_to_id);

CREATE TABLE article_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX article_rate_limits_expiry ON article_rate_limits (expires_at);
