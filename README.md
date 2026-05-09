# AI 기반 추억 관리 서비스

AI 기반 추억 관리 서비스는 사진, 영상, 문서, SNS 기록처럼 흩어져 있는 개인의 디지털 추억을 한 곳에서 저장하고 관리하는 웹 서비스입니다. 사용자가 추억에 대한 간단한 설명이나 이미지를 등록하면 AI가 해당 기록의 장면, 분위기, 감정, 의미를 분석하여 추억을 더 쉽게 정리하고 다시 돌아볼 수 있도록 도와줍니다.

## 프로젝트 개요

현대인의 추억은 스마트폰 사진첩, 메신저, SNS, 이메일, 문서 파일 등 여러 공간에 나뉘어 저장됩니다. 시간이 지나면 어떤 사진이 어떤 상황에서 찍힌 것인지, 어떤 감정이 담겨 있었는지 기억하기 어려워집니다.

이 프로젝트는 단순히 파일을 업로드하는 저장소가 아니라, 사용자가 남긴 설명과 이미지 정보를 AI가 함께 해석하여 추억의 맥락을 정리하는 서비스를 목표로 합니다.

예를 들어 사용자가 가족 여행 사진과 “제주도에서 가족과 함께 보낸 여름”이라는 설명을 입력하면, AI는 이 추억을 여행 장면으로 판별하고, 밝고 따뜻한 분위기와 행복, 그리움 같은 감정을 분석합니다. 이후 사용자는 카테고리, 검색, AI 키워드를 통해 원하는 추억을 빠르게 찾을 수 있습니다.

## 개발 목적

- 흩어져 있는 디지털 추억을 한 곳에서 관리
- 사용자가 직접 모든 내용을 정리하지 않아도 AI가 요약과 의미 분석 지원
- 사진, 문서, SNS 게시물 등 다양한 유형의 기록을 카테고리별로 분류
- 사용자별 데이터 분리로 개인 추억을 안전하게 관리
- MySQL 기반 구조로 실제 서비스 확장 가능성 확보
- 발표와 시연이 가능한 회원가입, 로그인, 추억 추가, AI 분석 흐름 구현

## 핵심 사용자 시나리오

1. 사용자는 회원가입 후 로그인합니다.
2. 메인 화면에서 자신의 추억 목록을 확인합니다.
3. `새 추억 추가` 버튼을 눌러 제목, 설명, 내용, 카테고리, 이미지 정보를 입력합니다.
4. 저장하면 데이터가 MySQL에 저장됩니다.
5. AI 분석 기능이 켜져 있으면 OpenAI가 설명문과 이미지 정보를 기반으로 추억을 분석합니다.
6. 사용자는 상세 화면에서 요약, 분위기, 감정, 키워드, 추억의 의미를 확인합니다.
7. 이후 검색이나 카테고리 필터를 통해 필요한 추억을 다시 찾을 수 있습니다.

## 주요 기능

### 1. 사용자 인증

- 회원가입
- 로그인
- 로그아웃
- 비밀번호 SHA-256 해시 저장
- 비밀번호 표시/숨김 버튼
- HttpOnly 쿠키 기반 세션 관리
- 로그인 사용자별 추억 데이터 분리

회원가입이 완료되면 바로 로그인 화면으로 이동하도록 구성되어 있어 사용자가 자연스럽게 서비스를 시작할 수 있습니다.

### 2. 추억 관리

- 추억 추가
- 추억 목록 조회
- 추억 상세 보기
- 추억 수정
- 추억 삭제
- 중요도 점수 저장
- 원본 날짜 저장
- 이미지 URL 또는 파일 정보 저장

추억은 제목, 설명, 상세 내용, 카테고리, 이미지 정보, 중요도 등을 포함합니다. 사용자는 사진뿐 아니라 문서나 SNS 게시물처럼 텍스트 중심의 기록도 함께 저장할 수 있습니다.

### 3. 카테고리 분류

기본 카테고리는 다음과 같습니다.

- 사진
- 동영상
- 문서
- SNS 게시물
- 이메일
- 음성/통화
- 기타

카테고리는 MySQL `categories` 테이블에 저장되며, 추억 데이터는 `category_id`를 통해 연결됩니다.

### 4. 검색 및 필터

