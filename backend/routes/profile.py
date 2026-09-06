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

    # Normalized once up front — used both to verify the EXISTING answer (as a
    # PIN-change credential) and to hash a NEW one for storage below.
    normalized_new_answer = None
    if "security_answer" in update_data and update_data["security_answer"]:
        normalized_new_answer = update_data["security_answer"].strip().lower()

    # 🔥 SECURITY GATE: If they are trying to change their PIN...
    if "app_pin" in update_data:
        has_prev_pin = "previous_pin" in update_data and update_data["previous_pin"]
        has_sec_answer = normalized_new_answer is not None

        # Block if neither is provided
        if not has_prev_pin and not has_sec_answer:
            raise HTTPException(status_code=403, detail="Provide either your Current PIN or Security Answer to authorize.")

        # Check Current PIN first
        if has_prev_pin:
            if not auth.constant_time_str_eq(current_user.app_pin, update_data["previous_pin"]):
                try:
                    if not auth.verify_password(update_data["previous_pin"], current_user.app_pin):
                        raise HTTPException(status_code=401, detail="Incorrect Current PIN.")
                except Exception:
                    raise HTTPException(status_code=401, detail="Incorrect Current PIN.")
        # Fallback to Security Answer
        elif has_sec_answer:
            if not current_user.security_answer:
                raise HTTPException(status_code=403, detail="No security question set up. Use Current PIN.")
            # Legacy plaintext rows are verified once via constant-time compare
            # and upgraded to a hash on the spot; everything else goes through bcrypt.
            if auth.constant_time_str_eq(current_user.security_answer, normalized_new_answer):
                current_user.security_answer = auth.get_password_hash(normalized_new_answer)
            elif not auth.verify_password(normalized_new_answer, current_user.security_answer):
                raise HTTPException(status_code=401, detail="Incorrect Security Answer.")

    # 🔥 Remove transient field so SQLAlchemy doesn't crash trying to save it
    if "previous_pin" in update_data:
        del update_data["previous_pin"]

    for key, value in update_data.items():
        if key == "app_pin":
            setattr(current_user, key, auth.get_password_hash(value))
        elif key == "security_answer":
            setattr(current_user, key, auth.get_password_hash(normalized_new_answer))
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