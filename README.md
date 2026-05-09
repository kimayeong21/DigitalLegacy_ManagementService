# AI 기반 추억 관리 서비스

소중한 사진, 영상, 문서, SNS 기록을 한 곳에 저장하고, 사용자가 입력한 설명과 이미지 정보를 바탕으로 AI가 추억의 장면, 분위기, 감정, 의미를 분석해 주는 웹 서비스입니다.

## 주요 기능

- 회원가입, 로그인, 로그아웃
- 비밀번호 SHA-256 암호화 저장
- 비밀번호 표시/숨김 버튼
- 사용자별 추억 데이터 분리
- 추억 추가, 조회, 수정, 삭제
- 사진, 동영상, 문서, SNS 게시물, 이메일, 음성/통화, 기타 카테고리 분류
- 제목, 설명, 내용 기반 검색
- 카테고리 필터
- 이미지 URL, 파일 정보, 사용자가 작성한 설명 저장
- OpenAI 기반 AI 분석
- MySQL 기반 데이터 저장
- OpenAI API 키가 없을 때도 동작하는 로컬 AI 분석 fallback

## AI 분석 내용

추억을 추가할 때 사용자가 입력한 제목, 설명, 내용, 카테고리, 이미지 URL을 함께 분석합니다.

AI는 다음 항목을 생성합니다.

- AI 요약
- 감정 분석
- 핵심 키워드
- 장면 판별
- 전체 분위기
- 느껴지는 기분
- 이미지/설명 관찰 내용
- 추억의 의미
- 분석 신뢰도

예를 들어 가족 여행 사진과 간단한 설명을 입력하면, AI는 단순히 “긍정”으로만 판단하지 않고 “가족과 함께한 따뜻한 여행 장면”, “편안하고 밝은 분위기”, “그리움과 행복이 함께 느껴지는 추억”처럼 발표에서 설명하기 좋은 형태로 결과를 정리합니다.

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| Frontend / Backend | Hono, Vite, TypeScript |
| Database | MySQL |
| AI | OpenAI Responses API |
| Python API | FastAPI, aiomysql |
| File Storage | Cloudflare R2 설정 지원 |
| 배포 | Cloudflare Pages 설정 지원 |

## 프로젝트 구조

```text
.
├── src/
│   └── index.tsx                 # Hono 앱, 화면, API, MySQL 연결, AI 분석
├── python-api/
│   ├── main.py                   # FastAPI 기반 보조 API
│   └── requirements.txt
├── migrations/
│   ├── mysql_schema.sql          # MySQL 기본 테이블
│   └── mysql_ai_insights.sql     # AI 분석 컬럼 확장
├── scripts/
│   └── setup-mysql.mjs           # MySQL 스키마/시드 적용 스크립트
├── seed.mysql.sql                # 예시 카테고리/추억 데이터
├── wrangler.jsonc
├── package.json
└── README.md
```

## 실행 방법

### 1. 패키지 설치

```bash
npm install
```

### 2. MySQL 데이터베이스 준비

MySQL 서버를 실행한 뒤 `.dev.vars` 파일을 만듭니다.

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` 예시:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=비밀번호
MYSQL_DATABASE=memorylink
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.2
```

OpenAI API 키가 없어도 서비스는 실행됩니다. 이 경우 로컬 fallback 분석이 사용됩니다.

### 3. MySQL 테이블 생성 및 예시 데이터 입력

```bash
npm run db:mysql:setup
```

이 명령은 다음 파일을 순서대로 적용합니다.

- `migrations/mysql_schema.sql`
- `migrations/mysql_ai_insights.sql`
- `seed.mysql.sql`

### 4. 개발 서버 실행

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

브라우저에서 접속:

```text
http://127.0.0.1:5173/
```

## 회원가입/로그인 흐름

1. 사용자가 이름, 이메일, 비밀번호를 입력해 회원가입합니다.
2. 회원가입이 완료되면 로그인 화면으로 이동합니다.
3. 로그인하면 개인 추억 목록 화면으로 이동합니다.
4. 로그인한 사용자 본인의 추억만 조회, 추가, 수정, 삭제할 수 있습니다.

## 추억 추가 흐름

1. `새 추억 추가` 버튼을 클릭합니다.
2. 제목, 설명, 내용, 카테고리, 중요도, 이미지 URL 또는 파일 정보를 입력합니다.
3. 저장하면 MySQL `memories` 테이블에 저장됩니다.
4. AI 분석이 켜져 있으면 제목/설명/이미지 정보를 기반으로 분위기와 감정을 분석합니다.
5. 분석 결과는 추억 상세 화면에서 확인할 수 있습니다.

## 데이터베이스 구조

MySQL을 기준으로 다음 테이블을 사용합니다.

- `users`: 사용자 계정 정보
- `sessions`: 로그인 세션 정보
- `categories`: 추억 카테고리
- `memories`: 추억 본문과 AI 분석 결과
- `connections`: 추억 간 연결 관계

`memories` 테이블에는 기본 추억 정보와 함께 AI 분석 컬럼이 포함됩니다.

- `ai_summary`
- `ai_sentiment`
- `ai_keywords`
- `ai_scene_type`
- `ai_atmosphere`
- `ai_felt_emotion`
- `ai_image_observations`
- `ai_memory_meaning`
- `ai_confidence`

## 주요 API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 |
| `POST` | `/api/auth/logout` | 로그아웃 |
| `GET` | `/api/me` | 현재 사용자 확인 |
| `GET` | `/api/memories` | 추억 목록 조회 |
| `POST` | `/api/memories` | 추억 추가 |
| `GET` | `/api/memories/:id` | 추억 상세 조회 |
| `PUT` | `/api/memories/:id` | 추억 수정 |
| `DELETE` | `/api/memories/:id` | 추억 삭제 |
| `GET` | `/api/categories` | 카테고리 목록 |
| `GET` | `/api/stats` | 통계 조회 |

## 빌드

```bash
npm run build
```

## Python API 실행

```bash
pip install -r python-api/requirements.txt
python python-api/main.py
```

Python API도 MySQL을 사용하도록 구성되어 있으며, `aiomysql` 기반으로 데이터베이스에 연결합니다.

## 변경 요약

- SQLite/D1 구조를 MySQL 연결 구조로 변경
- `mysql2/promise` 기반 MySQL 어댑터 추가
- MySQL 스키마, AI 분석 컬럼 마이그레이션, 시드 데이터 추가
- OpenAI Responses API 기반 분석으로 개선
- 이미지와 설명문을 함께 보고 장면, 분위기, 기분, 추억 의미를 분석하도록 확장
- README와 DB 문서를 MySQL 기준으로 재작성
