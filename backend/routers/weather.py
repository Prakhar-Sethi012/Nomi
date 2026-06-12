from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/weather", tags=["Weather"])

# Coordinates for VIT Vellore
LATITUDE = 12.9165
LONGITUDE = 79.1325

@router.get("/")
async def get_weather():
    url = f"https://api.open-meteo.com/v1/forecast?latitude={LATITUDE}&longitude={LONGITUDE}&current_weather=true"
    
    try:
        # httpx allows us to fetch external data asynchronously
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status() # Throws an error if the API is down
            data = response.json()
            
            # Extract only the data we care about for the frontend
            current = data.get("current_weather", {})
            return {
                "temperature": current.get("temperature"),
                "windspeed": current.get("windspeed"),
                "is_day": current.get("is_day"),
                "weathercode": current.get("weathercode")
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch satellite weather data")