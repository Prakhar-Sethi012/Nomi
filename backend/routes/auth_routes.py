from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    reg_no: str
    app_pin: str

class AuthResponse(BaseModel):
    token: str
    profile: schemas.ProfileResponse

@router.post("/register", response_model=AuthResponse)
def register_user(user: schemas.ProfileCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.Profile).filter(models.Profile.reg_no == user.reg_no).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Registration number already registered")
    
    hashed_pin = auth.get_password_hash(user.app_pin)
    
    new_profile = models.Profile(
        name=user.name,
        reg_no=user.reg_no,
        app_pin=hashed_pin
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    access_token = auth.create_access_token(user_id=new_profile.id)
    return {"token": access_token, "profile": new_profile}

@router.post("/login", response_model=AuthResponse)
def login_user(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.Profile).filter(models.Profile.reg_no == credentials.reg_no).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 🌟 SMART UPGRADE V2: Fix the passlib crash
    # First, check if the database still holds the old plain text PIN
    if user.app_pin == credentials.app_pin:
        # Upgrade it to a secure hash immediately!
        user.app_pin = auth.get_password_hash(credentials.app_pin)
        db.commit()
    else:
        # If it doesn't match plain text, it must be a hash. Let's verify it.
        try:
            if not auth.verify_password(credentials.app_pin, user.app_pin):
                raise HTTPException(status_code=401, detail="Incorrect PIN")
        except Exception:
            # Catch the UnknownHashError just in case the data is corrupted
            raise HTTPException(status_code=401, detail="Incorrect PIN or corrupted data")
    
    # Generate the VIP wristband
    access_token = auth.create_access_token(user_id=user.id)
    return {"token": access_token, "profile": user}