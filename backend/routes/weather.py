from fastapi import APIRouter, HTTPException
import httpx, time

router = APIRouter(prefix="/weather", tags=["Weather"])

# Coordinates for VIT Vellore
LATITUDE = 12.9165
LONGITUDE = 79.1325

# Reuse a single client instead of opening a new connection per request
_client = httpx.AsyncClient(timeout=10.0)

# Simple in-memory cache so rapid client polling doesn't hammer the upstream API
_CACHE_TTL_SECONDS = 5 * 60
_cache = {"data": None, "fetched_at": 0.0}

@router.get("/")
async def get_weather():
    now = time.monotonic()
    if _cache["data"] is not None and (now - _cache["fetched_at"]) < _CACHE_TTL_SECONDS:
        return _cache["data"]

    url = f"https://api.open-meteo.com/v1/forecast?latitude={LATITUDE}&longitude={LONGITUDE}&current_weather=true"

    try:
        response = await _client.get(url)
        response.raise_for_status()  # Throws an error if the API is down
        data = response.json()

        # Extract only the data we care about for the frontend
        current = data.get("current_weather", {})
        result = {
            "temperature": current.get("temperature"),
            "windspeed": current.get("windspeed"),
            "is_day": current.get("is_day"),
            "weathercode": current.get("weathercode")
        }
        _cache["data"] = result
        _cache["fetched_at"] = now
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch satellite weather data")
