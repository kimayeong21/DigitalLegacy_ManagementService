# MemoryLink

AI 기반 디지털 유품 정리 및 추억 회상 서비스

MemoryLink는 사진, 영상, 문서, 음성, SNS 기록처럼 여러 위치에 흩어진 개인 자료를 분석하고 정리하는 서비스입니다. 단순한 디지털 일기장이 아니라 중요한 기록을 디지털 유품으로 선별하고, 보존 상태와 전달 계획까지 관리하는 것을 목표로 합니다.

## 프로젝트 핵심 가치

- 흩어진 디지털 자료를 한곳에서 관리합니다.
- AI가 자료의 내용, 유형, 날짜, 감정, 키워드와 중요도를 분석합니다.
- 분석 결과에 맞춰 폴더를 만들고 자료를 자동 분류합니다.
- 중복되거나 보존 가치가 낮은 자료를 정리 대상으로 제안합니다.
- 중요한 기록을 디지털 유품 보관함에 저장합니다.
- 지정한 가족이나 지인에게 전달할 유품과 조건을 관리합니다.
- 과거의 의미 있는 기록을 다시 추천해 추억을 지속적으로 회상할 수 있게 합니다.

## 구현 기능

### AI 기반 정리

| 기능 | 설명 |
| --- | --- |
| AI 유품 자동 분석 | 사진, 영상, 문서, 음성의 내용, 날짜, 유형, 감정과 키워드를 분석합니다. |
| AI 자동 폴더 분류 | 분석된 자료를 사진, 가족, 여행, 문서, SNS 등 적합한 폴더로 분류합니다. |
| AI 폴더 자동 생성 | 자료의 특징에 맞는 새로운 폴더를 추천하고 생성합니다. |
| 폴더별 자동 저장 | 분석 결과에 따라 각 자료에 폴더 정보를 자동 지정합니다. |
| 중요도 자동 산정 | 가족, 기념일, 편지, 첫 기록 등의 특징을 바탕으로 중요도를 계산합니다. |
| 중요 유품 자동 선별 | 중요도가 높은 자료를 디지털 유품 후보로 추천합니다. |

### 중복 및 불필요 자료 정리

| 기능 | 설명 |
| --- | --- |
| 파일 해시 검사 | 업로드 파일의 SHA-256 해시를 계산해 동일 파일을 확인합니다. |
| 유사 자료 탐색 | 파일명, 제목과 내용의 유사도를 함께 비교합니다. |
| 중복 그룹 관리 | 동일하거나 유사한 자료를 그룹으로 표시합니다. |
| 정리 추천 | 중복, 낮은 중요도, 내용이 없는 자료를 정리 후보로 제안합니다. |
| 상태 관리 | 자료를 보존, 삭제 예정, 보류, 전달 예정 상태로 관리합니다. |
| 휴지통과 복원 | 삭제한 자료를 임시 보관하고 필요할 때 복원합니다. |

### 디지털 유품 관리

| 기능 | 설명 |
| --- | --- |
| 디지털 유품 보관함 | 보존하기로 결정한 중요 자료를 별도 보관함에서 관리합니다. |
| 전달 계획 | 수신인, 관계, 전달 조건과 전달 예정일을 설정합니다. |
| 전달 패키지 | 전달 정보를 JSON 파일로 내려받을 수 있습니다. |
| 전달 완료 관리 | 전달 계획의 진행 상태를 기록합니다. |

### 추억 회상 및 탐색

| 기능 | 설명 |
| --- | --- |
| 오늘의 기억 | 날짜, 감정과 중요도를 기준으로 여러 추억을 추천합니다. |
| 추억 타임라인 | 저장된 자료를 연도와 월 단위로 탐색합니다. |
| AI 내용 요약 | 기록의 핵심 내용과 감정, 장면, 분위기를 요약합니다. |
| 스마트 검색 | 제목, 내용, 태그, 날짜, 카테고리와 감정으로 검색합니다. |
| 회상 알림 | 설정한 주기와 시간에 맞춰 다시 볼 기억을 안내합니다. |
| 정리 현황 대시보드 | 전체 자료, 분류 완료, 중복, 정리 추천과 중요 유품 현황을 표시합니다. |

