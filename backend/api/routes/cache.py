"""Cache management endpoints."""
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from data.cache_manager import get_cache_info, clear_cache
from backend.api.routes.scores import refresh_data
from backend.api.schemas import CacheInfoResponse, CacheClearResponse

router = APIRouter(prefix="/api/cache", tags=["cache"])


@router.get("/info", response_model=CacheInfoResponse)
async def get_cache_status():
    """Get cache statistics."""
    try:
        info = get_cache_info()
        return CacheInfoResponse(
            total_files=info.get('total_files', 0),
            valid_files=info.get('valid_files', 0),
            expired_files=info.get('expired_files', 0),
            total_size_mb=info.get('total_size_mb', 0.0),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear", response_model=CacheClearResponse)
async def clear_all_cache():
    """Clear all cached data and refresh."""
    try:
        files_removed = clear_cache()
        # Also refresh the in-memory cached data
        refresh_data()
        return CacheClearResponse(
            files_removed=files_removed,
            message=f"Cleared {files_removed} cache files and refreshed data"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
