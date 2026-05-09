# MySQL 데이터베이스 문서

AI 기반 추억 관리 서비스는 MySQL을 중심 데이터베이스로 사용합니다. 사용자 정보, 로그인 세션, 추억 데이터, 카테고리, AI 분석 결과를 분리 저장하여 서비스 기능이 명확하게 관리되도록 설계했습니다.

## 데이터베이스 설계 목표

- 사용자별 추억 데이터 분리
- 추억 CRUD 기능을 안정적으로 처리
- 사진, 동영상, 문서, SNS 게시물 등 카테고리 기반 분류 지원
- AI 분석 결과를 추억 데이터와 함께 저장
- 추후 공유, 즐겨찾기, 댓글, 추천 기능으로 확장 가능한 구조 확보

## 적용 파일

```text
migrations/mysql_schema.sql
migrations/mysql_ai_insights.sql
seed.mysql.sql
scripts/setup-mysql.mjs
```

## 환경 변수

`.dev.vars` 또는 실행 환경에 다음 값을 설정합니다.

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

이 명령은 MySQL 데이터베이스를 생성하고, 테이블을 만든 뒤, 기본 카테고리와 예시 데이터를 입력합니다.

## 테이블 구성

| 테이블 | 역할 | 주요 관계 |
| --- | --- | --- |
| `users` | 회원 정보 저장 | `memories`, `sessions`와 연결 |
| `sessions` | 로그인 유지 정보 저장 | `users.id` 참조 |
| `categories` | 추억 분류 기준 저장 | `memories.category_id`와 연결 |
| `memories` | 추억 본문, 파일 정보, AI 분석 결과 저장 | `users`, `categories` 참조 |
| `connections` | 추억 간 관계 저장 | `memories`끼리 연결 |

## 관계 구조

```text
users
  ├── sessions
  └── memories
        ├── categories
        └── connections
```

## 핵심 테이블 설명

### users

회원가입한 사용자의 기본 정보를 저장합니다. 이메일은 중복되지 않도록 UNIQUE 제약 조건을 사용합니다.

### sessions

로그인 상태를 유지하기 위한 세션 정보를 저장합니다. 사용자가 로그아웃하거나 세션이 만료되면 더 이상 인증된 요청으로 처리하지 않습니다.

### categories

추억을 사진, 동영상, 문서, SNS 게시물 등으로 분류하기 위한 테이블입니다. 화면에서 표시할 아이콘과 색상도 함께 저장합니다.

### memories

서비스의 핵심 테이블입니다. 사용자가 입력한 추억 정보와 AI가 분석한 결과를 함께 저장합니다.

저장되는 일반 정보:

- 제목
- 설명
- 상세 내용
- 이미지/파일 URL
- 파일 유형
- 태그
- 중요도
- 원본 날짜

저장되는 AI 분석 정보:

- 요약
- 감정
- 키워드
- 장면 유형
- 분위기
- 느껴지는 기분
- 이미지/설명 관찰
- 추억의 의미
- 분석 신뢰도

### connections

서로 관련 있는 추억을 연결하기 위한 테이블입니다. 예를 들어 같은 여행, 같은 가족 행사, 같은 시기의 기록을 연결하는 기능으로 확장할 수 있습니다.

## AI 분석 저장 컬럼

| 컬럼 | 설명 |
| --- | --- |
| `ai_summary` | 추억 내용을 짧게 요약 |
| `ai_sentiment` | 감정 분류 |
| `ai_keywords` | 핵심 키워드 JSON |
| `ai_scene_type` | 장면 유형 |
| `ai_atmosphere` | 전체 분위기 |
| `ai_felt_emotion` | 느껴지는 기분 |
| `ai_image_observations` | 이미지와 설명문에서 관찰한 내용 |
| `ai_memory_meaning` | 추억이 가지는 의미 |
| `ai_confidence` | 분석 신뢰도 |

## 설계 특징

- `users`와 `memories`를 분리하여 사용자별 데이터 접근을 제어합니다.
- `categories`를 별도 테이블로 두어 카테고리 변경과 확장이 쉽습니다.
- AI 분석 컬럼을 `memories`에 함께 저장해 추억 상세 화면에서 바로 보여줄 수 있습니다.
- 외래키 제약 조건을 사용해 사용자나 추억 삭제 시 관련 데이터가 정리되도록 했습니다.
- `utf8mb4` 문자셋을 사용하여 한글과 이모지 등 다양한 문자를 저장할 수 있습니다.
