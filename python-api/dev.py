#!/usr/bin/env python3
"""
간단한 개발 서버 실행 스크립트
VSCode에서 F5로 바로 실행 가능
"""

import sys
import os

# PYTHONPATH 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# 메인 모듈 import 및 실행
if __name__ == "__main__":
    import uvicorn
    
    print("="*60)
    print("🚀 MemoryLink Python API Development Server")
    print("="*60)
    print(f"📍 Host: http://0.0.0.0:8000")
    print(f"📍 Local: http://localhost:8000")
    print(f"📄 API Docs: http://localhost:8000/docs")
    print(f"📄 ReDoc: http://localhost:8000/redoc")
    print(f"🔧 Health Check: http://localhost:8000/health")
    print("="*60)
    print("✨ VSCode에서 실행 중... (Ctrl+C로 종료)")
    print("="*60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
