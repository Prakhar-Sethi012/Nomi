from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import models, schemas, auth
from database import get_db
from utils.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"

class LoginRequest(BaseModel):
    # Was unbounded on both fields — reg_no now matches ProfileCreate's own
    # bound, app_pin matches the 4-char pattern every other PIN field uses.
    reg_no: str = Field(..., min_length=8, max_length=20)
    app_pin: str = Field(..., pattern=r"^[a-zA-Z0-9]{4}$")

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
def login_user(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    # Two independent limits: one per account (stops a distributed brute-force
    # against a single reg_no) and one per IP (stops credential-stuffing across
    # many accounts from one source).
    enforce_rate_limit(f"login:reg:{credentials.reg_no}", max_attempts=10, window_seconds=900)
    enforce_rate_limit(f"login:ip:{_client_ip(request)}", max_attempts=30, window_seconds=900)

    user = db.query(models.Profile).filter(models.Profile.reg_no == credentials.reg_no).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_npc:
        raise HTTPException(status_code=403, detail="This account cannot be used to log in directly.")

    # First, check if the database still holds the old plain text PIN
    if auth.constant_time_str_eq(user.app_pin, credentials.app_pin):
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
def reset_forgotten_pin(data: schemas.PinResetRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(f"reset-pin:reg:{data.reg_no}", max_attempts=5, window_seconds=900)
    enforce_rate_limit(f"reset-pin:ip:{_client_ip(request)}", max_attempts=15, window_seconds=900)

    user = db.query(models.Profile).filter(models.Profile.reg_no == data.reg_no).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.security_question or not user.security_answer:
        raise HTTPException(status_code=400, detail="No security question set up for this account.")

    # Case-insensitive, whitespace-trimmed comparison against the stored hash.
    # Legacy plaintext rows (pre-hashing) are verified once via constant-time
    # comparison and upgraded to a hash on the spot.
    normalized_answer = data.security_answer.strip().lower()
    if auth.constant_time_str_eq(user.security_answer, normalized_answer):
        user.security_answer = auth.get_password_hash(normalized_answer)
    elif not auth.verify_password(normalized_answer, user.security_answer):
        raise HTTPException(status_code=401, detail="Incorrect security answer")

    # Update PIN
    user.app_pin = auth.get_password_hash(data.new_pin)
    db.commit()
    return {"message": "PIN successfully reset. You can now log in."}

@router.post("/verify-pin")
def verify_user_pin(data: schemas.PinVerifyRequest, db: Session = Depends(get_db), current_user: models.Profile = Depends(auth.get_current_user)):
    enforce_rate_limit(f"verify-pin:user:{current_user.id}", max_attempts=10, window_seconds=900)

    # Check plain text first (legacy fallback)
    if auth.constant_time_str_eq(current_user.app_pin, data.app_pin):
        return {"status": "success", "verified": True}
        
    # Check secure hash
    try:
        if auth.verify_password(data.app_pin, current_user.app_pin):
            return {"status": "success", "verified": True}
    except Exception:
        pass # Fall through to unauthorized
        
    raise HTTPException(status_code=401, detail="Incorrect PIN. Deletion aborted.")