### 사용자 및 자료 관리

| 기능 | 설명 |
| --- | --- |
| 회원가입과 로그인 | 사용자별 계정과 세션을 관리합니다. |
| 직접 파일 업로드 | 사진, 영상, 문서와 음성 파일을 직접 선택해 등록합니다. |
| Google Drive 연동 | Google OAuth 승인 후 Drive 파일을 조회하고 가져옵니다. |
| 폴더 직접 관리 | 폴더 생성, 이름 변경, 삭제와 자료 이동을 지원합니다. |
| 기록 관리 | 자료 추가, 조회, 수정, 복제와 삭제를 지원합니다. |
| 백업과 복원 | 기록을 JSON으로 내보내고 기존 데이터와 병합합니다. |

## Google Drive 연결 안내

Google Drive 연동 코드는 구현되어 있으며 실제 계정 연결에는 Google Cloud Console에서 발급한 OAuth 2.0 웹 클라이언트 ID가 필요합니다.

1. Google Cloud 프로젝트를 생성합니다.
2. Google Drive API를 사용 설정합니다.
3. OAuth 동의 화면을 구성합니다.
4. 웹 애플리케이션용 OAuth 클라이언트 ID를 생성합니다.
5. 승인된 JavaScript 원본에 서비스 주소를 등록합니다.
6. MemoryLink의 Google Drive 연결 화면에 클라이언트 ID를 입력합니다.

API 키나 OAuth 비밀값은 GitHub 저장소에 커밋하지 않습니다.

## 기술 구성

| 구분 | 기술 |
| --- | --- |
| 웹 애플리케이션 | TypeScript, Hono, HTML, CSS, JavaScript |
| 빌드 및 개발 서버 | Vite, Node.js |
| 웹 API | Hono API |
| 분석 API | Python, FastAPI |
| 데이터베이스 | MySQL, mysql2, aiomysql |
| AI 분석 | OpenAI API, 로컬 규칙 기반 분석 |
| 파일 저장 확장 | Cloudflare R2 |
| 모바일 앱 | Capacitor, Android, Gradle |
| 배포 | Cloudflare Pages, GitHub Pages |

## 프로젝트 구조

```text
DigitalLegacy_ManagementService/
|-- src/
|   |-- index.tsx
|   `-- renderer.tsx
|-- public/static/
|   |-- feature-complete.js
|   |-- premium.css
|   `-- style.css
|-- python-api/
|-- android/
|-- migrations/
|-- db/
|-- scripts/
|-- .dev.vars.example
|-- capacitor.config.json
|-- package.json
|-- vite.config.ts
`-- wrangler.jsonc
```

`src/index.tsx`에는 인증, 기록 관리 API와 전체 웹 화면이 포함되어 있습니다. `public/static/feature-complete.js`에는 자동 분류, 중복 검사, 폴더 관리, 전달 패키지와 Google Drive 연동 기능이 포함되어 있습니다.

## 웹 실행 방법

### 준비 사항

- Node.js 20 이상
- npm
- Git

### 설치 및 실행

```bash
git clone https://github.com/kimayeong21/DigitalLegacy_ManagementService.git
cd DigitalLegacy_ManagementService
npm install
npm run dev -- --host 127.0.0.1 --port 4175
```

브라우저에서 `http://127.0.0.1:4175`에 접속합니다.

### 휴대폰에서 접속

PC와 휴대폰을 같은 Wi-Fi 또는 같은 공유기에 연결한 뒤 서버를 백그라운드로 실행합니다.

```powershell
.\start-memorylink.ps1
```

현재 개발 PC의 모바일 접속 주소는 다음과 같습니다.

```text
http://192.168.0.100:4175/
```

