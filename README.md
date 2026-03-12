# MemoryLink - AI 기반 디지털 유품 정리 서비스 v3.3

> ✅ **완전히 작동하는 프로덕션 준비 버전** - 로그인, 회원가입, 추억 추가/수정/삭제, 실시간 이미지 갤러리, AI 분석 통합, 향상된 FAB UI

## 📋 프로젝트 개요

**MemoryLink**는 사용자 인증과 AI 분석을 갖춘 완전한 디지털 추억 관리 서비스입니다. 회원가입 후 로그인하여 개인의 소중한 추억을 안전하게 보관하고, AI가 자동으로 분석해줍니다.

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
- ✅ **추억 추가**: 모달 UI로 쉽게 추가 (제목, 설명, 내용, 이미지 URL, 카테고리, 중요도)
- ✅ **이미지 업로드**: 
  - URL 직접 입력 (Unsplash 등)
  - 드래그 앤 드롭 파일 업로드 (로컬 파일)
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
- ✅ **마이그레이션**: 구조화된 DB 마이그레이션
- ✅ **시드 데이터**: 테스트용 샘플 데이터

---

## 🚀 빠른 시작 가이드

### 1️⃣ 로컬 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/kimayeong21/-1.git memorylink
cd memorylink

# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:migrate:local

# 초기 데이터 시드 (카테고리 + 테스트 사용자)
npm run db:seed
npx wrangler d1 execute memorylink-production --local --file=./seed_auth.sql

# 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 또는 직접 실행
npm run dev:sandbox
```

### 2️⃣ 서비스 접속

```bash
# 로컬 주소
http://localhost:3000
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

### users 테이블
```sql
id INTEGER PRIMARY KEY
email TEXT UNIQUE NOT NULL
password TEXT NOT NULL (SHA-256 해시)
name TEXT NOT NULL
avatar_url TEXT
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### sessions 테이블
```sql
id TEXT PRIMARY KEY (UUID)
user_id INTEGER
expires_at DATETIME
created_at DATETIME
```

### memories 테이블
```sql
id INTEGER PRIMARY KEY
user_id INTEGER (FK)
category_id INTEGER (FK)
title TEXT NOT NULL
description TEXT
content TEXT
file_url TEXT
file_type TEXT
tags TEXT (JSON)
ai_summary TEXT
ai_sentiment TEXT
ai_keywords TEXT (JSON)
importance_score INTEGER (1-10)
is_archived INTEGER
original_date DATETIME
created_at DATETIME
updated_at DATETIME
```

### categories 테이블
```sql
id INTEGER PRIMARY KEY
name TEXT NOT NULL
icon TEXT
color TEXT
created_at DATETIME
```

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

- **프로젝트**: MemoryLink
- **버전**: v3.2
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

**MemoryLink** - 소중한 추억을 영원히 간직하세요 💜
tps://openai.com/) - AI 분석 API
- [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 CSS 프레임워크

---

## 📮 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 GitHub Issues를 통해 연락해주세요!

**MemoryLink** - 소중한 추억을 영원히 간직하세요 💜
