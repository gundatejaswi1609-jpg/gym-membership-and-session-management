#!/bin/bash
# ==============================================================================
# APEXFIT - PREMIUM FITNESS MEMBERSHIP & DBMS CAPSTONE SYSTEM
# Startup and Launch Script
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================================="
echo "⚡ APEXFIT - CULT-INSPIRED PREMIUM FITNESS & DBMS SYSTEM"
echo "=================================================================="

# Check Python environment
if [ ! -d "backend/venv" ]; then
    echo "[*] Creating Python virtual environment in backend/venv..."
    python3 -m venv backend/venv
    backend/venv/bin/pip install --upgrade pip
    backend/venv/bin/pip install flask flask-cors pymysql cryptography python-dotenv requests razorpay werkzeug
fi

# Check Frontend modules
if [ ! -d "frontend/node_modules" ]; then
    echo "[*] Installing Frontend npm dependencies..."
    cd frontend && npm install && cd ..
fi

# Check network ports
echo "[*] Ensuring network ports 5001 and 3000 are available..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Launch Backend
echo "[*] Starting Flask REST API Backend on http://127.0.0.1:5001..."
cd backend
PORT=5001 ./venv/bin/python run.py > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend health check
sleep 2
echo "[*] Verifying backend health..."
curl -s http://127.0.0.1:5001/api/health || echo "Waiting for backend..."

# Launch Frontend
echo "[*] Starting Vite React Frontend on http://localhost:3000..."
cd frontend
npm run dev -- --host --port 3000 > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "=================================================================="
echo "✅ APEXFIT PLATFORM IS NOW ONLINE!"
echo "------------------------------------------------------------------"
echo "🌐 Web Application URL : http://localhost:3000"
echo "🔌 Backend REST API    : http://127.0.0.1:5001/api/health"
echo "🗄️ Relational Database  : MySQL 8 (gym_db)"
echo "💳 Payment Integration : Dynamic UPI QR & Razorpay Sandbox Adapter"
echo "=================================================================="
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit" INT TERM
wait
