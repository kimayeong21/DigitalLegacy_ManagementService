# 데이터베이스 스키마 문서

## 📋 테이블 목록

1. [users](#users) - 사용자 정보
2. [sessions](#sessions) - 인증 세션
3. [categories](#categories) - 카테고리
4. [memories](#memories) - 추억/유품 데이터
5. [connections](#connections) - 추억 간 연결
6. [activity_logs](#activity_logs) - 활동 로그
7. [shared_memories](#shared_memories) - 공유 기능
8. [favorites](#favorites) - 즐겨찾기
9. [memory_comments](#memory_comments) - 댓글
10. [notification_settings](#notification_settings) - 알림 설정

---

## users

사용자 계정 정보

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 사용자 ID |
| email | TEXT | UNIQUE, NOT NULL | 이메일 (로그인 ID) |
| name | TEXT | NOT NULL | 사용자 이름 |
| password | TEXT | | SHA-256 해시 비밀번호 |
| avatar_url | TEXT | | 프로필 이미지 URL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 수정일 |

**인덱스:**
- `idx_users_email` ON email

**관계:**
- `sessions` (1:N)
- `memories` (1:N)
- `activity_logs` (1:N)
- `shared_memories` (1:N)
- `favorites` (1:N)
- `memory_comments` (1:N)

---

## sessions

사용자 인증 세션 관리

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| id | TEXT | PRIMARY KEY | 세션 ID (UUID) |
| user_id | INTEGER | NOT NULL, FK → users(id) | 사용자 ID |
| expires_at | DATETIME | NOT NULL | 만료 시간 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |

**인덱스:**
- `idx_sessions_user_id` ON user_id
- `idx_sessions_expires_at` ON expires_at

**관계:**
- `users` (N:1) - ON DELETE CASCADE

---

## categories

추억 분류 카테고리

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 카테고리 ID |
| name | TEXT | UNIQUE, NOT NULL | 카테고리 이름 |
| icon | TEXT | | 아이콘 (이모지) |
| color | TEXT | | 색상 코드 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |

**기본 카테고리:**
1. 사진 📷 (#3B82F6)
2. 동영상 🎥 (#8B5CF6)
3. 문서 📄 (#10B981)
4. SNS 게시물 💬 (#F59E0B)
5. 이메일 📧 (#EF4444)
6. 음성/통화 🎙️ (#EC4899)
7. 기타 📦 (#6B7280)

**관계:**
- `memories` (1:N)

---

## memories

디지털 유품/추억 데이터

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 추억 ID |
| user_id | INTEGER | NOT NULL, FK → users(id) | 소유자 ID |
| category_id | INTEGER | FK → categories(id) | 카테고리 ID |
| title | TEXT | NOT NULL | 제목 |
| description | TEXT | | 설명 |
| content | TEXT | | 본문 내용 |
| file_url | TEXT | | 파일 URL (이미지/영상) |
| file_type | TEXT | | 파일 타입 (image, video, etc.) |
| tags | TEXT | | 태그 (JSON 배열) |
| ai_summary | TEXT | | AI 생성 요약 |
| ai_sentiment | TEXT | | 감정 분석 (positive/negative/neutral) |
| ai_keywords | TEXT | | AI 추출 키워드 (JSON 배열) |
| importance_score | INTEGER | DEFAULT 5 | 중요도 (1-10) |
| is_archived | BOOLEAN | DEFAULT 0 | 보관 여부 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 수정일 (자동 업데이트) |
| original_date | DATETIME | | 원본 파일 날짜 |

**인덱스:**
- `idx_memories_user_id` ON user_id
- `idx_memories_category_id` ON category_id
- `idx_memories_created_at` ON created_at
- `idx_memories_importance_score` ON importance_score
- `idx_memories_title` ON title
- `idx_memories_description` ON description
- `idx_memories_original_date` ON original_date
- `idx_memories_is_archived` ON is_archived
- `idx_memories_ai_sentiment` ON ai_sentiment
- `idx_memories_user_category` ON (user_id, category_id)
- `idx_memories_user_created` ON (user_id, created_at DESC)
- `idx_memories_user_importance` ON (user_id, importance_score DESC)

**트리거:**
- `update_memories_timestamp` - updated_at 자동 업데이트

**관계:**
- `users` (N:1) - ON DELETE CASCADE
- `categories` (N:1) - ON DELETE SET NULL
- `connections` (1:N)
- `shared_memories` (1:N)
- `favorites` (1:N)
- `memory_comments` (1:N)

---

## connections

추억 간의 연결/관계

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 연결 ID |
| memory_id_1 | INTEGER | NOT NULL, FK → memories(id) | 첫 번째 추억 |
| memory_id_2 | INTEGER | NOT NULL, FK → memories(id) | 두 번째 추억 |
| connection_type | TEXT | | 연결 타입 (related/similar/sequence) |
| strength | INTEGER | DEFAULT 5 | 연결 강도 (1-10) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |

**제약조건:**
- UNIQUE(memory_id_1, memory_id_2)

**인덱스:**
- `idx_connections_memory_1` ON memory_id_1
- `idx_connections_memory_2` ON memory_id_2

**관계:**
- `memories` (N:1) - ON DELETE CASCADE (×2)

---

## activity_logs

사용자 활동 기록

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 로그 ID |
| user_id | INTEGER | NOT NULL, FK → users(id) | 사용자 ID |
| activity_type | TEXT | NOT NULL | 활동 타입 |
| memory_id | INTEGER | FK → memories(id) | 관련 추억 ID |
| metadata | TEXT | | 추가 정보 (JSON) |
| ip_address | TEXT | | IP 주소 |
| user_agent | TEXT | | 브라우저 정보 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |

**활동 타입:**
- login
- logout
- create_memory
- update_memory
- delete_memory
- view_memory

**인덱스:**
- `idx_activity_logs_user_id` ON user_id
- `idx_activity_logs_created_at` ON created_at
- `idx_activity_logs_activity_type` ON activity_type

**관계:**
- `users` (N:1) - ON DELETE CASCADE
- `memories` (N:1) - ON DELETE SET NULL

---

## shared_memories

추억 공유 기능

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| id | TEXT | PRIMARY KEY | 공유 링크 ID (UUID) |
| memory_id | INTEGER | NOT NULL, FK → memories(id) | 추억 ID |
| owner_user_id | INTEGER | NOT NULL, FK → users(id) | 소유자 ID |
| share_type | TEXT | DEFAULT 'view' | 공유 타입 (view/edit) |
| password | TEXT | | 비밀번호 (선택) |
| expires_at | DATETIME | | 만료 시간 (선택) |
| view_count | INTEGER | DEFAULT 0 | 조회 수 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |

**인덱스:**
- `idx_shared_memories_memory_id` ON memory_id
- `idx_shared_memories_owner` ON owner_user_id

**관계:**
- `memories` (N:1) - ON DELETE CASCADE
- `users` (N:1) - ON DELETE CASCADE

---

## favorites

즐겨찾기 (북마크)

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 즐겨찾기 ID |
| user_id | INTEGER | NOT NULL, FK → users(id) | 사용자 ID |
| memory_id | INTEGER | NOT NULL, FK → memories(id) | 추억 ID |
| note | TEXT | | 메모 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |

**제약조건:**
- UNIQUE(user_id, memory_id)

**인덱스:**
- `idx_favorites_user_id` ON user_id
- `idx_favorites_memory_id` ON memory_id

**관계:**
- `users` (N:1) - ON DELETE CASCADE
- `memories` (N:1) - ON DELETE CASCADE

---

## memory_comments

추억에 대한 댓글

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 댓글 ID |
| memory_id | INTEGER | NOT NULL, FK → memories(id) | 추억 ID |
| user_id | INTEGER | NOT NULL, FK → users(id) | 작성자 ID |
| content | TEXT | NOT NULL | 댓글 내용 |
| parent_comment_id | INTEGER | FK → memory_comments(id) | 상위 댓글 (대댓글) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 수정일 |

**인덱스:**
- `idx_memory_comments_memory_id` ON memory_id
- `idx_memory_comments_user_id` ON user_id
- `idx_memory_comments_parent` ON parent_comment_id

**관계:**
- `memories` (N:1) - ON DELETE CASCADE
- `users` (N:1) - ON DELETE CASCADE
- `memory_comments` (self-reference) - ON DELETE CASCADE

---

## notification_settings

사용자별 알림 설정

| 컬럼 | 타입 | 제약조건 | 설명 |
|-----|------|---------|------|
| user_id | INTEGER | PRIMARY KEY, FK → users(id) | 사용자 ID |
| email_notifications | BOOLEAN | DEFAULT 1 | 이메일 알림 |
| push_notifications | BOOLEAN | DEFAULT 1 | 푸시 알림 |
| memory_reminders | BOOLEAN | DEFAULT 1 | 추억 리마인더 |
| weekly_summary | BOOLEAN | DEFAULT 1 | 주간 요약 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 수정일 |

**관계:**
- `users` (1:1) - ON DELETE CASCADE

---

## 🔍 뷰 (Views)

### memories_with_categories

추억 정보 + 카테고리 정보 + 사용자 정보 조인

```sql
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
```

### user_statistics

사용자별 통계 요약

```sql
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
```

### monthly_memory_stats

월별 추억 통계

```sql
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
```

---

## 📊 ERD 다이어그램

```
users (1) ─────< memories (N)
  │               │
  │               ├─< connections (N)
  │               ├─< shared_memories (N)
  │               ├─< favorites (N)
  │               └─< memory_comments (N)
  │
  ├─< sessions (N)
  ├─< activity_logs (N)
  └─< notification_settings (1)

categories (1) ─────< memories (N)
```
