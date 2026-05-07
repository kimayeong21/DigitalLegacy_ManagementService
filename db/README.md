# 데이터베이스 관리 가이드

## 📁 디렉토리 구조

```
db/
├── README.md           # 이 파일
├── queries.sql         # 자주 사용하는 SQL 쿼리 모음
└── schema.md          # 데이터베이스 스키마 문서
```

## 🗄️ 마이그레이션

### 마이그레이션 파일 순서

1. **0001_initial_schema.sql** - 초기 스키마 생성
   - users, categories, memories, connections 테이블
   - 기본 인덱스

2. **0002_add_auth.sql** - 인증 시스템 추가
   - sessions 테이블
   - 사용자 비밀번호 필드

3. **0003_optimize_queries.sql** - 쿼리 최적화
   - 추가 인덱스 (전문 검색, 복합 인덱스)
   - 자동 타임스탬프 업데이트 트리거
   - 편의 뷰 (memories_with_categories, user_statistics, monthly_memory_stats)

4. **0004_add_analytics.sql** - 분석 및 확장 기능
   - activity_logs (활동 로그)
   - shared_memories (공유 기능)
   - favorites (즐겨찾기)
   - memory_comments (댓글)
   - notification_settings (알림 설정)

### 마이그레이션 적용

```bash
# 로컬 개발 환경
npm run db:migrate:local

# 또는 직접 실행
npx wrangler d1 migrations apply memorylink-production --local

# 프로덕션 환경
npm run db:migrate:prod

# 또는 직접 실행
npx wrangler d1 migrations apply memorylink-production
```

## 🔍 자주 사용하는 쿼리

### 1. 사용자 통계 조회

```sql
SELECT * FROM user_statistics WHERE user_id = ?;
```

### 2. 카테고리별 추억 개수

```sql
SELECT 
  c.name,
  c.icon,
  COUNT(m.id) as count
FROM categories c
LEFT JOIN memories m ON c.id = m.category_id AND m.user_id = ?
GROUP BY c.id, c.name, c.icon
ORDER BY count DESC;
```

### 3. 월별 추억 통계

```sql
SELECT * FROM monthly_memory_stats
WHERE user_id = ?
ORDER BY month DESC
LIMIT 12;
```

### 4. 감정 분석 분포

```sql
SELECT 
  ai_sentiment,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM memories WHERE user_id = ?), 2) as percentage
FROM memories
WHERE user_id = ?
GROUP BY ai_sentiment;
```

### 5. 전문 검색

```sql
SELECT * FROM memories
WHERE user_id = ?
AND (
  title LIKE '%' || ? || '%'
  OR description LIKE '%' || ? || '%'
  OR content LIKE '%' || ? || '%'
)
ORDER BY importance_score DESC, created_at DESC;
```

## 🛠️ 데이터베이스 유틸리티

### 데이터베이스 콘솔 접속

```bash
# 로컬
npm run db:console:local

# 프로덕션
npm run db:console:prod
```

### 데이터 시드

```bash
# 로컬 환경에 테스트 데이터 추가
npm run db:seed
```

### 데이터베이스 리셋 (로컬만)

```bash
# 로컬 데이터베이스 초기화 및 시드 데이터 재생성
npm run db:reset
```

## 📊 뷰 (Views)

### memories_with_categories
전체 정보가 포함된 추억 조회 (카테고리, 사용자 정보 포함)

```sql
SELECT * FROM memories_with_categories
WHERE user_id = ?
ORDER BY created_at DESC;
```

### user_statistics
사용자별 통계 요약 (총 추억 수, 감정 분포, 평균 중요도 등)

```sql
SELECT * FROM user_statistics WHERE user_id = ?;
```

### monthly_memory_stats
월별 추억 통계 (추억 수, 감정 분포, 평균 중요도)

```sql
SELECT * FROM monthly_memory_stats
WHERE user_id = ?
ORDER BY month DESC;
```

## 🚀 성능 최적화

### 1. 인덱스 확인

```sql
SELECT * FROM sqlite_master WHERE type = 'index';
```

### 2. 쿼리 실행 계획

```sql
EXPLAIN QUERY PLAN
SELECT * FROM memories WHERE user_id = 1;
```

### 3. 데이터베이스 통계 업데이트

```sql
ANALYZE;
```

### 4. 데이터베이스 최적화

```sql
VACUUM;
```

## 📝 스키마 변경 가이드

새로운 마이그레이션을 추가하려면:

1. `migrations/` 디렉토리에 새 파일 생성
   - 파일명 형식: `000X_description.sql`
   - 예: `0005_add_tags_table.sql`

2. SQL 문 작성
   ```sql
   -- Add tags table
   CREATE TABLE IF NOT EXISTS tags (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT UNIQUE NOT NULL,
     color TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Add indexes
   CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
   ```

3. 마이그레이션 적용
   ```bash
   npm run db:migrate:local
   ```

4. 변경사항 테스트 후 프로덕션 적용
   ```bash
   npm run db:migrate:prod
   ```

## 🔒 보안 고려사항

1. **SQL Injection 방지**: 항상 파라미터 바인딩 사용
   ```typescript
   // ✅ 올바른 방법
   await DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
   
   // ❌ 잘못된 방법
   await DB.prepare(`SELECT * FROM users WHERE email = '${email}'`).first()
   ```

2. **민감한 데이터 암호화**: 비밀번호는 SHA-256으로 해시화

3. **세션 관리**: HttpOnly 쿠키 사용, 7일 만료

4. **사용자 데이터 격리**: 모든 쿼리에 user_id 필터 적용

## 📚 추가 리소스

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [SQL Performance Tuning](https://www.sqlite.org/queryplanner.html)
