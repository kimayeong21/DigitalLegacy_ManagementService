# AI 기반 디지털 유품 정리 서비스 - Python API

FastAPI 기반의 고급 AI 분석 및 데이터 처리 백엔드

## 📋 개요

Python 백엔드는 Hono/TypeScript 프론트엔드와 함께 작동하여 고급 AI 분석, 데이터 처리, 통계 분석 기능을 제공합니다.

## ✨ 주요 기능

### 🤖 AI 분석
- **감정 분석**: 텍스트의 긍정/부정/중립 감정 판단
- **키워드 추출**: 중요 키워드 자동 추출
- **요약 생성**: 긴 텍스트 자동 요약
- **일괄 분석**: 여러 추억 동시 분석

### 📊 고급 통계
- 카테고리별 통계
- 감정별 분포
- 월별 추억 추세
- 평균 중요도 계산

### 🔍 데이터 조회
- 추억 목록 조회 (페이지네이션)
- 고급 필터링
- JSON 응답

## 🚀 시작하기

### 의존성 설치

```bash
# Python 패키지 설치
pip3 install -r requirements.txt

# 또는 프로젝트 루트에서
npm run python:install
```

### 서버 실행

#### 방법 1: 직접 실행 (권장)
```bash
# Python 스크립트 직접 실행
python3 main.py

# 또는 실행 스크립트 사용
python3 run.py

# 또는 Bash 스크립트 사용
./start.sh
```

#### 방법 2: uvicorn 직접 실행
```bash
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 방법 3: PM2로 실행
```bash
# PM2로 백그라운드 실행
pm2 start ecosystem.config.cjs

# 상태 확인
pm2 list

# 로그 보기
pm2 logs memorylink-python

# 중지
pm2 stop memorylink-python
```

#### 방법 4: NPM 스크립트 사용
```bash
# 프로젝트 루트에서
npm run dev:python
```

### 헬스 체크

```bash
curl http://localhost:8000/health
```

## 📡 API 엔드포인트

### 기본
- `GET /` - API 정보
- `GET /health` - 헬스 체크
- `GET /docs` - Swagger UI 문서
- `GET /redoc` - ReDoc 문서

### AI 분석
- `POST /api/ai/analyze` - 텍스트 AI 분석
- `POST /api/memories/batch-analyze` - 일괄 추억 분석

### 데이터 조회
- `GET /api/memories` - 추억 목록
- `GET /api/stats/advanced` - 고급 통계

## 🔧 사용 예제

### AI 분석

```python
import requests

response = requests.post('http://localhost:8000/api/ai/analyze', json={
    "text": "오늘은 정말 행복한 하루였어요!",
    "analyze_sentiment": True,
    "extract_keywords": True,
    "generate_summary": True
})

print(response.json())
# {
#   "sentiment": "positive",
#   "keywords": ["오늘", "행복", "하루"],
#   "summary": "오늘은 정말 행복한 하루였어요!"
# }
```

### 고급 통계

```bash
curl http://localhost:8000/api/stats/advanced
```

### Swagger UI 접근

브라우저에서 http://localhost:8000/docs 를 열어 인터랙티브 API 문서를 확인하세요.

## 📁 파일 구조

```
python-api/
├── __init__.py          # 패키지 초기화
├── main.py              # FastAPI 애플리케이션 (메인)
├── run.py               # 실행 스크립트
├── start.sh             # Bash 실행 스크립트
├── models.py            # Pydantic 모델
├── utils.py             # 유틸리티 함수
├── requirements.txt     # 의존성 목록
├── ecosystem.config.cjs # PM2 설정
└── README.md            # 이 문서
```

## 🛠️ 기술 스택

- **FastAPI 0.109.0**: 최신 웹 프레임워크
- **Uvicorn**: ASGI 서버
- **Pydantic 2.8.2**: 데이터 검증
- **aiosqlite**: 비동기 SQLite
- **Python 3.12.11**: 최신 Python

## 🔗 통합

Hono/TypeScript 프론트엔드와 함께 사용:

```typescript
// Hono에서 Python API 호출
const response = await fetch('http://localhost:8000/api/ai/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: memory.content,
    analyze_sentiment: true
  })
});

const analysis = await response.json();
```

## 🧪 테스트

```bash
# 헬스 체크
curl http://localhost:8000/health

# AI 분석 테스트
curl -X POST http://localhost:8000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "테스트 텍스트", "analyze_sentiment": true}'

# 통계 조회
curl http://localhost:8000/api/stats/advanced
```

## 🐛 문제 해결

### 포트 8000이 이미 사용 중
```bash
# 프로세스 종료
fuser -k 8000/tcp

# 또는
lsof -ti:8000 | xargs kill -9
```

### 모듈을 찾을 수 없음
```bash
# PYTHONPATH 설정
export PYTHONPATH=/home/user/memorylink/python-api:$PYTHONPATH
python3 main.py
```

### 데이터베이스 연결 오류
- D1 데이터베이스가 생성되어 있는지 확인
- 데이터베이스 경로가 올바른지 확인

## 📝 TODO

- [ ] OpenAI API 통합
- [ ] 고급 NLP 분석
- [ ] 이미지 분석 (Vision API)
- [ ] 캐싱 추가 (Redis)
- [ ] 테스트 코드 작성
- [ ] Docker 이미지

## 📄 라이선스

MIT License
