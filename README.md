# MemoryLink: AI 기반 디지털 유품 정리 서비스

## 1. 프로젝트 개요

MemoryLink는 사진, 영상, 문서, SNS 기록 등 흩어진 디지털 자료를 한곳에서 관리하고 다시 돌아볼 수 있도록 만든 졸업작품입니다. 기록의 내용과 감정, 날짜, 중요도를 활용해 개인의 추억을 정리하고, 타임라인과 추억 다시보기로 과거의 순간을 탐색할 수 있습니다.

웹 서비스 소스, Python 분석 API, MySQL 스키마, Android 앱 프로젝트를 함께 관리합니다. 현재 웹 화면은 브라우저 저장을 중심으로 동작하며, 공개 체험판은 별도 계정 없이 주요 기능을 확인할 수 있습니다.

- [프로젝트 저장소](https://github.com/kimayeong21/DigitalLegacy_ManagementService)
- [MemoryLink 체험판](https://kimayeong21.github.io/DNights.github.io/memorylink/)
- [개발자 포트폴리오](https://kimayeong21.github.io/DNights.github.io/)

## 2. 주요 기능

| 기능 | 설명 |
| --- | --- |
| 추억 관리 | 제목, 설명, 내용, 날짜, 카테고리, 중요도, 태그를 입력하고 기록을 추가·조회·수정·삭제 |
| 이미지 등록 | 파일 선택, 드래그 앤 드롭, 클립보드 붙여넣기, 이미지 URL 입력 |
| 검색과 필터 | 제목·설명·내용·태그 검색, 카테고리와 감정 필터, 정렬 |
| 즐겨찾기와 복제 | 중요한 기록을 즐겨찾기로 표시하고 기존 기록을 복제하여 재사용 |
| 일괄 관리 | 여러 기록을 선택하여 삭제 |
| 대시보드 | 전체 기록 수, 감정별 현황, 중요도, 보관함 분포, 최근 추억 확인 |
| 타임라인 | 기록을 연도와 월별로 탐색 |
| 추억 다시보기 | 저장된 기록을 무작위로 열거나 날짜·감정·중요도를 바탕으로 추천 |
| 회상 알림 | 방문 중 설정한 주기와 시간에 맞춰 회상 안내 |
| 백업과 복원 | JSON 파일로 기록을 내보내고 백업 자료를 기존 기록과 병합 |
| 분석 결과 표시 | 요약, 감정, 키워드, 장면, 분위기, 추억의 의미 표시 |
| 모바일 화면 | 반응형 레이아웃과 하단 탐색 메뉴 제공 |

서버 코드에는 회원가입, 로그인, 로그아웃, 세션 확인과 OpenAI 분석 연동이 포함되어 있습니다. 공개 체험판에서는 서버 인증이나 실제 OpenAI 호출 대신 브라우저 저장과 로컬 예시 분석을 사용합니다. 기록은 기기 간에 자동 동기화되지 않으며, 브라우저 데이터를 삭제하면 함께 지워집니다.

## 3. 시스템 구성

| 구성 요소 | 역할 | 현재 구성 |
| --- | --- | --- |
| 웹 화면 | 기록 입력, 탐색, 통계, 회상 기능 | Hono에서 HTML을 제공하고 브라우저 JavaScript가 화면을 제어 |
| 브라우저 저장소 | 기록과 사용자 설정 보관 | localStorage에 기록, 즐겨찾기, 회상 설정 저장 |
| Hono API | 인증, 기록 관리, 파일, 통계 API | `src/index.tsx`에 라우트 구현 |
| Python API | 분석과 통계 확장 | FastAPI와 aiomysql 기반의 별도 서버 |
| MySQL | 사용자, 기록, 세션, 관계 데이터 구조 | 스키마와 초기 데이터, 설정 스크립트 제공 |
| OpenAI | 외부 분석 요청 | 서버 환경 변수에 API 키가 설정된 경우 사용 |
| Cloudflare R2 | 파일 업로드 확장 | `BUCKET` 바인딩을 사용하는 업로드·조회 API 포함 |
| Android | 웹 화면의 앱 패키징 | Capacitor와 Gradle 기반 프로젝트 |
| GitHub Pages | 공개 체험 화면 제공 | 정적으로 내보낸 HTML·CSS 배포 |

Hono의 데이터 접근 코드는 `DB` 바인딩을 사용하며, 바인딩이 없으면 프로세스 메모리의 대체 저장소를 사용합니다. MySQL 환경 변수를 입력하는 것만으로 Hono에 MySQL이 자동 연결되지는 않습니다. Python API에는 별도의 MySQL 연결 코드가 있습니다.

현재 웹 화면은 로컬 저장 모드가 기본입니다. 서버 API의 존재와 웹 화면의 서버 영구 저장 연결은 구분해야 하며, 서버 재시작 이후에도 계정과 기록을 보존하려면 데이터베이스 연결과 화면 연동을 추가로 확인해야 합니다.

## 4. 프로젝트 구조

```text
DigitalLegacy_ManagementService/
|-- src/
|   |-- index.tsx                 # Hono API, HTML, 브라우저 기능
|   `-- renderer.tsx              # 렌더러 설정
|-- public/static/
|   |-- premium.css               # 최신 화면 스타일
|   `-- style.css                 # 기본 스타일
|-- python-api/
|   |-- main.py                   # 분석·통계 API와 MySQL 연결
|   |-- models.py                 # 데이터 모델
|   |-- utils.py                  # 보조 함수
|   |-- dev.py                    # 개발 서버 실행
|   `-- requirements.txt          # Python 의존성
|-- android/                      # Android 앱 소스와 Gradle 설정
|-- migrations/
|   |-- mysql_schema.sql          # 테이블 생성
|   `-- mysql_ai_insights.sql     # 분석 컬럼 확장
|-- db/                           # 스키마 설명과 SQL 참고 자료
|-- scripts/
|   |-- setup-mysql.mjs           # DB·초기 데이터 설정
|   |-- build-android-web.mjs     # Android용 웹 화면 생성
|   |-- export-pages-demo.mjs     # 브라우저 체험판 생성
|   `-- export-static-page.mjs    # 기본 정적 HTML 생성
|-- .vscode/                      # 편집기 실행·디버깅 설정
|-- .dev.vars.example             # 환경 변수 예시
|-- capacitor.config.json         # 앱 ID와 웹 출력 경로
|-- package.json                  # 의존성과 실행 명령
|-- seed.mysql.sql                # 초기 데이터
|-- vite.config.ts                # 개발·빌드 설정
`-- wrangler.jsonc                # Cloudflare 설정
```

`dist/`, `android-web/`, `node_modules/`와 Android 빌드 결과물은 실행 또는 빌드 과정에서 생성됩니다.

## 5. 기술 스택

| 분야 | 사용 기술 |
| --- | --- |
| 화면 | HTML, CSS, JavaScript, Tailwind CSS, Font Awesome |
| 웹 서버 | TypeScript, Hono |
| 빌드 | Vite, Node.js |
| Python 서버 | Python, FastAPI, Uvicorn, Pydantic |
| 데이터베이스 | MySQL, mysql2, aiomysql |
| 로컬 저장 | Web Storage API의 localStorage |
| 분석 | OpenAI API, 로컬 규칙 기반 예시 분석 |
| Android | Capacitor 8, Java, Gradle |
| 배포 설정 | GitHub Pages, Cloudflare Pages, Wrangler, R2 |
| 개발 도구 | Git, GitHub, Visual Studio Code, Android Studio |

## 6. 데이터베이스 구조

MySQL 스키마는 `migrations/mysql_schema.sql`에 정의되어 있습니다.

| 테이블 | 주요 컬럼 | 역할 |
| --- | --- | --- |
| `users` | `id`, `email`, `password`, `name`, `avatar_url` | 사용자 계정과 프로필 |
| `sessions` | `id`, `user_id`, `expires_at` | 로그인 세션과 만료 시간 |
| `categories` | `id`, `name`, `icon`, `color` | 기록 분류 기준 |
| `memories` | `id`, `user_id`, `category_id`, `title`, `description`, `content`, `file_url`, `file_type`, `tags` | 기록 본문과 첨부 자료 |
| `connections` | `id`, `memory_id_1`, `memory_id_2`, `connection_type`, `strength` | 기록 간 관계 |

`memories`에는 중요도(`importance_score`), 보관 여부(`is_archived`), 원본 날짜(`original_date`), 생성·수정 시각도 저장할 수 있습니다. 분석용 컬럼으로 `ai_summary`, `ai_sentiment`, `ai_keywords`, `ai_scene_type`, `ai_atmosphere`, `ai_felt_emotion`, `ai_image_observations`, `ai_event_story`, `ai_memory_meaning`, `ai_confidence`가 정의되어 있습니다. 컬럼 정의가 모든 실행 모드에서 해당 값을 생성하거나 저장한다는 의미는 아닙니다.

사용자 한 명은 여러 세션과 기록을 가질 수 있고, 카테고리 하나에는 여러 기록이 속할 수 있습니다. `connections`는 두 기록의 ID를 참조합니다. 사용자 삭제 시 관련 세션과 기록은 함께 삭제되며, 카테고리를 삭제하면 해당 기록의 카테고리 참조는 비워집니다.

즐겨찾기와 회상 설정은 현재 브라우저 저장소에서 관리합니다. 자세한 설명은 [DB 문서](./db/schema.md)를 참고하세요.

## 7. 실행 방법

### 웹 개발 환경

Node.js와 npm이 설치된 환경에서 실행합니다.

```bash
git clone https://github.com/kimayeong21/DigitalLegacy_ManagementService.git
cd DigitalLegacy_ManagementService
npm install
npm run dev -- --host 127.0.0.1 --port 4174
```

브라우저에서 `http://127.0.0.1:4174`에 접속합니다. 브라우저 저장 방식의 화면을 확인할 수 있으며, MySQL 연결 없이도 로컬 기능을 체험할 수 있습니다.

빌드와 빌드 결과 확인 명령은 다음과 같습니다.

```bash
npm run build
npm run preview
```

### MySQL 초기 설정

MySQL 서버를 준비한 뒤 `.dev.vars.example`을 `.dev.vars`로 복사하고 접속 정보를 입력합니다. 아래는 Windows PowerShell 예시입니다.

```powershell
Copy-Item .dev.vars.example .dev.vars
```

```dotenv
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=memorylink
OPENAI_MODEL=gpt-5.2
```

```bash
npm run db:mysql:setup
```

설정 스크립트는 테이블과 초기 데이터를 생성하고 누락된 분석 컬럼을 보완합니다. 현재 SQL 파일의 데이터베이스 이름은 `memorylink`로 고정되어 있으므로 다른 이름을 사용하려면 SQL도 함께 수정해야 합니다. 이 작업은 Hono의 DB 연결을 자동으로 구성하지 않습니다.

### Python API 실행

Python 환경에서 의존성을 설치하고 Uvicorn을 실행합니다.

```bash
python -m pip install -r python-api/requirements.txt
python -m uvicorn main:app --app-dir python-api --reload --host 127.0.0.1 --port 8000 --env-file .dev.vars
```

- 상태 확인: `http://127.0.0.1:8000/health`
- API 문서: `http://127.0.0.1:8000/docs`

DB 관련 API에는 실행 중인 MySQL 서버가 필요합니다. 실제 분석을 사용하려면 `.dev.vars`에 `OPENAI_API_KEY`를 추가합니다. API 키와 실제 접속 비밀번호는 저장소에 올리지 않습니다.

### Android 프로젝트 실행

Android Studio, Android SDK와 JDK를 준비합니다. 현재 Android 설정은 compileSdk·targetSdk 36, minSdk 24입니다. 웹 개발 서버를 `http://127.0.0.1:4174`에서 실행한 상태로 별도 터미널에서 진행합니다.

```bash
npm run android:sync
npm run android:open
```

`android:sync`는 실행 중인 웹 화면을 읽어 `android-web/`에 저장하고 Android 프로젝트에 복사합니다. 다른 주소를 사용한다면 `MEMORYLINK_DEV_URL` 환경 변수를 지정합니다. Windows에서는 SDK와 Java 설정을 마친 후 `npm run android:apk`로 디버그 APK를 빌드할 수 있습니다.

### GitHub Pages 체험판 생성

```bash
npm run build
node scripts/export-pages-demo.mjs
```

출력은 `dist/demo/`에 생성됩니다. 다른 출력 경로는 첫 번째 인수로 지정할 수 있습니다. 생성된 체험판은 정적 페이지이므로 계정 인증, 서버 저장, 실제 OpenAI 분석을 제공하지 않습니다.

## 8. 화면 및 라우트 구성

### 화면 구성

웹 화면은 `/`에서 제공되며, 내부 화면 전환은 브라우저 JavaScript로 처리합니다. 대시보드·추억·타임라인이 각각 별도 URL로 제공되는 구조는 아닙니다.

| 화면 | 주요 내용 |
| --- | --- |
| 가입·로그인 | 사용자 정보 입력과 로그인 화면. 공개 체험판에서는 생략 |
| 오늘의 기억 | 추천 기록, 통계, 보관함 현황, 최근 추억, 회상 설정 |
| 추억 | 검색, 필터, 정렬, 즐겨찾기, 선택 관리, 백업 복원 |
| 타임라인 | 월별 기록 조회 |
| 추가·수정 모달 | 파일, 제목, 설명, 태그, 날짜, 중요도 입력 |
| 상세 모달 | 기록 본문과 분석 결과 확인 |
| 모바일 탐색 | 홈, 추억, 추가, 타임라인, 다시보기 이동 |

### Hono 라우트

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| GET | `/` | 웹 화면 |
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 확인 |
| GET | `/api/categories` | 카테고리 목록 |
| GET, POST | `/api/memories` | 기록 목록 조회·생성 |
| GET, PUT, DELETE | `/api/memories/:id` | 기록 상세 조회·수정·삭제 |
| POST | `/api/upload` | R2 파일 업로드 |
| GET | `/api/files/*` | R2 파일 조회 |
| GET | `/api/statistics` | 기록 통계 |
| POST | `/api/connections` | 기록 간 관계 생성 |
| GET | `/api/export` | 기록 JSON 내보내기 |

### Python 라우트

Python API는 Hono와 별도 프로세스에서 실행합니다.

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| GET | `/` | API 안내 |
| GET | `/health` | 상태 확인 |
| GET | `/docs` | Swagger API 문서 |
| POST | `/api/ai/analyze` | 분석 요청 |
| GET | `/api/memories` | MySQL 기록 조회 |
| GET | `/api/stats/advanced` | 확장 통계 |
| POST | `/api/memories/batch-analyze` | 기록 일괄 분석 |

## 9. 업그레이드 구성

| 구분 | 반영 내용 |
| --- | --- |
| 기록 활용 | 즐겨찾기, 정렬, 선택 삭제, 사용자 태그 검색, 복제 |
| 회상 경험 | 오늘의 기억 추천, 타임라인, 무작위 다시보기, 방문 중 회상 안내 |
| 데이터 관리 | JSON 내보내기, 백업 병합 복원, 브라우저 저장 |
| 화면 개선 | 최신 스타일, 보관함 현황, 모바일 하단 메뉴 |
| 앱 확장 | Capacitor Android 프로젝트와 웹 화면 동기화 스크립트 |
| 공개 체험 | GitHub Pages용 체험판 내보내기와 포트폴리오 연결 |
| 문서 정리 | 프로젝트 구성, 실행 절차, 데이터 구조와 라우트 설명 정리 |

후속 개발 항목은 Hono와 MySQL의 영구 저장 연결, 사용자별 브라우저 데이터 분리, 서버와 브라우저의 동기화, 배포 환경의 실제 AI 분석 연결, 비밀번호 해시 방식 보완, Android 실기기 검증입니다. 회상 알림은 현재 사이트 방문 중 동작하며, 앱을 닫은 상태의 예약 알림은 별도 구현이 필요합니다.

## 10. 개발자

- 이름: 김아영
- 소속: 서원대학교 컴퓨터공학과
- 프로젝트: MemoryLink — AI 기반 디지털 유품 정리 서비스
- GitHub: [kimayeong21](https://github.com/kimayeong21)
- 포트폴리오: [Ayeong Kim Portfolio](https://kimayeong21.github.io/DNights.github.io/)
- 이메일: [cngot0000@naver.com](mailto:cngot0000@naver.com)
