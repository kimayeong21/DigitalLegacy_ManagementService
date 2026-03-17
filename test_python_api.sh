#!/bin/bash

echo "======================================"
echo "🧪 Python API 테스트"
echo "======================================"

# Python main 직접 실행 테스트
echo ""
echo "1️⃣ Testing: python3 main.py"
cd /home/user/memorylink/python-api
timeout 5 python3 main.py > /tmp/test1.log 2>&1 &
PID1=$!
sleep 3
curl -s http://localhost:8000/health > /dev/null && echo "✅ python3 main.py works!" || echo "❌ Failed"
kill $PID1 2>/dev/null
fuser -k 8000/tcp 2>/dev/null

sleep 2

# run.py 실행 테스트
echo ""
echo "2️⃣ Testing: python3 run.py"
timeout 5 python3 run.py > /tmp/test2.log 2>&1 &
PID2=$!
sleep 3
curl -s http://localhost:8000/health > /dev/null && echo "✅ python3 run.py works!" || echo "❌ Failed"
kill $PID2 2>/dev/null
fuser -k 8000/tcp 2>/dev/null

sleep 2

# uvicorn 직접 실행 테스트
echo ""
echo "3️⃣ Testing: uvicorn main:app"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/test3.log 2>&1 &
PID3=$!
sleep 3
HEALTH=$(curl -s http://localhost:8000/health)
if [ ! -z "$HEALTH" ]; then
    echo "✅ uvicorn main:app works!"
    echo "   Response: $HEALTH" | head -c 100
else
    echo "❌ Failed"
fi
kill $PID3 2>/dev/null
fuser -k 8000/tcp 2>/dev/null

echo ""
echo "======================================"
echo "✅ All tests completed"
echo "======================================"
