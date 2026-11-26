CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL,
  persistent INTEGER NOT NULL CHECK (persistent IN (0, 1))
) WITHOUT ROWID;

CREATE INDEX admin_sessions_expiry ON admin_sessions (expires_at);

ALTER TABLE article_comments ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0 CHECK (is_owner IN (0, 1));

DROP TRIGGER article_comment_email_enqueue;

CREATE TRIGGER article_comment_email_enqueue AFTER INSERT ON article_comments
BEGIN
  INSERT INTO article_comment_email_outbox (comment_id, kind)
  SELECT NEW.id, 'owner' WHERE NEW.is_owner = 0 AND NEW.email IS NOT NULL;

  INSERT INTO article_comment_email_outbox (comment_id, kind)
  SELECT NEW.id, 'reply' FROM article_comments
  WHERE id = NEW.reply_to_id AND email IS NOT NULL
    AND (NEW.is_owner = 1 OR NEW.email IS NOT NULL);
END;
