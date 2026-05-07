# AI 기반 디지털 유품 정리 서비스 v3.5.0

> ✅ **완전히 작동하는 프로덕션 준비 버전** - 로그인, 회원가입, 추억 추가/수정/삭제, **스크린샷 붙여넣기**, 실시간 이미지 갤러리, AI 분석 통합, 향상된 FAB UI, **Python FastAPI 백엔드**, **VSCode 완벽 지원**, **SQL 최적화 및 확장 기능** ⭐

## 📋 프로젝트 개요

**AI 기반 디지털 유품 정리 서비스**는 사용자 인증과 AI 분석을 갖춘 완전한 디지털 추억 관리 플랫폼입니다. 회원가입 후 로그인하여 개인의 소중한 추억을 안전하게 보관하고, AI가 자동으로 분석해줍니다.

## ✅ 현재 완료된 기능

### 🔐 사용자 인증 시스템
- ✅ **회원가입**: 새 계정 생성 (이메일, 비밀번호, 이름)
- ✅ **로그인**: 이메일/비밀번호 인증
- ✅ **비밀번호 암호화**: SHA-256 해싱으로 안전한 저장
- ✅ **세션 관리**: HttpOnly 쿠키 기반 세션 (7일 유효)
- ✅ **사용자별 데이터 격리**: 각 사용자는 본인의 추억만 접근
- ✅ **로그아웃**: 세션 종료 및 쿠키 삭제

### 📸 추억 관리 (완전 작동)
- ✅ **향상된 추억 추가 UI (NEW v3.3)**: 
  - 🎯 플로팅 액션 버튼 (FAB) 메뉴
  - 📷 사진 추가 (빠른 버튼)
  - 🎥 동영상 추가 (빠른 버튼)
  - 📄 문서 추가 (빠른 버튼)
  - 💬 SNS 게시물 추가 (빠른 버튼)
  - ✨ 애니메이션 효과 (회전 + 펼치기)
  - 🏷️ 라벨 툴팁 (마우스 호버)
  - 📱 모바일 반응형
- ✅ **추억 추가**: 모달 UI로 쉽게 추가 (제목, 설명, 내용, 이미지, 카테고리, 중요도)
- ✅ **이미지 업로드** (NEW v3.4.4): 
  - 📋 **스크린샷 붙여넣기**: Ctrl+V로 클립보드 이미지 직접 붙여넣기
  - 🖱️ **드래그 앤 드롭**: 파일을 드래그하여 업로드
  - 📁 **파일 선택**: 클릭하여 파일 선택
  - 🔗 **URL 직접 입력**: 외부 이미지 URL 입력 (Unsplash 등)
  - 💾 **Base64 저장**: 이미지를 데이터베이스에 직접 저장 (R2 불필요)
- ✅ **추억 수정**: 기존 추억 편집
- ✅ **추억 삭제**: 안전한 삭제 기능
- ✅ **상세 보기**: 모달로 추억 전체 정보 확인
- ✅ **이미지 갤러리**: 실제 고품질 사진 10장 포함 (Unsplash)
- ✅ **카테고리별 분류**: 사진, 동영상, 문서, SNS 게시물, 기타
- ✅ **검색 기능**: 제목, 설명, 내용으로 실시간 검색
- ✅ **카테고리 필터**: 특정 카테고리만 보기
- ✅ **페이지네이션**: 대량 데이터 효율적 처리 (12개/페이지)

### 🤖 AI 자동 분석 (OpenAI 통합)
- ✅ **요약 생성**: GPT-3.5로 추억 내용 요약
- ✅ **감정 분석**: 긍정😊 / 부정😢 / 중립😐 자동 판단
- ✅ **키워드 추출**: 중요 키워드 자동 추출
- ✅ **선택적 분석**: 체크박스로 AI 분석 켜기/끄기
- ⚠️ **설정 필요**: `.dev.vars`에 `OPENAI_API_KEY` 설정 필요

