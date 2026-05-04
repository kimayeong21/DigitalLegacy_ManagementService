#!/usr/bin/env python3
"""
AI 기반 디지털 유품 정리 서비스 - Python API 실행 스크립트
"""

import sys
import os

# 현재 디렉토리를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 MemoryLink Python API Server")
    print("=" * 60)
    print(f"📍 Server: http://0.0.0.0:8000")
    print(f"📍 Local: http://localhost:8000")
    print(f"📄 API Docs: http://localhost:8000/docs")
    print(f"📄 ReDoc: http://localhost:8000/redoc")
    print(f"🔧 Health: http://localhost:8000/health")
    print("=" * 60)
    print("✨ Press CTRL+C to stop the server")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )
