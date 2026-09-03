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
            raise HTTPException(status_code=401, detail="Incorrect PIN or corrupted data")
    
    access_token = auth.create_access_token(user_id=user.id)
    return {"token": access_token, "profile": user}

# 🔥 NEW: The Forgot PIN Recovery Endpoint
@router.post("/reset-pin")
def reset_forgotten_pin(data: schemas.PinResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.Profile).filter(models.Profile.reg_no == data.reg_no).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.security_question or not user.security_answer:
        raise HTTPException(status_code=400, detail="No security question set up for this account.")
        
    # Simple case-insensitive check
    if user.security_answer.strip().lower() != data.security_answer.strip().lower():
        raise HTTPException(status_code=401, detail="Incorrect security answer")
        
    # Update PIN
    user.app_pin = auth.get_password_hash(data.new_pin)
    db.commit()
    return {"message": "PIN successfully reset. You can now log in."}

@router.post("/verify-pin")
def verify_user_pin(data: schemas.PinVerifyRequest, db: Session = Depends(get_db), current_user: models.Profile = Depends(auth.get_current_user)):
    # Check plain text first (legacy fallback)
    if current_user.app_pin == data.app_pin:
        return {"status": "success", "verified": True}
        
    # Check secure hash
    try:
        if auth.verify_password(data.app_pin, current_user.app_pin):
            return {"status": "success", "verified": True}
    except Exception:
        pass # Fall through to unauthorized
        
    raise HTTPException(status_code=401, detail="Incorrect PIN. Deletion aborted.")