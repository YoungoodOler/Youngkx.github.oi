ALTER TABLE article_comments ADD COLUMN email TEXT CHECK (length(email) BETWEEN 3 AND 254);

CREATE TABLE article_comment_email_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('owner', 'reply')),
  attempts INTEGER NOT NULL DEFAULT 0,
  ready_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL DEFAULT (unixepoch() + 86400),
  UNIQUE (comment_id, kind)
);

CREATE INDEX article_comment_email_outbox_ready ON article_comment_email_outbox (ready_at);
CREATE INDEX article_comment_email_outbox_expiry ON article_comment_email_outbox (expires_at);

CREATE TRIGGER article_comment_email_enqueue AFTER INSERT ON article_comments
WHEN NEW.email IS NOT NULL
BEGIN
  INSERT INTO article_comment_email_outbox (comment_id, kind) VALUES (NEW.id, 'owner');

  INSERT INTO article_comment_email_outbox (comment_id, kind)
  SELECT NEW.id, 'reply' FROM article_comments
  WHERE id = NEW.reply_to_id AND email IS NOT NULL;
END;
