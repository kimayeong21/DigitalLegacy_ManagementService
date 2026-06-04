# AI 기반 추억 관리 서비스

사진, 영상, 문서, SNS 기록처럼 흩어져 있는 개인의 디지털 추억을 한 곳에서 저장하고 관리하는 웹 서비스입니다. 사용자가 제목, 설명, 이미지 정보를 입력하면 AI가 장면, 분위기, 감정, 핵심 키워드, 추억의 의미를 함께 분석해 기록을 다시 찾기 쉽게 정리합니다.

## 프로젝트 개요

디지털 자료가 많아질수록 중요한 추억을 다시 찾기 어려워집니다. 이 프로젝트는 단순 파일 저장소가 아니라, 사용자가 남긴 설명과 이미지 정보를 바탕으로 AI가 추억의 맥락을 보조적으로 정리해 주는 관리 서비스를 목표로 합니다.

사용자는 회원가입과 로그인을 통해 개인 계정으로 접속하고, 사진·문서·SNS 게시물 등 여러 유형의 기록을 카테고리별로 저장할 수 있습니다. 저장된 추억은 목록, 상세 화면, 대시보드, 타임라인에서 확인할 수 있습니다.

## 주요 기능

| 기능 | 구현 내용 |
| --- | --- |
| 사용자 인증 | 회원가입, 로그인, 로그아웃, 비밀번호 보기/숨기기, 세션 기반 사용자 관리 |
| 추억 추가/조회 | 제목, 설명, 내용, 날짜, 카테고리, 중요도, 이미지/미디어 URL 저장 및 목록 조회 |
| 추억 수정/삭제 | 상세 화면에서 기존 추억 수정, 삭제 확인 후 목록에서 제거 |
| 카테고리/검색 | 사진, 동영상, 문서, SNS 게시물, 이메일, 음성/통화, 기타 카테고리 필터와 검색 |
| 대시보드 | 총 추억 수, 감정 통계, 카테고리 현황, 최근 기록 표시 |
| AI 분석 | 이미지와 설명문 기반 요약, 감정, 분위기, 장면, 키워드, 추억 의미, 사건 흐름 분석 |
| 파일 관리 | 이미지 URL 및 파일 정보 저장, Cloudflare R2 연동 확장 구조 |
| 데이터베이스 | MySQL 기반 사용자, 세션, 카테고리, 추억, 연결 관계 저장 |

## AI 분석 항목

AI는 사용자가 입력한 제목, 설명, 내용, 이미지 정보를 바탕으로 다음 항목을 생성합니다.

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
사용자
  -> 회원가입 / 로그인
  -> 추억 추가 / 조회 / 수정 / 삭제
  -> Hono API
  -> MySQL 데이터베이스 저장
  -> OpenAI Responses API 분석 요청
  -> AI 분석 결과를 추억 상세 화면과 대시보드에 표시
```

## 데이터베이스

이 프로젝트는 SQLite가 아니라 MySQL을 기준으로 구성되어 있습니다.

| 테이블 | 역할 |
| --- | --- |
| `users` | 회원 정보 저장 |
| `sessions` | 로그인 세션 저장 |
| `categories` | 추억 카테고리 저장 |
| `memories` | 추억 본문과 AI 분석 결과 저장 |
| `connections` | 추억 간 연결 관계 저장 |

관계 구조:

```text
users 1:N memories
users 1:N sessions
categories 1:N memories
memories 1:N connections
```

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

## 발표/시연 흐름

1. 회원가입 화면에서 이름, 이메일, 비밀번호 입력
2. 회원가입 완료 후 로그인 화면으로 이동
3. 로그인 후 대시보드 표시
4. 새 추억 추가 버튼으로 사진 또는 설명문 입력
5. AI 분석 결과가 상세 화면에 표시되는지 확인
6. 목록, 카테고리 필터, 검색, 수정, 삭제 흐름 확인

## 정리된 파일

GitHub 저장소에는 실행에 필요한 소스와 설정 파일만 남기고, 발표 준비 중 생성된 임시 테스트 HTML, 테스트 안내 문서, 작업 완료 메모 파일은 제거했습니다.
