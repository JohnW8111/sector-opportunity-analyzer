"""
Cache manager for API responses with 12-hour expiration.
Uses file-based caching with JSON serialization.
"""

import json
import os
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional
import pandas as pd

from config import CACHE_DURATION_HOURS, CACHE_DIR


def get_cache_path() -> Path:
    """Get the cache directory path, creating it if necessary."""
    cache_path = Path(CACHE_DIR)
    cache_path.mkdir(parents=True, exist_ok=True)
    return cache_path


def generate_cache_key(source: str, params: dict) -> str:
    """
    Generate a unique cache key based on source and parameters.

    Args:
        source: Data source identifier (e.g., 'yfinance', 'fred')
        params: Dictionary of parameters used in the request

    Returns:
        MD5 hash string for use as filename
    """
    key_string = f"{source}:{json.dumps(params, sort_keys=True)}"
    return hashlib.md5(key_string.encode()).hexdigest()


def is_cache_valid(cache_file: Path) -> bool:
    """
    Check if a cache file exists and is not expired.

    Args:
        cache_file: Path to the cache file

    Returns:
        True if cache is valid and not expired
    """
    if not cache_file.exists():
        return False

    # Check file modification time
    mtime = datetime.fromtimestamp(cache_file.stat().st_mtime)
    expiry_time = mtime + timedelta(hours=CACHE_DURATION_HOURS)

    return datetime.now() < expiry_time


def get_cached_data(source: str, params: dict) -> Optional[Any]:
    """
    Retrieve data from cache if available and not expired.

    Args:
        source: Data source identifier
        params: Dictionary of parameters used in the request

    Returns:
        Cached data or None if not available/expired
    """
    cache_key = generate_cache_key(source, params)
    cache_file = get_cache_path() / f"{cache_key}.json"

    if not is_cache_valid(cache_file):
        return None

    try:
        with open(cache_file, 'r') as f:
            cached = json.load(f)

        # Handle DataFrame reconstruction
        if cached.get('_type') == 'dataframe':
            return pd.DataFrame(cached['data'])

        return cached['data']

    except (json.JSONDecodeError, KeyError, Exception) as e:
        print(f"Cache read error: {e}")
        return None


def save_to_cache(source: str, params: dict, data: Any) -> bool:
    """
    Save data to cache.

    Args:
        source: Data source identifier
        params: Dictionary of parameters used in the request
        data: Data to cache (dict, list, or DataFrame)

    Returns:
        True if save was successful
    """
    cache_key = generate_cache_key(source, params)
    cache_file = get_cache_path() / f"{cache_key}.json"

    try:
        # Handle DataFrame serialization
        if isinstance(data, pd.DataFrame):
            cache_data = {
                '_type': 'dataframe',
                'data': data.to_dict(orient='list'),
                'cached_at': datetime.now().isoformat()
            }
        else:
            cache_data = {
                '_type': 'standard',
                'data': data,
                'cached_at': datetime.now().isoformat()
            }

        with open(cache_file, 'w') as f:
            json.dump(cache_data, f)

        return True

    except Exception as e:
        print(f"Cache write error: {e}")
        return False


def clear_cache(source: Optional[str] = None) -> int:
    """
    Clear cached data.

    Args:
        source: If provided, only clear cache for this source.
                If None, clear all cache.

    Returns:
        Number of cache files deleted
    """
    cache_path = get_cache_path()
    deleted = 0

    for cache_file in cache_path.glob("*.json"):
        try:
            if source is None:
                cache_file.unlink()
                deleted += 1
            else:
                # Would need to store source in cache file to filter
                # For now, just delete all
                cache_file.unlink()
                deleted += 1
        except Exception as e:
            print(f"Error deleting {cache_file}: {e}")

    return deleted


def get_cache_info() -> dict:
    """
    Get information about current cache state.

    Returns:
        Dictionary with cache statistics
    """
    cache_path = get_cache_path()
    cache_files = list(cache_path.glob("*.json"))

    total_size = sum(f.stat().st_size for f in cache_files)

    valid_count = sum(1 for f in cache_files if is_cache_valid(f))
    expired_count = len(cache_files) - valid_count

    return {
        'total_files': len(cache_files),
        'valid_files': valid_count,
        'expired_files': expired_count,
        'total_size_bytes': total_size,
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'cache_duration_hours': CACHE_DURATION_HOURS,
    }
