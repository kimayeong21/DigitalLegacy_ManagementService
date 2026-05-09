-- MySQL query examples for AI 기반 추억 관리 서비스

-- 사용자별 추억 목록
SELECT
  m.id,
  m.title,
  m.description,
  m.file_url,
  m.ai_summary,
  m.ai_sentiment,
  m.ai_atmosphere,
  m.ai_felt_emotion,
  c.name AS category_name
FROM memories m
LEFT JOIN categories c ON c.id = m.category_id
WHERE m.user_id = ?
ORDER BY m.created_at DESC;

-- 카테고리별 추억 개수
SELECT
  c.name,
  COUNT(m.id) AS memory_count
FROM categories c
LEFT JOIN memories m ON m.category_id = c.id
GROUP BY c.id, c.name
ORDER BY memory_count DESC;

-- AI 분석 결과가 있는 추억
SELECT
  id,
  title,
  ai_scene_type,
  ai_atmosphere,
  ai_felt_emotion,
  ai_memory_meaning,
  ai_confidence
FROM memories
WHERE user_id = ?
  AND ai_summary IS NOT NULL
ORDER BY ai_confidence DESC, created_at DESC;

-- 제목/설명/내용 검색
SELECT
  id,
  title,
  description,
  content,
  ai_keywords
FROM memories
WHERE user_id = ?
  AND (
    title LIKE CONCAT('%', ?, '%')
    OR description LIKE CONCAT('%', ?, '%')
    OR content LIKE CONCAT('%', ?, '%')
  )
ORDER BY created_at DESC;
