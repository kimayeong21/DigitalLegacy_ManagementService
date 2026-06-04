# AI 기반 추억 관리 서비스

사진, 영상, 문서, SNS 기록처럼 흩어져 있는 개인의 디지털 추억을 한 곳에서 저장하고 관리하는 웹 서비스입니다. 사용자가 제목, 설명, 이미지 정보를 입력하면 AI가 장면, 분위기, 감정, 핵심 키워드, 추억의 의미를 함께 분석해 기록을 다시 찾기 쉽게 정리합니다.

## 프로젝트 개요

디지털 자료가 많아질수록 중요한 추억을 다시 찾기 어려워집니다. 사진은 휴대폰에, 문서는 폴더에, SNS 기록은 플랫폼마다 따로 남아 있어 시간이 지나면 어떤 기록이 어떤 상황과 감정을 담고 있었는지 기억하기 어렵습니다.

이 프로젝트는 단순 파일 저장소가 아니라, 사용자가 입력한 설명과 이미지 정보를 바탕으로 AI가 추억의 맥락을 보조적으로 정리해 주는 관리 서비스를 목표로 합니다. 사용자는 개인 계정으로 로그인하여 기록을 저장하고, 카테고리, 검색, 대시보드, 타임라인, 상세 분석 화면을 통해 필요한 추억을 다시 확인할 수 있습니다.

## 프로젝트 목적

- 흩어진 사진, 문서, SNS 기록을 한 곳에서 관리
- 제목, 설명, 이미지 기반으로 추억의 장면과 분위기를 AI가 분석
- 카테고리와 검색 기능으로 필요한 기록을 빠르게 조회
- 사용자별 데이터 분리로 개인 기록을 안전하게 관리
- MySQL 기반 구조로 실제 서비스 확장 가능성 확보
- 추억 상세 화면에서 수정, 삭제, AI 분석 확인까지 자연스럽게 연결

## 주요 기능

| 기능 | 구현 내용 |
| --- | --- |
| 사용자 인증 | 회원가입, 로그인, 로그아웃, 비밀번호 보기/숨기기, 세션 기반 사용자 관리 |
| 추억 추가 | 제목, 설명, 내용, 날짜, 카테고리, 중요도, 이미지/미디어 URL 입력 |
| 추억 조회 | 전체 목록, 카테고리 필터, 검색, 최근 기록, 타임라인 조회 |
| 추억 수정/삭제 | 상세 화면에서 기존 추억 수정, 삭제 확인 후 데이터 제거 |
| 카테고리 관리 | 사진, 동영상, 문서, SNS 게시물, 이메일, 음성/통화, 기타 분류 |
| 대시보드 | 총 추억 수, 감정 통계, 카테고리 현황, 최근 기록 표시 |
| AI 상세 분석 | 요약, 감정, 분위기, 장면, 키워드, 추억 의미, 사건 흐름 분석 |
| 데이터 저장 | MySQL 기반 사용자, 세션, 카테고리, 추억, 연결 관계 저장 |
| 파일 확장 구조 | 이미지 URL 저장과 Cloudflare R2 연동 확장 구조 지원 |

## 사용자 흐름

```text
회원가입
  -> 로그인
  -> 대시보드 진입
  -> 새 추억 추가
  -> 카테고리 / 설명 / 이미지 정보 입력
  -> AI 분석 결과 생성
  -> 목록, 상세 화면, 대시보드, 타임라인에서 조회
  -> 필요 시 수정 또는 삭제
```

## AI 분석 기능

AI는 사용자가 입력한 제목, 설명, 내용, 이미지 정보를 바탕으로 추억의 의미를 구조화합니다. 설명문이 짧더라도 이미지와 함께 판단하여 어떤 상황이었는지, 어떤 분위기였는지, 사용자가 어떤 감정을 느꼈을 가능성이 있는지 정리합니다.

| 항목 | 설명 |
| --- | --- |
| AI 요약 | 추억 내용을 짧게 요약 |
| 감정 분석 | 긍정, 중립, 부정 등 대표 감정 판별 |
| 핵심 키워드 | 검색과 분류에 사용할 키워드 추출 |
| 장면 판별 | 여행, 가족 기록, 학교 생활, 문서 기록 등 장면 유형 분석 |
| 분위기 | 밝음, 차분함, 따뜻함, 그리움 등 분위기 정리 |
| 느껴지는 기분 | 사용자가 느꼈을 법한 감정 추정 |
| 이미지/설명 관찰 | 이미지와 설명문에서 확인되는 근거 정리 |
| 사건 흐름 | 그때 어떤 일이 있었는지 자연스럽게 설명 |
| 추억 의미 | 해당 기록이 사용자에게 가지는 의미 정리 |
| 분석 신뢰도 | 입력 정보 기반 분석 신뢰도 표시 |

OpenAI API 키가 없거나 호출에 실패해도 서비스가 멈추지 않도록 로컬 fallback 분석을 제공합니다.