### 📊 대시보드 및 통계
- ✅ **총 추억 개수** 표시
- ✅ **감정별 통계**: 긍정/부정/중립 개수
- ✅ **평균 중요도**: 1-10 점수 평균
- ✅ **카테고리별 분포**: 각 카테고리 추억 개수
- ✅ **최근 추억**: 최신 5개 추억 미리보기

### 🖼️ 갤러리 및 타임라인
- ✅ **그리드 레이아웃**: 카드 형식 이미지 갤러리
- ✅ **타임라인 뷰**: 연/월별 시간순 정렬
- ✅ **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- ✅ **호버 효과**: 카드 마우스오버 애니메이션

### 📤 파일 관리
- ✅ **드래그 앤 드롭**: 파일 끌어서 업로드
- ✅ **URL 입력**: 외부 이미지 URL 지원
- ✅ **파일 미리보기**: 업로드 후 즉시 미리보기
- ✅ **다양한 포맷**: 이미지 (JPG, PNG, GIF 등), 동영상 지원

### 💾 데이터 관리
- ✅ **JSON 내보내기**: 모든 추억 백업
- ✅ **데이터베이스**: Cloudflare D1 (SQLite)
- ✅ **마이그레이션**: 구조화된 DB 마이그레이션 (4단계)
- ✅ **시드 데이터**: 테스트용 샘플 데이터
- ✅ **SQL 최적화** (NEW v3.5.0):
  - 📊 **성능 인덱스**: 15+ 최적화된 인덱스
  - ⚡ **자동 트리거**: updated_at 자동 업데이트
  - 🔍 **뷰 (Views)**: 복잡한 쿼리 간소화
  - 📈 **통계 뷰**: user_statistics, monthly_memory_stats
  - 🔗 **조인 뷰**: memories_with_categories
- ✅ **확장 테이블** (NEW v3.5.0):
  - 📝 **activity_logs**: 사용자 활동 추적
  - 🔗 **shared_memories**: 추억 공유 기능
  - ⭐ **favorites**: 즐겨찾기/북마크
  - 💬 **memory_comments**: 댓글 시스템
  - 🔔 **notification_settings**: 알림 설정

---

## 🚀 빠른 시작 가이드

### ⚡ VSCode에서 바로 실행 (권장) ⭐

```bash
# 1. VSCode로 프로젝트 열기
code /home/user/memorylink

# 2. F5 누르기
# 3. 실행 구성 선택: "🐍 Python: FastAPI (개발 서버)"
# 4. 완료! http://localhost:8000 에서 API 실행 중
```

**📖 자세한 VSCode 가이드**: [`VSCODE_GUIDE.md`](./VSCODE_GUIDE.md) 참고

---

### 1️⃣ 로컬 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/kimayeong21/-1.git memorylink
cd memorylink

# Node.js 의존성 설치
npm install

# Python 의존성 설치 (NEW v3.4+)
npm run python:install

# 데이터베이스 마이그레이션
npm run db:migrate:local

# 초기 데이터 시드 (카테고리 + 테스트 사용자)
npm run db:seed
npx wrangler d1 execute memorylink-production --local --file=./seed_auth.sql
```

### 2️⃣ 서버 실행

#### Option A: Python API만 실행
```bash
# 방법 1: dev.py 사용 (권장)
cd python-api
python3 dev.py

# 방법 2: NPM 스크립트
npm run dev:python

# 접속: http://localhost:8000
# API 문서: http://localhost:8000/docs
```

#### Option B: Hono 서버만 실행
```bash
# 빌드 후 실행
npm run build
npm run dev:sandbox

# 접속: http://localhost:3000
```

#### Option C: 풀스택 실행 (Python + Hono)
```bash
# 터미널 1: Python API
cd python-api && python3 dev.py

# 터미널 2: Hono Server
npm run build && npm run dev:sandbox

