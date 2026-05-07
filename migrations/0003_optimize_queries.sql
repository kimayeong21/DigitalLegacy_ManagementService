-- Add indexes for full-text search optimization
CREATE INDEX IF NOT EXISTS idx_memories_title ON memories(title);
CREATE INDEX IF NOT EXISTS idx_memories_description ON memories(description);
CREATE INDEX IF NOT EXISTS idx_memories_original_date ON memories(original_date);
CREATE INDEX IF NOT EXISTS idx_memories_is_archived ON memories(is_archived);
CREATE INDEX IF NOT EXISTS idx_memories_ai_sentiment ON memories(ai_sentiment);

-- Add index for user email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_memories_user_category ON memories(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_created ON memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user_importance ON memories(user_id, importance_score DESC);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_memories_timestamp 
AFTER UPDATE ON memories
BEGIN
  UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Add views for common queries
CREATE VIEW IF NOT EXISTS memories_with_categories AS
SELECT 
  m.*,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  u.name as user_name,
  u.email as user_email
FROM memories m
LEFT JOIN categories c ON m.category_id = c.id
LEFT JOIN users u ON m.user_id = u.id;

-- Statistics view
CREATE VIEW IF NOT EXISTS user_statistics AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  COUNT(m.id) as total_memories,
  COUNT(CASE WHEN m.is_archived = 1 THEN 1 END) as archived_count,
  COUNT(CASE WHEN m.ai_sentiment = 'positive' THEN 1 END) as positive_count,
  COUNT(CASE WHEN m.ai_sentiment = 'negative' THEN 1 END) as negative_count,
  COUNT(CASE WHEN m.ai_sentiment = 'neutral' THEN 1 END) as neutral_count,
  ROUND(AVG(m.importance_score), 2) as avg_importance,
  MAX(m.created_at) as last_memory_date
FROM users u
LEFT JOIN memories m ON u.id = m.user_id
GROUP BY u.id, u.email, u.name;

-- Monthly statistics view
CREATE VIEW IF NOT EXISTS monthly_memory_stats AS
SELECT 
  user_id,
  strftime('%Y-%m', created_at) as month,
  COUNT(*) as memory_count,
  COUNT(CASE WHEN ai_sentiment = 'positive' THEN 1 END) as positive_count,
  COUNT(CASE WHEN ai_sentiment = 'negative' THEN 1 END) as negative_count,
  ROUND(AVG(importance_score), 2) as avg_importance
FROM memories
GROUP BY user_id, strftime('%Y-%m', created_at)
ORDER BY month DESC;
