# VSCode에서 AI 기반 디지털 유품 정리 서비스 실행하기

## 🎯 빠른 시작 (3단계)

### 1️⃣ VSCode로 프로젝트 열기
```bash
code /home/user/memorylink
```

### 2️⃣ Python API 실행 (F5)
- **메뉴**: 실행 > 디버깅 시작 (F5)
- **선택**: `🐍 Python: FastAPI (개발 서버)`
- **결과**: http://localhost:8000 에서 API 실행

### 3️⃣ Hono 서버 실행 (선택사항)
- **메뉴**: 실행 > 디버깅 시작 (F5)
- **선택**: `🟢 Node: Hono Dev Server`
- **결과**: http://localhost:3000 에서 웹 실행

---

## 🚀 실행 옵션

### Option 1: Python API만 실행
```bash
# 방법 1: dev.py 사용 (권장)
cd python-api
python3 dev.py

# 방법 2: main.py 직접 실행
cd python-api
python3 main.py

# 방법 3: uvicorn 직접 실행
cd python-api
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 방법 4: 실행 스크립트
cd python-api
./start.sh

# 방법 5: NPM 스크립트 (프로젝트 루트에서)
npm run dev:python
```

### Option 2: 풀스택 실행 (Python + Hono)
- **VSCode에서**: F5 → `🚀 Full Stack (Python + Hono)` 선택
- **명령줄에서**:
  ```bash
  # 터미널 1: Python API
  cd /home/user/memorylink/python-api
  python3 dev.py
  
  # 터미널 2: Hono Server
  cd /home/user/memorylink
  npm run build
  npm run dev:sandbox
  ```

---

## 🔧 VSCode 디버깅 설정

### 사용 가능한 구성 (F5)
1. **🐍 Python: FastAPI (개발 서버)** ⭐ 권장
   - `python-api/dev.py` 실행
   - 자동 새로고침 활성화
   - VSCode 터미널에서 실행

2. **🐍 Python: FastAPI (Main)**
   - `python-api/main.py` 직접 실행
   - 기본 실행 방식

3. **🐍 Python: FastAPI (Uvicorn)**
   - uvicorn 모듈로 실행
   - 고급 디버깅용

4. **🟢 Node: Hono Dev Server**
   - Hono 개발 서버 실행
   - npm 스크립트 사용

5. **🚀 Full Stack (Python + Hono)** ⭐ 풀스택
   - Python API + Hono 동시 실행
   - 포트 자동 정리

---

## 📍 접속 URL

### Python API (포트 8000)
- **기본**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **API 문서 (Swagger)**: http://localhost:8000/docs
- **API 문서 (ReDoc)**: http://localhost:8000/redoc

### Hono Server (포트 3000)
- **기본**: http://localhost:3000
- **API 엔드포인트**: http://localhost:3000/api/*

---

## 🛠️ VSCode 작업 (Ctrl+Shift+P)

### 편리한 작업들
- **Clean Ports**: 포트 3000, 8000 정리
- **Install Python Dependencies**: pip install
- **Install Node Dependencies**: npm install
- **Start Python API (Dev)**: Python API 시작 (dev.py)
- **Start Python API (Main)**: Python API 시작 (main.py)
- **Start Python API (Uvicorn)**: Python API 시작 (uvicorn)
- **Start Hono Server**: Hono 서버 시작
- **Build Project**: npm run build
- **Test Python API**: curl health 체크
- **Test Hono Server**: curl 테스트

### 작업 실행 방법
1. `Ctrl+Shift+P` 누르기
2. "Tasks: Run Task" 입력
3. 원하는 작업 선택

---

## 🐛 문제 해결

### 포트가 이미 사용 중입니다
```bash
# 포트 8000 정리
fuser -k 8000/tcp

# 포트 3000 정리
fuser -k 3000/tcp

# 또는 VSCode에서
# Ctrl+Shift+P → "Tasks: Run Task" → "Clean Ports"
```

### ModuleNotFoundError
```bash
# Python 경로 설정
export PYTHONPATH=/home/user/memorylink/python-api:$PYTHONPATH

# 또는 의존성 재설치
cd /home/user/memorylink
npm run python:install
```

### Database not found
```bash
# D1 데이터베이스 초기화
cd /home/user/memorylink
npm run db:migrate:local
npm run db:seed
```

---

## ✅ 실행 확인

### 1. Python API 확인
```bash
curl http://localhost:8000/health
# 결과: {"status":"healthy","timestamp":"...","python_version":"3.12.11"}
```

### 2. API 문서 확인
브라우저에서 http://localhost:8000/docs 열기

### 3. Hono 서버 확인
```bash
curl http://localhost:3000
# 결과: HTML 페이지
```

---

## 🎨 추천 VSCode 확장

### 필수 확장
- **Python** (ms-python.python)
- **Pylance** (ms-python.vscode-pylance)
- **Python Debugger** (ms-python.debugpy)

### 권장 확장
- **Black Formatter** (ms-python.black-formatter)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)
- **Thunder Client** (rangav.vscode-thunder-client)
- **REST Client** (humao.rest-client)

### 확장 자동 설치
VSCode가 `.vscode/extensions.json`을 읽고 권장 확장을 제안합니다.

---

## 📝 개발 팁

### 1. 자동 새로고침
- `dev.py` 또는 `main.py` 실행 시 코드 변경을 자동 감지
- 파일 저장 시 서버 자동 재시작

### 2. 디버깅 브레이크포인트
- 코드 왼쪽 줄 번호를 클릭하여 브레이크포인트 설정
- F5로 디버그 모드 실행
- F10 (Step Over), F11 (Step Into)

### 3. API 테스트
- Thunder Client 확장 사용 (VSCode 내장)
- 또는 Swagger UI 사용 (http://localhost:8000/docs)

### 4. 로그 확인
- VSCode 터미널에서 실시간 로그 확인
- 또는 `pm2 logs` 사용

---

## 🎯 다음 단계

1. **API 테스트**: http://localhost:8000/docs 에서 테스트
2. **프론트엔드 연동**: Hono 서버와 Python API 연동
3. **데이터베이스 설정**: D1 마이그레이션 및 시드 데이터
4. **배포**: Cloudflare Pages (Hono) + Railway/Render (Python)

---

## 📚 관련 문서

- **README.md**: 프로젝트 전체 문서
- **python-api/README.md**: Python API 상세 문서
- **test_instructions.md**: 테스트 가이드

---

**Happy Coding! 🚀**
