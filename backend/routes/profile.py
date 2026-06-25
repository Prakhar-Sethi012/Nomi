from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from passlib.context import CryptContext  # 🔒 NEW: Security Import
import models, schemas
from database import get_db

router = APIRouter(prefix="/profile", tags=["Profile"])

# 🔒 Initialize the bcrypt hashing engine
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/setup", response_model=schemas.ProfileResponse)
def setup_profile(profile_data: schemas.ProfileCreate, db: Session = Depends(get_db)):
    existing_profile = db.query(models.Profile).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already set up. Use settings to update.")

    # 🔒 Hash the PIN before saving it to the database
    hashed_pin = pwd_context.hash(profile_data.app_pin)

    new_profile = models.Profile(
        name=profile_data.name,
        reg_no=profile_data.reg_no,
        app_pin=hashed_pin,  # Save the scramble, not the plain text!
        current_streak=1,    
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

    today = date.today()
    
    if profile.last_active_date and profile.last_active_date < today - timedelta(days=1):
        profile.current_streak = 0
        db.commit()
        db.refresh(profile)

    # Note: Pydantic will automatically strip out the app_pin when returning this!
    return profile

@router.put("/", response_model=schemas.ProfileResponse)
def update_profile(profile_data: schemas.ProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(models.Profile).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = profile_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        # 🔒 If the user is updating their PIN, hash the new one before saving
        if key == "app_pin":
            setattr(profile, key, pwd_context.hash(value))
        else:
            setattr(profile, key, value)
        
    db.commit()
    db.refresh(profile)
    
    return profile