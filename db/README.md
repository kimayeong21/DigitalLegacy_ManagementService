# MySQL 데이터베이스 문서

이 프로젝트는 SQLite 또는 Cloudflare D1이 아니라 MySQL을 기준으로 데이터를 저장합니다.

## 적용 파일

```text
migrations/mysql_schema.sql
migrations/mysql_ai_insights.sql
seed.mysql.sql
scripts/setup-mysql.mjs
```

## 설정 값

`.dev.vars` 또는 실행 환경 변수에 다음 값을 설정합니다.

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=비밀번호
MYSQL_DATABASE=memorylink
```

## 초기화 명령

```bash
npm run db:mysql:setup
```

## 테이블 역할

| 테이블 | 역할 |
| --- | --- |
| `users` | 회원가입한 사용자 정보 |
| `sessions` | 로그인 세션 |
| `categories` | 사진, 동영상, 문서, SNS 등 카테고리 |
| `memories` | 추억 본문, 파일 정보, AI 분석 결과 |
| `connections` | 서로 관련 있는 추억 연결 |

## AI 분석 저장 컬럼

`memories` 테이블에는 다음 AI 분석 결과가 저장됩니다.

- `ai_summary`: 추억 요약
- `ai_sentiment`: 감정 분류
- `ai_keywords`: 핵심 키워드 JSON
- `ai_scene_type`: 장면 판별
- `ai_atmosphere`: 분위기
- `ai_felt_emotion`: 느껴지는 기분
- `ai_image_observations`: 이미지/설명 기반 관찰 내용
- `ai_memory_meaning`: 추억의 의미
- `ai_confidence`: 분석 신뢰도
