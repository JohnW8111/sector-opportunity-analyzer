#!/bin/bash

# Install backend dependencies
pip install -r backend/requirements.txt

# Start backend in background
cd /home/runner/sector-opportunity-analyzer
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Install and start frontend
cd frontend
npm install
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
