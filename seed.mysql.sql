USE memorylink;

INSERT IGNORE INTO categories (id, name, icon, color) VALUES
  (1, '사진', '📷', '#3B82F6'),
  (2, '동영상', '🎥', '#8B5CF6'),
  (3, '문서', '📄', '#10B981'),
  (4, 'SNS 게시물', '💬', '#F59E0B'),
  (5, '이메일', '📧', '#06B6D4'),
  (6, '음성/통화', '🎤', '#6B7280'),
  (7, '기타', '📦', '#F97316');

INSERT IGNORE INTO users (id, email, password, name, avatar_url) VALUES
  (1, 'test@memorylink.com',
   'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
   '테스트 사용자',
   'https://i.pravatar.cc/150?img=1');