- 제목 검색
- 설명 검색
- 내용 검색
- 카테고리 필터
- 사용자별 추억 목록 조회

추억이 많아져도 특정 단어나 카테고리로 빠르게 원하는 기록을 찾을 수 있도록 설계했습니다.

### 5. AI 분석

추억을 추가할 때 사용자가 입력한 제목, 설명, 내용, 카테고리, 이미지 URL을 AI 분석에 활용합니다.

AI가 생성하는 결과는 다음과 같습니다.

| 항목 | 설명 |
| --- | --- |
| AI 요약 | 추억 내용을 짧게 요약 |
| 감정 분석 | 긍정, 중립, 그리움, 따뜻함 등 감정 판별 |
| 핵심 키워드 | 추억을 대표하는 단어 추출 |
| 장면 판별 | 여행, 가족 모임, 학교생활, 일상 등 장면 유형 분석 |
| 분위기 | 밝음, 차분함, 따뜻함, 아련함 등 분위기 분석 |
| 느껴지는 기분 | 사용자가 느꼈을 법한 정서 추론 |
| 이미지/설명 관찰 | 이미지 URL과 설명문에서 읽히는 단서 정리 |
| 추억의 의미 | 이 기록이 사용자에게 어떤 의미를 가질 수 있는지 설명 |
| 분석 신뢰도 | 입력 정보 기반 분석 신뢰도 |

OpenAI API 키가 없거나 호출에 실패하는 경우에도 서비스가 멈추지 않도록 로컬 fallback 분석을 제공합니다.

## AI 분석 예시

입력 예시:

```text
제목: 가족 여행 사진
설명: 2023년 여름 제주도 가족 여행
카테고리: 사진
이미지 URL: 여행 사진 URL
```

AI 분석 결과 예시:

```text
장면 판별: 가족 여행
분위기: 밝고 따뜻한 분위기
느껴지는 기분: 행복함과 그리움
AI 요약: 가족과 함께 제주도에서 보낸 여름 여행의 추억
추억 의미: 가족과 함께한 시간을 다시 떠올리게 하는 소중한 기록
핵심 키워드: 가족, 여행, 제주도, 여름, 추억
```

## 전체 시스템 작동 흐름

```text
사용자
  ↓
회원가입 / 로그인
  ↓
추억 추가 화면
  ↓
제목, 설명, 내용, 카테고리, 이미지 정보 입력
  ↓
Hono API 서버
  ↓
MySQL 데이터 저장
  ↓
OpenAI Responses API 분석 요청
  ↓
AI 요약, 감정, 분위기, 의미 분석 결과 생성
  ↓
MySQL memories 테이블에 AI 결과 저장
  ↓
추억 상세 화면에서 분석 결과 표시
```

## 시스템 구성

| 구성 요소 | 역할 |
| --- | --- |
| 사용자 화면 | 회원가입, 로그인, 추억 목록, 추억 추가, 상세 화면 제공 |
| Hono 서버 | 화면 렌더링, API 처리, 인증, MySQL 연결 |
| MySQL | 사용자, 세션, 카테고리, 추억, AI 분석 결과 저장 |
| OpenAI Responses API | 설명문과 이미지 정보를 바탕으로 추억 분석 |
| FastAPI 보조 서버 | Python 기반 분석 API와 통계 API 확장 |
| Cloudflare R2 설정 | 파일 저장 확장 가능성을 위한 설정 |

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| Frontend / Backend | Hono, Vite, TypeScript |
| Database | MySQL |
| AI | OpenAI Responses API |
| Python API | FastAPI, aiomysql |
| Package Manager | npm |
| Build Tool | Vite |
| 배포 설정 | Cloudflare Pages, Wrangler |

## 데이터베이스 설계

이 프로젝트는 SQLite 또는 Cloudflare D1이 아니라 MySQL을 기준으로 구성했습니다.

### 주요 테이블

| 테이블 | 설명 |
| --- | --- |
| `users` | 회원 정보 저장 |
| `sessions` | 로그인 세션 저장 |
| `categories` | 추억 카테고리 저장 |
| `memories` | 추억 본문과 AI 분석 결과 저장 |
| `connections` | 추억 간 연결 관계 저장 |

### 관계 구조

```text
users 1 ── N memories
users 1 ── N sessions
categories 1 ── N memories
memories N ── N memories connections
```

