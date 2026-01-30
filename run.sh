#!/bin/bash
set -e

echo "Starting Sector Opportunity Analyzer..."
echo "Working directory: $(pwd)"

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r backend/requirements.txt

# Install frontend dependencies first
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Start backend in background
echo "Starting backend on port 8000..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Verify backend is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "Backend is healthy!"
else
    echo "Warning: Backend health check failed, continuing anyway..."
fi

# Start frontend
echo "Starting frontend on port 5173..."
cd frontend
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo "Both services started. Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