## 시스템 구성

```text
사용자 화면
  -> Hono API 서버
  -> MySQL 데이터베이스
  -> OpenAI Responses API
  -> AI 분석 결과 저장
  -> 대시보드 / 목록 / 상세 화면에 표시
```

### 구성 요소

| 구성 요소 | 역할 |
| --- | --- |
| 사용자 화면 | 회원가입, 로그인, 추억 목록, 추억 추가, 상세 보기, 대시보드 제공 |
| Hono API | 인증 처리, 추억 CRUD, AI 분석 요청, DB 연결 처리 |
| MySQL | 사용자, 세션, 카테고리, 추억, 연결 관계, AI 분석 결과 저장 |
| OpenAI Responses API | 설명문과 이미지 정보를 기반으로 추억 분석 |
| Python API | FastAPI 기반 분석 API 확장 구조 |
| Cloudflare R2 | 이미지와 미디어 파일 저장 확장을 위한 구조 |

## 데이터베이스

이 프로젝트는 SQLite가 아니라 MySQL을 기준으로 구성되어 있습니다.

| 테이블 | 역할 |
| --- | --- |
| `users` | 회원 정보 저장 |
| `sessions` | 로그인 세션 저장 |
| `categories` | 추억 카테고리 저장 |
| `memories` | 추억 본문과 AI 분석 결과 저장 |
| `connections` | 추억 간 연결 관계 저장 |

### 관계 구조

```text
users 1:N memories
users 1:N sessions
categories 1:N memories
memories 1:N connections
```

### memories 테이블의 AI 분석 컬럼

| 컬럼 | 설명 |
| --- | --- |
| `ai_summary` | AI 요약 |
| `ai_sentiment` | 감정 분석 결과 |
| `ai_keywords` | 핵심 키워드 JSON |
| `ai_scene_type` | 장면 유형 |
| `ai_atmosphere` | 분위기 |
| `ai_felt_emotion` | 느껴지는 기분 |
| `ai_image_observations` | 이미지/설명 관찰 내용 |
| `ai_event_story` | 사건 흐름 설명 |
| `ai_memory_meaning` | 추억의 의미 |
| `ai_confidence` | 분석 신뢰도 |

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Frontend / Backend | TypeScript, Hono, Vite, HTML/CSS, JavaScript |
| Database | MySQL |
| AI | OpenAI Responses API |
| Python API | FastAPI, aiomysql |
| 파일 저장 확장 | Cloudflare R2 |
| 배포 설정 | Cloudflare Workers / Pages, Wrangler |
| 개발 도구 | VS Code, npm |

## 프로젝트 구조

```text
.
├── src/
│   └── index.tsx
├── python-api/
│   ├── main.py
│   ├── models.py
│   └── requirements.txt
├── db/
│   ├── README.md
│   ├── schema.md
│   └── queries.sql
├── migrations/
│   ├── mysql_schema.sql
│   └── mysql_ai_insights.sql
├── scripts/
│   └── setup-mysql.mjs
├── seed.mysql.sql
├── package.json
├── vite.config.ts
├── wrangler.jsonc
└── README.md
```

## 실행 방법

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.dev.vars.example`을 참고하여 `.dev.vars` 파일을 생성합니다.

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=memorylink
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5.2
```

### 3. MySQL 테이블 생성

```bash
npm run db:mysql:setup
```

또는 `migrations/mysql_schema.sql`과 `migrations/mysql_ai_insights.sql`을 MySQL에 직접 실행할 수 있습니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 다음 주소로 접속합니다.

```text
http://127.0.0.1:5173
```

## API 개요

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 |
| `POST` | `/api/auth/logout` | 로그아웃 |
| `GET` | `/api/auth/me` | 현재 로그인 사용자 조회 |
| `GET` | `/api/categories` | 카테고리 목록 조회 |
| `GET` | `/api/memories` | 추억 목록 조회 |
| `GET` | `/api/memories/:id` | 추억 상세 조회 |
| `POST` | `/api/memories` | 추억 추가 및 AI 분석 |
| `PUT` | `/api/memories/:id` | 추억 수정 |
| `DELETE` | `/api/memories/:id` | 추억 삭제 |
| `POST` | `/api/ai/analyze` | 저장 전 AI 분석 |
| `GET` | `/api/statistics` | 대시보드 통계 조회 |
| `GET` | `/api/export` | 사용자 데이터 JSON 내보내기 |

## 개발 및 확장 방향

- 이미지 파일 업로드를 Cloudflare R2와 완전히 연동
- AI 분석 결과를 별도 `ai_analyses` 테이블로 분리하는 구조 검토
- 추억 간 연결 추천 기능 고도화
- 카테고리 직접 추가/수정 기능 확장
- 검색 결과에 AI 키워드와 감정 필터 적용
- 배포 환경에서 MySQL 연결 정보와 OpenAI API 키를 안전하게 관리
