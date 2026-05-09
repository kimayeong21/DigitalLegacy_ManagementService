"""
AI 기반 디지털 유품 정리 서비스 - Python API
FastAPI backend for advanced AI analysis and data processing
"""

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import aiomysql
import asyncio
import urllib.request
import os
from datetime import datetime
import json

app = FastAPI(
    title="AI 기반 디지털 유품 정리 서비스 API",
    description="Advanced AI analysis and data processing backend",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MySQL database connection settings
MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "db": os.getenv("MYSQL_DATABASE", "memorylink"),
    "charset": "utf8mb4",
    "autocommit": True,
}

def normalize_mysql_query(query: str) -> str:
    return (
        query
        .replace("strftime('%Y-%m', created_at)", "DATE_FORMAT(created_at, '%Y-%m')")
        .replace("?", "%s")
    )

class MySQLDatabaseAdapter:
    def __init__(self, connection):
        self.connection = connection

    async def execute(self, query: str, params=None):
        cursor = await self.connection.cursor()
        await cursor.execute(normalize_mysql_query(query), params or ())
        return cursor

async def open_mysql_connection():
    return await aiomysql.connect(
        **MYSQL_CONFIG,
        cursorclass=aiomysql.DictCursor,
    )

# Pydantic Models
class Memory(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None
    importance_score: int = 5
    tags: Optional[List[str]] = None

class AIAnalysisRequest(BaseModel):
    text: str
    analyze_sentiment: bool = True
    extract_keywords: bool = True
    generate_summary: bool = True

class AIAnalysisResponse(BaseModel):
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    keywords: Optional[List[str]] = None
    confidence: float = 0.0
    recommended_tags: List[str] = []
    memory_meaning: Optional[str] = None

# Database Helper
async def get_db():
    """MySQL database connection"""
    try:
        connection = await open_mysql_connection()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"MySQL connection failed: {exc}")

    try:
        yield MySQLDatabaseAdapter(connection)
    finally:
        connection.close()

@app.get("/")
async def root():
    """API 루트"""
    return {
        "message": "AI 기반 디지털 유품 정리 서비스 API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "ai_analyze": "/api/ai/analyze",
            "memories": "/api/memories",
            "stats": "/api/stats/advanced"
        }
    }

@app.get("/health")
async def health_check():
    """Health check"""
    database_status = "connected"
    try:
        connection = await open_mysql_connection()
        connection.close()
    except Exception:
        database_status = "not_connected"

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "python_version": "3.12.11",
        "database": database_status,
        "database_type": "mysql",
        "database_host": MYSQL_CONFIG["host"],
    }

def unique_list(values, limit=7):
    result = []
    seen = set()
    for raw in values:
        value = str(raw).strip(" .,!?()[]{}\"'")
        if len(value) < 2 or value in seen:
            continue
        seen.add(value)
        result.append(value)
        if len(result) >= limit:
            break
    return result

def local_ai_analysis(text: str):
    clean_text = " ".join(text.split())
    lower_text = clean_text.lower()
    positive_words = ["행복", "기쁨", "사랑", "즐거", "감사", "소중", "웃음", "좋", "최고", "따뜻"]
    negative_words = ["슬픔", "아픔", "힘들", "그립", "외로", "걱정", "후회", "눈물", "상실", "미안"]
    positive_score = sum(1 for word in positive_words if word in lower_text)
    negative_score = sum(1 for word in negative_words if word in lower_text)

    sentiment = "neutral"
    if positive_score > negative_score:
        sentiment = "positive"
    elif negative_score > positive_score:
        sentiment = "negative"

    raw_words = clean_text.replace(".", " ").replace(",", " ").split()
    keywords = unique_list(raw_words, 7)
    if len(keywords) < 3:
        keywords = unique_list(keywords + ["추억", "기록", "보관"], 7)

    first_sentence = clean_text.split(".")[0] if clean_text else ""
    summary = first_sentence[:90] + "..." if len(first_sentence) > 90 else first_sentence
    if not summary:
        summary = "추억의 내용을 분석했습니다."

    recommended_tags = unique_list(keywords[:4] + ["소중한 순간" if sentiment == "positive" else "기억 정리"], 5)

    return {
        "summary": summary,
        "sentiment": sentiment,
        "keywords": keywords,
        "confidence": 0.55,
        "recommended_tags": recommended_tags,
        "memory_meaning": "이 기록은 개인의 경험과 감정을 다시 떠올릴 수 있게 해 주는 추억 자료입니다."
    }