`127.0.0.1`은 접속한 기기 자신을 의미하므로 휴대폰에서 사용할 수 없습니다. 휴대폰에서는 PC의 사설 IP 주소를 사용해야 합니다. Windows 방화벽이 접속을 차단하면 `allow-mobile-access.ps1`을 실행하고 표시되는 관리자 권한 요청을 승인합니다.

이 방식은 PC가 켜져 있고 MemoryLink 백그라운드 서버가 실행 중일 때 같은 네트워크에서 사용할 수 있습니다. 인터넷 어디서나 접속하려면 Cloudflare Pages 같은 공개 호스팅에 별도로 배포해야 합니다.

### 운영 빌드

```bash
npm run build
```

### 빌드 결과 미리보기

```bash
npm run preview
```

## 환경 변수

`.dev.vars.example`을 `.dev.vars`로 복사한 후 환경에 맞게 수정합니다.

```dotenv
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=memorylink
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.2
```

실제 비밀번호와 API 키는 저장소에 업로드하지 않습니다.

## MySQL 설정

MySQL 서버를 실행한 후 다음 명령으로 테이블과 초기 데이터를 구성합니다.

```bash
npm run db:mysql:setup
```

| 테이블 | 역할 |
| --- | --- |
| users | 사용자 계정과 프로필 |
| sessions | 로그인 세션과 만료 시간 |
| categories | 자료 분류 기준 |
| memories | 기록, 첨부 자료와 AI 분석 결과 |
| connections | 기록 간 연결 관계 |

## Python 분석 API 실행

```bash
python -m pip install -r python-api/requirements.txt
python -m uvicorn main:app --app-dir python-api --reload --host 127.0.0.1 --port 8000 --env-file .dev.vars
```

- 상태 확인: `http://127.0.0.1:8000/health`
- API 문서: `http://127.0.0.1:8000/docs`

## Android 실행

Android Studio, Android SDK와 JDK를 설치한 후 진행합니다.

```bash
npm run android:sync
npm run android:open
```

Windows에서 디버그 APK를 생성하려면 다음 명령을 사용합니다.

```bash
npm run android:apk
```

## 주요 API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 확인 |
| GET, POST | `/api/memories` | 자료 목록 조회와 생성 |
| GET, PUT, DELETE | `/api/memories/:id` | 자료 상세 조회, 수정과 삭제 |
| POST | `/api/upload` | 파일 업로드 |
| GET | `/api/statistics` | 정리 현황 통계 |
| GET | `/api/export` | 기록 내보내기 |

## 데이터 저장 방식

웹 화면은 데이터베이스 연결이 없는 환경에서도 실행할 수 있도록 브라우저 저장소를 지원합니다. 서버 DB 바인딩이 구성되면 API 저장 방식을 사용할 수 있습니다.

브라우저 저장소를 삭제하면 로컬 데이터도 함께 삭제됩니다. 실제 서비스 배포에서는 MySQL 연결, 서버 저장, 비밀번호 해시 정책, HTTPS와 접근 권한을 반드시 구성해야 합니다.

## 개발 및 검증 상태

- 핵심 기능표의 웹 기능 구현 완료
- 회원가입과 로그인 흐름 확인
- 파일 업로드 및 해시 계산 구현
- AI 자동 분석과 폴더 생성 확인
- 중복 및 정리 추천 화면 구현
- 폴더 생성, 수정, 삭제와 자료 이동 구현
- 디지털 유품 보관 및 전달 관리 구현
- 데스크톱, 태블릿과 모바일 반응형 화면 적용
- Vite 운영 빌드 검증 완료

Google Drive 연동과 OpenAI 분석은 각 서비스의 인증 정보가 설정된 환경에서 동작합니다. Android 앱은 실제 기기 배포 전에 서명 설정과 실기기 검증이 필요합니다.

## 개발자

- 김아영
- 서원대학교 컴퓨터공학과
- GitHub: [kimayeong21](https://github.com/kimayeong21)
- 포트폴리오: [Ayeong Kim Portfolio](https://kimayeong21.github.io/DNights.github.io/)
- 이메일: [cngot0000@naver.com](mailto:cngot0000@naver.com)

