from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
import models, schemas
import auth  # 🔥 NEW: We import our own auth engine instead of passlib!
from database import get_db
from auth import get_current_user # 🛡️ THE BOUNCER

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("/", response_model=schemas.ProfileResponse)
def get_profile(
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    today = date.today()
    
    if current_user.last_active_date and current_user.last_active_date < today - timedelta(days=1):
        current_user.current_streak = 0
        db.commit()
        db.refresh(current_user)

    return current_user

@router.put("/", response_model=schemas.ProfileResponse)
def update_profile(
    profile_data: schemas.ProfileUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    update_data = profile_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if key == "app_pin":
            # 🔒 Hash the new PIN using our raw bcrypt engine
            setattr(current_user, key, auth.get_password_hash(value))
        else:
            setattr(current_user, key, value)
        
    db.commit()
    db.refresh(current_user)
    
    return current_user