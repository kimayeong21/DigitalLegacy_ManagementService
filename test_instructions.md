# MemoryLink 추억 추가 기능 테스트 가이드

## 🎯 추억 추가 기능 테스트 방법

### 1️⃣ 로그인
- 서비스 URL 접속
- 테스트 계정으로 로그인:
  - 이메일: `test@memorylink.com`
  - 비밀번호: `password123`

### 2️⃣ 추억 추가 버튼 클릭
- 우측 상단의 **"추억 추가"** 버튼 클릭
- 모달 창이 열립니다

### 3️⃣ 추억 정보 입력
**필수 항목:**
- **제목**: 추억의 제목을 입력하세요
  - 예: "제주도 여행", "생일 파티", "강아지 산책"

**선택 항목:**
- **파일 업로드**: 
  - 방법 1: 드래그 앤 드롭으로 이미지/동영상 업로드 (로컬 파일)
  - 방법 2: URL 직접 입력 (예: Unsplash 이미지 URL)
  - 예시 URL: `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800`

- **카테고리**: 사진, 동영상, 문서, SNS 게시물, 기타 등 선택

- **설명**: 추억에 대한 간단한 설명
  - 예: "제주도에서 가족들과 함께한 특별한 여행"

- **내용**: 더 자세한 내용
  - 예: "2024년 여름, 제주도 성산일출봉에서 일출을 보았습니다..."

- **AI 자동 분석**: 체크박스 선택 시 AI가 요약, 감정 분석, 키워드를 자동 생성
  - ⚠️ OpenAI API 키가 설정되어 있어야 작동합니다

- **중요도**: 1~10 슬라이더로 선택

- **원본 날짜**: 실제 추억이 만들어진 날짜/시간 선택

### 4️⃣ 저장
- **저장** 버튼 클릭
- "저장되었습니다!" 알림 확인
- 대시보드 또는 "내 추억" 페이지에서 추가된 추억 확인

---

## 🧪 API 테스트 (개발자용)

### 로그인 후 추억 추가
```bash
# 1. 로그인
curl -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@memorylink.com","password":"password123"}'

# 2. 추억 추가
curl -b /tmp/cookies.txt -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "title": "테스트 추억",
    "description": "테스트 설명입니다",
    "content": "테스트 내용입니다",
    "category_id": 1,
    "file_url": "https://images.unsplash.com/photo-1502945015378-0e284ca1a5be?w=800",
    "file_type": "image/jpeg",
    "importance_score": 8,
    "auto_analyze": false
  }'

# 3. 추억 목록 확인
curl -b /tmp/cookies.txt http://localhost:3000/api/memories?limit=5
```

---

## ✅ 테스트 완료 체크리스트

- [ ] 로그인 성공
- [ ] "추억 추가" 버튼 클릭 시 모달 열림
- [ ] 제목 입력
- [ ] 이미지 URL 입력 또는 파일 업로드
- [ ] 카테고리 선택
- [ ] 설명과 내용 입력
- [ ] 중요도 슬라이더 조정
- [ ] 저장 버튼 클릭
- [ ] "저장되었습니다!" 알림 표시
- [ ] 대시보드/추억 목록에서 새 추억 확인
- [ ] 추억 카드 클릭 시 상세 정보 표시

---

## 🖼️ 테스트용 이미지 URL 예시

```
https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800
https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800
https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800
https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800
https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800
```

---

## 🔧 문제 해결

### 로그인 실패 시
- 이메일/비밀번호를 정확히 입력했는지 확인
- 브라우저 쿠키가 활성화되어 있는지 확인

### 추억 저장 실패 시
- 제목(필수 항목)을 입력했는지 확인
- 브라우저 개발자 도구(F12) → Console 탭에서 에러 확인
- 네트워크 탭에서 API 응답 확인

### 이미지가 표시되지 않을 때
- URL이 올바른지 확인
- URL이 공개적으로 접근 가능한지 확인
- HTTPS URL을 사용하는지 확인
