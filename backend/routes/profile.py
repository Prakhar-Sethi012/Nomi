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
    
    # 🔥 SECURITY GATE: If they are trying to change their PIN...
    if "app_pin" in update_data:
        has_prev_pin = "previous_pin" in update_data and update_data["previous_pin"]
        has_sec_answer = "security_answer" in update_data and update_data["security_answer"]

        # Block if neither is provided
        if not has_prev_pin and not has_sec_answer:
            raise HTTPException(status_code=403, detail="Provide either your Current PIN or Security Answer to authorize.")

        # Check Current PIN first
        if has_prev_pin:
            if current_user.app_pin != update_data["previous_pin"]:
                try:
                    if not auth.verify_password(update_data["previous_pin"], current_user.app_pin):
                        raise HTTPException(status_code=401, detail="Incorrect Current PIN.")
                except Exception:
                    raise HTTPException(status_code=401, detail="Incorrect Current PIN.")
        # Fallback to Security Answer
        elif has_sec_answer:
            if not current_user.security_answer:
                raise HTTPException(status_code=403, detail="No security question set up. Use Current PIN.")
            if update_data["security_answer"].strip().lower() != current_user.security_answer.strip().lower():
                raise HTTPException(status_code=401, detail="Incorrect Security Answer.")
                
    # 🔥 Remove transient field so SQLAlchemy doesn't crash trying to save it
    if "previous_pin" in update_data:
        del update_data["previous_pin"]

    for key, value in update_data.items():
        if key == "app_pin":
            setattr(current_user, key, auth.get_password_hash(value))
        else:
            setattr(current_user, key, value)
        
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.delete("/self-destruct")
def self_destruct_account(db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "Account and all associated data permanently deleted."}