def normalize_ai_analysis(value, original_text: str):
    fallback = local_ai_analysis(original_text)
    sentiment = value.get("sentiment") if isinstance(value, dict) else None
    if sentiment not in ["positive", "negative", "neutral"]:
        sentiment = fallback["sentiment"]

    keywords = unique_list(value.get("keywords", []) if isinstance(value, dict) else [], 7)
    recommended_tags = unique_list(value.get("recommended_tags", []) if isinstance(value, dict) else [], 5)

    try:
        confidence = float(value.get("confidence", fallback["confidence"])) if isinstance(value, dict) else fallback["confidence"]
    except Exception:
        confidence = fallback["confidence"]

    return {
        "summary": str(value.get("summary") if isinstance(value, dict) else fallback["summary"])[:180] or fallback["summary"],
        "sentiment": sentiment,
        "keywords": keywords or fallback["keywords"],
        "confidence": min(1.0, max(0.0, confidence)),
        "recommended_tags": recommended_tags or fallback["recommended_tags"],
        "memory_meaning": str(value.get("memory_meaning") if isinstance(value, dict) else fallback["memory_meaning"])[:180] or fallback["memory_meaning"]
    }

async def openai_ai_analysis(text: str):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None

    schema = {
        "type": "object",
        "additionalProperties": False,
        "required": ["summary", "sentiment", "keywords", "confidence", "recommended_tags", "memory_meaning"],
        "properties": {
            "summary": {"type": "string"},
            "sentiment": {"type": "string", "enum": ["positive", "negative", "neutral"]},
            "keywords": {"type": "array", "minItems": 3, "maxItems": 7, "items": {"type": "string"}},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "recommended_tags": {"type": "array", "minItems": 2, "maxItems": 5, "items": {"type": "string"}},
            "memory_meaning": {"type": "string"}
        }
    }
    payload = {
        "model": os.getenv("OPENAI_MODEL", "gpt-5.2"),
        "instructions": "\n".join([
            "당신은 AI 기반 추억 관리 서비스의 분석 엔진입니다.",
            "입력된 추억 기록을 한국어로 요약하고 감정, 키워드, 추천 태그를 분석합니다.",
            "입력에 없는 가족 관계나 사건은 단정하지 않습니다."
        ]),
        "input": f"다음 추억 기록을 분석해 주세요.\n\n{text}",
        "text": {
            "format": {
                "type": "json_schema",
                "name": "memory_analysis",
                "strict": True,
                "schema": schema
            }
        },
        "max_output_tokens": 700
    }

    def request_openai():
        request = urllib.request.Request(
            "https://api.openai.com/v1/responses",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            method="POST"
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
            output_text = data.get("output_text", "")
            if not output_text:
                parts = []
                for item in data.get("output", []):
                    for content in item.get("content", []):
                        if isinstance(content.get("text"), str):
                            parts.append(content["text"])
                output_text = "\n".join(parts)
            return json.loads(output_text)

    return await asyncio.to_thread(request_openai)

@app.post("/api/ai/analyze", response_model=AIAnalysisResponse)
async def ai_analyze(request: AIAnalysisRequest):
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="text is required")

        openai_result = None
        try:
            openai_result = await openai_ai_analysis(request.text)
        except Exception as exc:
            print(f"OpenAI analysis fallback: {exc}")

        result = normalize_ai_analysis(openai_result or local_ai_analysis(request.text), request.text)

        if not request.analyze_sentiment:
            result["sentiment"] = None
        if not request.extract_keywords:
            result["keywords"] = []
            result["recommended_tags"] = []
        if not request.generate_summary:
            result["summary"] = None

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@app.get("/api/memories")
async def get_memories(
    skip: int = 0, 
    limit: int = 20,
    db: MySQLDatabaseAdapter = Depends(get_db)
):
    """추억 목록 조회 (Python)"""
    try:
        cursor = await db.execute(
            """
            SELECT m.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM memories m
            LEFT JOIN categories c ON m.category_id = c.id
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
            """,
            (limit, skip)
        )
        rows = await cursor.fetchall()
        
        memories = []
        for row in rows:
            memory = dict(row)
            # JSON 필드 파싱
            if memory.get('tags'):
                try:
                    memory['tags'] = json.loads(memory['tags'])
                except:
                    memory['tags'] = []
            if memory.get('ai_keywords'):
                try:
                    memory['ai_keywords'] = json.loads(memory['ai_keywords'])
                except:
                    memory['ai_keywords'] = []
            memories.append(memory)
        
        # 총 개수 조회
        cursor = await db.execute("SELECT COUNT(*) as count FROM memories")
        row = await cursor.fetchone()
        total = row['count'] if row else 0
        
        return {
            "data": memories,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch memories: {str(e)}")

@app.get("/api/stats/advanced")
async def get_advanced_stats(db: MySQLDatabaseAdapter = Depends(get_db)):
    """고급 통계 분석 (Python)"""
    try:
        stats = {}
        
        # 기본 통계
        cursor = await db.execute("SELECT COUNT(*) as count FROM memories")
        row = await cursor.fetchone()
        stats['total_memories'] = row['count'] if row else 0
        
        # 카테고리별 통계
        cursor = await db.execute("""
            SELECT c.name, c.icon, COUNT(m.id) as count
            FROM categories c
            LEFT JOIN memories m ON c.id = m.category_id
            GROUP BY c.id
            ORDER BY count DESC
        """)
        rows = await cursor.fetchall()
        stats['by_category'] = [dict(row) for row in rows]
        
        # 감정별 통계
        cursor = await db.execute("""
            SELECT ai_sentiment, COUNT(*) as count
            FROM memories
            WHERE ai_sentiment IS NOT NULL
            GROUP BY ai_sentiment
        """)
        rows = await cursor.fetchall()
        stats['by_sentiment'] = {row['ai_sentiment']: row['count'] for row in rows}
        
        # 평균 중요도
        cursor = await db.execute("SELECT AVG(importance_score) as avg_score FROM memories")
        row = await cursor.fetchone()
        stats['avg_importance'] = round(row['avg_score'], 2) if row and row['avg_score'] else 0
        
        # 월별 추억 개수
        cursor = await db.execute("""
            SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
            FROM memories
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        """)
        rows = await cursor.fetchall()
        stats['by_month'] = [dict(row) for row in rows]
        
        return stats
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

@app.post("/api/memories/batch-analyze")
async def batch_analyze_memories(
    memory_ids: List[int],
    db: MySQLDatabaseAdapter = Depends(get_db)
):
    """여러 추억을 일괄 분석"""
    try:
        results = []
        
        for memory_id in memory_ids:
            cursor = await db.execute(
                "SELECT title, description, content FROM memories WHERE id = ?",
                (memory_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                text = f"{row['title']}. {row['description'] or ''}. {row['content'] or ''}"
                analysis = await ai_analyze(AIAnalysisRequest(text=text))
                results.append({
                    "memory_id": memory_id,
                    "analysis": analysis
                })
        
        return {
            "analyzed": len(results),
            "results": results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("="*60)
    print("🚀 AI 기반 디지털 유품 정리 서비스 API 시작...")
    print("="*60)
    print(f"📍 Host: http://0.0.0.0:8000")
    print(f"📍 Local: http://localhost:8000")
    print(f"📄 API Docs: http://localhost:8000/docs")
    print(f"🔧 Health Check: http://localhost:8000/health")
    print("="*60)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
