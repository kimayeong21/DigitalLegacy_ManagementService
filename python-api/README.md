# Python API

AI 기반 추억 관리 서비스의 FastAPI 보조 서버입니다. TypeScript/Hono 앱과 같은 MySQL 데이터베이스를 사용하며, 추억 데이터 조회와 AI 분석 보조 기능을 제공합니다.

## 주요 기능

- FastAPI 기반 REST API
- MySQL 연결
- 사용자별 추억 목록 조회
- 고급 통계 조회
- 텍스트 기반 AI 분석
- OpenAI API 키가 없을 때 로컬 fallback 분석

## 설치

```bash
pip install -r requirements.txt
```

프로젝트 루트에서 실행할 경우:

```bash
npm run python:install
```

## 환경 변수

루트 `.dev.vars` 또는 실행 환경에 다음 값을 설정합니다.

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=비밀번호
MYSQL_DATABASE=memorylink
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.2
```

## 실행

```bash
python main.py
```

또는 프로젝트 루트에서:

```bash
npm run dev:python
```

uvicorn으로 직접 실행:

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 확인

```bash
curl http://localhost:8000/health
```

Swagger 문서:

```text
http://localhost:8000/docs
```

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/` | API 정보 |
| `GET` | `/health` | 상태 확인 |
| `POST` | `/api/ai/analyze` | 텍스트 기반 AI 분석 |
| `POST` | `/api/memories/batch-analyze` | 여러 추억 일괄 분석 |
| `GET` | `/api/memories` | 추억 목록 조회 |
| `GET` | `/api/stats/advanced` | 고급 통계 조회 |

## 사용 기술

- FastAPI
- Uvicorn
- Pydantic
- aiomysql
- OpenAI Python SDK

## 참고

이 서버는 SQLite를 사용하지 않습니다. 데이터베이스는 MySQL로 연결되며, 스키마는 프로젝트 루트의 `migrations/mysql_schema.sql`과 `migrations/mysql_ai_insights.sql`을 기준으로 합니다.