# Python API: http://localhost:8000
# Hono Server: http://localhost:3000
```

### 3️⃣ 테스트 계정 로그인

- **이메일**: `test@memorylink.com`
- **비밀번호**: `password123`

---

## 🎯 추억 추가 사용 방법

### 단계별 가이드

1. **로그인** - 테스트 계정 또는 새 계정으로 로그인
2. **추억 추가 버튼 클릭** - 우측 상단 "추억 추가" 버튼
3. **정보 입력**:
   - **제목** (필수): 예) "제주도 여행"
   - **이미지**: URL 입력 또는 파일 드래그 앤 드롭
   - **카테고리**: 사진, 동영상, 문서 등 선택
   - **설명**: 간단한 설명
   - **내용**: 자세한 내용
   - **중요도**: 1-10 슬라이더
   - **AI 자동 분석**: 체크박스 선택 (OpenAI API 키 필요)
4. **저장** - "저장" 버튼 클릭
5. **확인** - 대시보드 또는 "내 추억"에서 추가된 추억 확인

### 이미지 URL 예시

```
https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800
https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800
https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800
```

---

## 🛠️ API 엔드포인트

### 인증 API (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 추억 API (Protected - 로그인 필요)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | 카테고리 목록 (Public) |
| GET | `/api/memories` | 추억 목록 (페이지네이션) |
| GET | `/api/memories/:id` | 추억 상세 정보 |
| POST | `/api/memories` | 새 추억 생성 |
| PUT | `/api/memories/:id` | 추억 수정 |
| DELETE | `/api/memories/:id` | 추억 삭제 |
| GET | `/api/statistics` | 통계 정보 |
| GET | `/api/export` | JSON 백업 |

### 파일 API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | 파일 업로드 (R2) |
| GET | `/api/files/:key` | 파일 가져오기 |

---

## 🗄️ 데이터베이스 구조

### 핵심 테이블

1. **users** - 사용자 계정
2. **sessions** - 인증 세션
3. **memories** - 디지털 추억/유품
4. **categories** - 카테고리 분류
5. **connections** - 추억 간 연결

### 확장 테이블 (v3.5.0)

6. **activity_logs** - 사용자 활동 로그
7. **shared_memories** - 공유 기능
8. **favorites** - 즐겨찾기
9. **memory_comments** - 댓글
10. **notification_settings** - 알림 설정

### 데이터베이스 뷰

- **memories_with_categories** - 추억 + 카테고리 조인
- **user_statistics** - 사용자별 통계
- **monthly_memory_stats** - 월별 통계

**📖 전체 스키마 문서**: [`db/schema.md`](./db/schema.md) 참고  
**📝 쿼리 예제**: [`db/queries.sql`](./db/queries.sql) 참고  
**🔧 데이터베이스 가이드**: [`db/README.md`](./db/README.md) 참고

---

## ⚙️ 환경 변수 설정

### 로컬 개발 (`.dev.vars`)

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 프로덕션 (Cloudflare Pages)

```bash
# OpenAI API 키 설정
npx wrangler pages secret put OPENAI_API_KEY --project-name memorylink
```

---

## 📜 NPM 스크립트

```bash
# 개발
npm run dev                    # Vite 개발 서버
npm run dev:sandbox            # Wrangler 개발 서버 (D1 포함)
npm run dev:d1                 # D1 데이터베이스 포함 개발 서버

# 빌드 및 배포
npm run build                  # 프로덕션 빌드
npm run preview                # 빌드 미리보기
npm run deploy                 # Cloudflare Pages 배포
npm run deploy:prod            # 프로덕션 배포

# 데이터베이스
npm run db:migrate:local       # 로컬 마이그레이션 적용
npm run db:migrate:prod        # 프로덕션 마이그레이션 적용
npm run db:seed                # 기본 시드 데이터
npm run db:reset               # 데이터베이스 초기화
npm run db:console:local       # 로컬 D1 콘솔

# 유틸리티
npm run clean-port             # 포트 3000 정리
npm test                       # 서비스 테스트
```

---

## 🚀 프로덕션 배포

### Cloudflare Pages 배포

```bash
# 1. 데이터베이스 생성
npx wrangler d1 create memorylink-production

# 2. wrangler.jsonc에 database_id 추가

# 3. 마이그레이션 적용
npm run db:migrate:prod