### memories 테이블의 AI 분석 컬럼

- `ai_summary`
- `ai_sentiment`
- `ai_keywords`
- `ai_scene_type`
- `ai_atmosphere`
- `ai_felt_emotion`
- `ai_image_observations`
- `ai_memory_meaning`
- `ai_confidence`

이 컬럼들을 통해 단순한 추억 저장을 넘어, AI가 해석한 감정과 의미까지 함께 보관할 수 있습니다.

## 프로젝트 구조

```text
.
├── src/
│   └── index.tsx
├── python-api/
│   ├── main.py
│   ├── README.md
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
├── wrangler.jsonc
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

OpenAI API 키는 선택 사항입니다. 키가 없으면 로컬 fallback 분석이 사용됩니다.

### 3. MySQL 테이블 생성 및 예시 데이터 입력

```bash
npm run db:mysql:setup
```

이 명령은 다음 파일을 순서대로 적용합니다.

```text
migrations/mysql_schema.sql
migrations/mysql_ai_insights.sql
seed.mysql.sql
```

### 4. 개발 서버 실행

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

브라우저에서 접속합니다.

```text
http://127.0.0.1:5173/
```

## 주요 API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 |
| `POST` | `/api/auth/logout` | 로그아웃 |
| `GET` | `/api/me` | 현재 로그인 사용자 확인 |
| `GET` | `/api/memories` | 추억 목록 조회 |
| `POST` | `/api/memories` | 추억 추가 |
| `GET` | `/api/memories/:id` | 추억 상세 조회 |
| `PUT` | `/api/memories/:id` | 추억 수정 |
| `DELETE` | `/api/memories/:id` | 추억 삭제 |
| `GET` | `/api/categories` | 카테고리 조회 |
| `GET` | `/api/stats` | 통계 조회 |

## 보안 및 데이터 관리

- 비밀번호는 평문으로 저장하지 않고 SHA-256 해시로 저장합니다.
- 로그인 세션은 쿠키 기반으로 관리합니다.
- 사용자는 자신의 추억 데이터만 접근할 수 있도록 API에서 사용자 ID를 확인합니다.
- MySQL 외래키를 사용하여 사용자 삭제 시 관련 추억과 세션 데이터가 함께 정리되도록 구성했습니다.
- `.dev.vars`는 실제 비밀번호와 API 키가 들어가므로 Git에 올리지 않습니다.

## Python API

Python API는 FastAPI 기반 보조 서버입니다.

```bash
pip install -r python-api/requirements.txt
python python-api/main.py
```

Python API도 MySQL을 사용하며, `aiomysql` 기반으로 연결됩니다. 자세한 내용은 `python-api/README.md`를 참고하면 됩니다.

## 빌드

```bash
npm run build
```

## 발표 시 설명 포인트

- 단순 CRUD 서비스가 아니라 AI가 추억의 의미를 분석한다는 점
- 사진과 설명문을 함께 보고 장면, 분위기, 감정을 해석한다는 점
- MySQL 기반으로 사용자, 추억, 카테고리, 세션, AI 분석 결과를 분리 저장한다는 점
- 회원가입부터 로그인, 추억 추가, AI 분석 결과 확인까지 하나의 흐름으로 시연 가능하다는 점
- OpenAI API가 없을 때도 fallback 분석으로 서비스가 멈추지 않는다는 점

## 향후 개선 방향

- 실제 이미지 파일 업로드 저장소 연동 강화
- AI 이미지 분석 결과 정확도 개선
- 추억 간 자동 연결 추천
- 가족 구성원과 추억 공유 기능
- 즐겨찾기 및 댓글 기능
- 날짜별 타임라인 화면 고도화
- 배포 환경에서 MySQL 연결 안정화
- 관리자 페이지 추가

## 변경 요약

- SQLite/D1 구조를 MySQL 연결 구조로 변경
- MySQL 스키마와 시드 데이터 추가
- `mysql2/promise` 기반 MySQL 어댑터 추가
- OpenAI Responses API 기반 AI 분석으로 개선
- 이미지와 설명문을 함께 분석하여 장면, 분위기, 기분, 추억 의미를 생성하도록 확장
- README, DB 문서, Python API 문서를 MySQL과 AI 분석 중심으로 재작성
