"""FastAPI application entry point."""
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.api.routes import scores, sectors, cache, docs

# Load environment variables from project root .env file
load_dotenv(PROJECT_ROOT / ".env")

app = FastAPI(
    title="Sector Opportunity Analyzer API",
    description="API for analyzing sector investment opportunities",
    version="1.0.0",
)

# Configure CORS for frontend (allow all origins in production for Replit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Replit deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scores.router)
app.include_router(sectors.router)
app.include_router(cache.router)
app.include_router(docs.router)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Sector Opportunity Analyzer API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "scores": "/api/scores",
            "summary": "/api/scores/summary",
            "sectors": "/api/data/sectors",
            "quality": "/api/data/quality",
            "cache_info": "/api/cache/info",
            "cache_clear": "/api/cache/clear",
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
