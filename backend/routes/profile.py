from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
import models, schemas
from database import get_db

# Create a router specifically for profile actions
router = APIRouter(prefix="/profile", tags=["Profile"])

@router.post("/setup", response_model=schemas.ProfileResponse)
def setup_profile(profile_data: schemas.ProfileCreate, db: Session = Depends(get_db)):
    # 1. Check if a profile already exists (we only want ONE command center owner)
    existing_profile = db.query(models.Profile).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already set up. Use settings to update.")

    # 2. Create the new profile
    new_profile = models.Profile(
        name=profile_data.name,
        reg_no=profile_data.reg_no,
        app_pin=profile_data.app_pin,
        current_streak=1,             # Day 1 of the streak!
        last_active_date=date.today()
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    return new_profile

@router.get("/", response_model=schemas.ProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(models.Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete setup.")

    # --- DAILY STREAK LOGIC ---
    today = date.today()
    
    if profile.last_active_date == today:
        # Already opened the app today, do nothing.
        pass 
    elif profile.last_active_date == today - timedelta(days=1):
        # Opened exactly yesterday. Streak continues!
        profile.current_streak += 1
        profile.last_active_date = today
    else:
        # Missed a day. Streak resets to 1 (for today).
        profile.current_streak = 1
        profile.last_active_date = today

    # Save the updated streak to the database
    db.commit()
    db.refresh(profile)

    return profile