# 4. 배포
npm run deploy:prod
```

---

## 🔧 문제 해결

### 로그인 실패 시
- 이메일/비밀번호 확인
- 브라우저 쿠키 활성화 확인
- 테스트 계정: `test@memorylink.com` / `password123`

### 추억 저장 실패 시
- 제목(필수 항목) 입력 확인
- 브라우저 개발자 도구(F12) → Console 탭 확인
- Network 탭에서 API 응답 확인

### 이미지 표시 안 됨
- URL 형식 확인 (HTTPS 권장)
- CORS 정책 확인
- 공개 접근 가능한 URL 사용

### AI 분석 작동 안 함
- `.dev.vars`에 `OPENAI_API_KEY` 설정 확인
- API 키 유효성 확인
- "AI 자동 분석" 체크박스 활성화 확인

---

## 🎨 기술 스택

### Frontend
- **HTML5** + **CSS3** (Tailwind CDN)
- **Vanilla JavaScript** (모던 ES6+)
- **Axios** (HTTP 클라이언트)
- **Font Awesome** (아이콘)

### Backend
- **Hono** (경량 웹 프레임워크)
- **TypeScript**
- **Cloudflare Workers** (Edge Runtime)

### Database
- **Cloudflare D1** (SQLite, Edge Locations)

### Storage
- **Cloudflare R2** (Object Storage, S3 호환)

### AI
- **OpenAI GPT-3.5 Turbo** (요약, 감정, 키워드)

### Deployment
- **Cloudflare Pages** (CDN + 자동 배포)
- **Wrangler** (CLI 도구)

### Development
- **Vite** (빌드 도구)
- **PM2** (프로세스 관리)

---

## 📊 프로젝트 통계

- **코드 라인 수**: ~2,000 라인 (TypeScript + SQL)
- **파일 크기**: 빌드 후 ~107KB
- **데이터베이스**: 5개 테이블, 15+ 인덱스
- **API 엔드포인트**: 15+
- **샘플 데이터**: 카테고리 7개, 추억 10개
- **UI 컴포넌트**: FAB 메뉴, 모달, 카드, 타임라인 등

---

### v3.3 (2026-03-12)
- ✨ **향상된 FAB UI**: 플로팅 액션 버튼 메뉴 추가
- 📷 사진/동영상/문서/SNS 타입별 빠른 추가 버튼
- ✨ 애니메이션 효과 (회전 + 펼치기)
- 🏷️ 라벨 툴팁 (마우스 호버)
- 📱 모바일 반응형 FAB
- 🎨 카테고리별 자동 선택 기능
- 📄 FAB 데모 페이지 추가

## 📝 변경 이력

### v3.5.0 (2026-05-07) ⭐ NEW
- 🗄️ **SQL 기반 마이그레이션 시스템**: 4단계 구조화된 DB 마이그레이션
- ⚡ **쿼리 성능 최적화**: 15+ 최적화된 인덱스 추가
- 🔍 **복합 인덱스**: user_id와 category_id, created_at, importance_score 조합 인덱스
- 📊 **데이터베이스 뷰 3개**: 
  - `memories_with_categories`: 카테고리 정보 포함 추억 조회
  - `user_statistics`: 사용자별 통계 (총 추억, 감정 분포, 평균 중요도)
  - `monthly_memory_stats`: 월별 추억 통계
- ⏰ **자동 트리거**: memories와 users 테이블 updated_at 자동 업데이트
- 📝 **활동 로그 시스템**: activity_logs 테이블로 사용자 행동 추적
- 🔗 **추억 공유 기능**: shared_memories 테이블 (UUID 기반 공유 링크)
- ⭐ **즐겨찾기 시스템**: favorites 테이블로 북마크 관리
- 💬 **댓글 시스템**: memory_comments 테이블 (대댓글 지원)
- 🔔 **알림 설정**: notification_settings 테이블
- 📚 **데이터베이스 문서화**:
  - `db/schema.md`: 전체 스키마 문서 (ERD 포함)
  - `db/queries.sql`: 자주 사용하는 SQL 쿼리 모음
  - `db/README.md`: 데이터베이스 관리 가이드
- 🚀 **마이그레이션 파일**:
  - `0001_initial_schema.sql`: 초기 스키마
  - `0002_add_auth.sql`: 인증 시스템
  - `0003_optimize_queries.sql`: 쿼리 최적화 (NEW)
  - `0004_add_analytics.sql`: 분석 및 확장 기능 (NEW)

### v3.4.4 (2026-03-17)
- 🐛 **버그 수정**: 추억 추가 기능 정상 작동
- 📋 **스크린샷 붙여넣기**: Ctrl+V로 클립보드 이미지 직접 업로드
- 🖼️ **이미지 업로드 개선**: Base64 인코딩으로 데이터베이스에 직접 저장
- 🎨 **드래그 앤 드롭**: 파일을 드래그하여 간편하게 업로드
- 📁 **파일 크기 검증**: 최대 10MB 제한 및 안내
- ✅ **실시간 미리보기**: 이미지 업로드 전 미리보기 제공
- 💡 **UI 개선**: 업로드 상태에 따른 색상 피드백 (파란색/초록색/노란색)
- 🔧 **R2 의존성 제거**: 이미지 저장을 위한 외부 스토리지 불필요
- 📊 빌드 크기: 109.61 kB

### v3.4.3 (2026-03-17)
- ✅ **브랜딩 개선**: MemoryLink 제거, "AI 기반 디지털 유품 정리 서비스"로 통일
- ✅ **코드베이스 정리**: 모든 파일에서 MemoryLink 레퍼런스 제거
- ✅ **문서 업데이트**: README, 테스트 가이드, Python API 문서 전면 개편
- 🎨 간결하고 명확한 서비스 네이밍

### v3.4.2 (2026-03-17)
- ✅ **VSCode 완벽 지원**: F5로 바로 실행 가능
- ✅ **dev.py 추가**: 간편한 개발 서버 실행 스크립트
- ✅ **launch.json 개선**: 4가지 디버깅 구성 + 풀스택 실행
- ✅ **tasks.json 개선**: 포트 정리, 의존성 설치, 빌드/테스트 자동화
- ✅ **VSCODE_GUIDE.md 추가**: 완전한 VSCode 사용 가이드
- ✅ **실행 방법 다양화**: Python API 5가지 실행 방법 제공
- ✅ **README 개편**: VSCode 빠른 시작 가이드 추가
- 📚 기술 스택: Python 3.12.11, FastAPI 0.109.0, debugpy, Uvicorn
- 🔧 디버깅: 브레이크포인트, Step Over/Into, 변수 검사
- 🎨 VSCode 확장: Python, Pylance, Black Formatter, Thunder Client

### v3.4.1 (2026-03-15)
- ✅ Python API main.py 실행 수정
- ✅ 4가지 실행 방법 추가 (direct, shell, PM2, NPM)
- ✅ 시작 배너 및 URL 표시
- ✅ 자동 새로고침 활성화
- ✅ 로그 레벨 설정

### v3.4 (2026-03-13)
- ✅ Python FastAPI 백엔드 추가
- ✅ AI 분석 API (감정, 키워드, 요약)
- ✅ 고급 통계 API
- ✅ 일괄 분석 기능
- ✅ VSCode 통합 (.vscode 설정)

### v3.3 (2026-03-12)
- ✅ FAB UI 개선 (플로팅 액션 버튼 메뉴)
- ✅ 빠른 추가 버튼 (사진/동영상/문서/SNS)
- ✅ 애니메이션 효과 및 툴팁
- ✅ 모바일 반응형 FAB
- ✅ 카테고리 자동 선택
- ✅ FAB 데모 페이지

### v3.2 (2026-03-10)
- ✅ 추억 추가 기능 완전 작동 확인
- ✅ URL 입력 및 파일 드래그 앤 드롭 지원
- ✅ 테스트 가이드 문서 추가
- ✅ README 전면 개편

### v3.1 (2026-03-09)
- ✅ 비밀번호 해시 수정 (SHA-256)
- ✅ 로그인/회원가입 기능 검증
- ✅ 추억 추가/수정/삭제 테스트 완료

### v3.0 (2025-12-13)
- 🔐 사용자 인증 시스템 추가
- 📸 실제 사진 10장 통합
- 🤖 OpenAI AI 분석 통합
- 📊 대시보드 및 통계
- 🖼️ 갤러리 및 타임라인 뷰

### v2.0
- 📤 파일 업로드 (R2)
- 💾 데이터 내보내기
- 📱 반응형 UI

### v1.0
- 🎯 초기 프로젝트 구조
- 🗄️ D1 데이터베이스 설정
- 🌐 기본 API 구현

---

## 📄 라이선스

MIT License

---

## 👨‍💻 개발자

- **프로젝트**: AI 기반 디지털 유품 정리 서비스
- **버전**: v3.4.3
- **GitHub**: https://github.com/kimayeong21/-1
- **테크**: Hono + Cloudflare Workers/Pages + D1 + R2 + OpenAI

---

## 🙏 감사의 말

- [Hono](https://hono.dev/) - 빠르고 경량인 웹 프레임워크
- [Cloudflare](https://cloudflare.com/) - 엣지 컴퓨팅 플랫폼
- [Unsplash](https://unsplash.com/) - 고품질 무료 이미지
- [OpenAI](https://openai.com/) - AI 분석 API
- [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 CSS 프레임워크

---

## 📮 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 GitHub Issues를 통해 연락해주세요!

**AI 기반 디지털 유품 정리 서비스** - 소중한 추억을 영원히 간직하세요 💜
tps://openai.com/) - AI 분석 API
- [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 CSS 프레임워크

---

## 📮 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 GitHub Issues를 통해 연락해주세요!

**AI 기반 디지털 유품 정리 서비스** - 소중한 추억을 영원히 간직하세요 💜

## 🐍 Python FastAPI 백엔드 (NEW v3.4)

### 주요 기능
- ✅ **FastAPI 서버**: 고성능 비동기 Python 백엔드
- ✅ **AI 분석 API**: 감정 분석, 키워드 추출, 요약 생성
- ✅ **고급 통계**: 월별 추세, 카테고리 분포, 감정 분석
- ✅ **일괄 처리**: 여러 추억 동시 분석
- ✅ **데이터베이스 통합**: aiosqlite로 D1 SQLite 접근

### API 엔드포인트 (포트 8000)
```
GET  /health                      # 헬스 체크
POST /api/ai/analyze              # AI 텍스트 분석
GET  /api/memories                # 추억 목록 조회
GET  /api/stats/advanced          # 고급 통계
POST /api/memories/batch-analyze  # 일괄 분석
```

### 빠른 시작
```bash
# Python 의존성 설치
npm run python:install

# Python API 서버 시작
npm run dev:python

# 헬스 체크
npm run test:python
```

## 💻 VSCode 통합 개발 환경

### 설치된 설정
- ✅ **launch.json**: Python FastAPI 디버깅 설정
- ✅ **tasks.json**: 빌드, 테스트, 서버 시작 태스크
- ✅ **settings.json**: Python/TypeScript 포매터 설정
- ✅ **extensions.json**: 권장 확장 프로그램

### VSCode에서 실행하기

1. **VSCode 열기**
   ```bash
   code /home/user/memorylink
   ```

2. **디버그 실행**
   - `F5` 또는 Run > Start Debugging
   - "Python: FastAPI" 선택 → Python API 디버깅
   - "Node: Hono Dev Server" 선택 → Hono 서버 디버깅
   - "🚀 Full Stack (Python + Hono)" 선택 → 동시 실행

3. **터미널 작업**
   - `Ctrl+Shift+B` → Build Task 실행
   - Terminal > Run Task → 다양한 작업 선택

### 권장 확장 프로그램
- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)
- Black Formatter (ms-python.black-formatter)
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Thunder Client (rangav.vscode-thunder-client)

