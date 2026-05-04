"""
AI 기반 디지털 유품 정리 서비스 - Python API
FastAPI backend for advanced AI analysis and data processing
"""

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import aiosqlite
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

# 데이터베이스 경로
DB_PATH = os.path.join(os.path.dirname(__file__), "..", ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject", "memorylink-production.sqlite")

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

# Database Helper
async def get_db():
    """데이터베이스 연결"""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database not found")
    
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()

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
    """헬스 체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "python_version": "3.12.11",
        "database": "connected" if os.path.exists(DB_PATH) else "not_found"
    }

@app.post("/api/ai/analyze", response_model=AIAnalysisResponse)
async def ai_analyze(request: AIAnalysisRequest):
    """
    AI 분석 엔드포인트 (Python으로 구현)
    - 감정 분석
    - 키워드 추출
    - 요약 생성
    """
    try:
        result = {
            "summary": None,
            "sentiment": None,
            "keywords": None
        }
        
        # 간단한 감정 분석 (기본 구현)
        if request.analyze_sentiment:
            text_lower = request.text.lower()
            positive_words = ['좋', '행복', '기쁨', '사랑', '즐거', '멋진', '훌륭', '최고']
            negative_words = ['슬프', '나쁘', '힘들', '아프', '싫', '우울', '끔찍']
            
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count > negative_count:
                result['sentiment'] = 'positive'
            elif negative_count > positive_count:
                result['sentiment'] = 'negative'
            else:
                result['sentiment'] = 'neutral'
        
        # 키워드 추출 (간단한 구현)
        if request.extract_keywords:
            words = request.text.split()
            # 3글자 이상인 단어만 추출
            keywords = [word for word in words if len(word) >= 3][:5]
            result['keywords'] = keywords
        
        # 요약 생성
        if request.generate_summary:
            # 첫 100자 또는 첫 문장
            summary = request.text[:100] + "..." if len(request.text) > 100 else request.text
            result['summary'] = summary
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@app.get("/api/memories")
async def get_memories(
    skip: int = 0, 
    limit: int = 20,
    db: aiosqlite.Connection = Depends(get_db)
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
async def get_advanced_stats(db: aiosqlite.Connection = Depends(get_db)):
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
    db: aiosqlite.Connection = Depends(get_db)
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
