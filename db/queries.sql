-- ==================== Common SQL Queries ====================
-- This file contains commonly used SQL queries for reference

-- ==================== User Queries ====================

-- Get user with statistics
-- SELECT 
--   u.*,
--   us.total_memories,
--   us.positive_count,
--   us.negative_count,
--   us.neutral_count,
--   us.avg_importance
-- FROM users u
-- LEFT JOIN user_statistics us ON u.id = us.user_id
-- WHERE u.id = ?;

-- ==================== Memory Queries ====================

-- Get memories with full details (using view)
-- SELECT * FROM memories_with_categories
-- WHERE user_id = ?
-- ORDER BY created_at DESC
-- LIMIT ? OFFSET ?;

-- Search memories by keyword
-- SELECT * FROM memories
-- WHERE user_id = ?
-- AND (
--   title LIKE '%' || ? || '%'
--   OR description LIKE '%' || ? || '%'
--   OR content LIKE '%' || ? || '%'
-- )
-- ORDER BY importance_score DESC, created_at DESC;

-- Get memories by sentiment
-- SELECT * FROM memories
-- WHERE user_id = ? AND ai_sentiment = ?
-- ORDER BY created_at DESC;

-- Get memories by date range
-- SELECT * FROM memories
-- WHERE user_id = ?
-- AND original_date BETWEEN ? AND ?
-- ORDER BY original_date ASC;

-- Get top important memories
-- SELECT * FROM memories
-- WHERE user_id = ?
-- ORDER BY importance_score DESC, created_at DESC
-- LIMIT 10;

-- ==================== Statistics Queries ====================

-- Get monthly statistics for user
-- SELECT * FROM monthly_memory_stats
-- WHERE user_id = ?
-- ORDER BY month DESC
-- LIMIT 12;

-- Get category distribution
-- SELECT 
--   c.name,
--   c.icon,
--   c.color,
--   COUNT(m.id) as count
-- FROM categories c
-- LEFT JOIN memories m ON c.id = m.category_id AND m.user_id = ?
-- GROUP BY c.id, c.name, c.icon, c.color
-- ORDER BY count DESC;

-- Get sentiment distribution
-- SELECT 
--   ai_sentiment,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM memories WHERE user_id = ?), 2) as percentage
-- FROM memories
-- WHERE user_id = ?
-- GROUP BY ai_sentiment;

-- Get activity timeline
-- SELECT 
--   strftime('%Y-%m-%d', created_at) as date,
--   COUNT(*) as count
-- FROM memories
-- WHERE user_id = ?
-- GROUP BY strftime('%Y-%m-%d', created_at)
-- ORDER BY date DESC
-- LIMIT 30;

-- ==================== Connection Queries ====================

-- Get related memories
-- SELECT 
--   m.*,
--   c.connection_type,
--   c.strength
-- FROM memories m
-- JOIN connections c ON (
--   (c.memory_id_1 = ? AND c.memory_id_2 = m.id)
--   OR (c.memory_id_2 = ? AND c.memory_id_1 = m.id)
-- )
-- WHERE m.user_id = ?
-- ORDER BY c.strength DESC;

-- ==================== Analytics Queries ====================

-- Get recent activity logs
-- SELECT 
--   al.*,
--   m.title as memory_title
-- FROM activity_logs al
-- LEFT JOIN memories m ON al.memory_id = m.id
-- WHERE al.user_id = ?
-- ORDER BY al.created_at DESC
-- LIMIT 50;

-- Get user engagement metrics
-- SELECT 
--   user_id,
--   activity_type,
--   COUNT(*) as count,
--   MAX(created_at) as last_activity
-- FROM activity_logs
-- WHERE user_id = ?
-- GROUP BY user_id, activity_type;

-- ==================== Shared Memories ====================

-- Get shared memories by owner
-- SELECT 
--   sm.*,
--   m.title,
--   m.description,
--   m.file_url
-- FROM shared_memories sm
-- JOIN memories m ON sm.memory_id = m.id
-- WHERE sm.owner_user_id = ?
-- ORDER BY sm.created_at DESC;

-- Validate share link
-- SELECT 
--   sm.*,
--   m.*,
--   u.name as owner_name
-- FROM shared_memories sm
-- JOIN memories m ON sm.memory_id = m.id
-- JOIN users u ON sm.owner_user_id = u.id
-- WHERE sm.id = ?
-- AND (sm.expires_at IS NULL OR sm.expires_at > datetime('now'));

-- ==================== Favorites ====================

-- Get user favorites
-- SELECT 
--   m.*,
--   f.note,
--   f.created_at as favorited_at
-- FROM favorites f
-- JOIN memories m ON f.memory_id = m.id
-- WHERE f.user_id = ?
-- ORDER BY f.created_at DESC;

-- Check if memory is favorited
-- SELECT EXISTS(
--   SELECT 1 FROM favorites
--   WHERE user_id = ? AND memory_id = ?
-- ) as is_favorited;

-- ==================== Performance Optimization ====================

-- Analyze table statistics (run periodically)
-- ANALYZE;

-- Check index usage
-- SELECT * FROM sqlite_stat1;

-- Vacuum database (reclaim space)
-- VACUUM;
