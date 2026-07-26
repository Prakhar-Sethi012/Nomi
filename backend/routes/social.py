from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
import uuid
# 🔥 NEW: Import our gatekeeper
from auth import get_current_user 

router = APIRouter(prefix="/social", tags=["Social Layer"])

# 1. Toggle Ghost Mode
@router.put("/ghost-mode", response_model=schemas.ProfileResponse)
def toggle_ghost_mode(
    is_ghost: bool, 
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user) # 🛡️ THE BOUNCER
):
    # Notice we no longer search for ID 1. The bouncer hands us the correct user!
    current_user.is_ghost = is_ghost
    db.commit()
    db.refresh(current_user)
    return current_user

# 2. Create a Circle & Generate QR Token
@router.post("/circles", response_model=schemas.CircleResponse)
def create_circle(
    circle: schemas.CircleCreate, 
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user) # 🛡️ THE BOUNCER
):
    qr_token = str(uuid.uuid4())[:8] 
    
    new_circle = models.Circle(name=circle.name, join_token=qr_token)
    db.add(new_circle)
    db.commit()
    db.refresh(new_circle)
    
    # Add the ACTUAL logged-in user to the circle instead of ID 1
    membership = models.CircleMember(circle_id=new_circle.id, user_id=current_user.id)
    db.add(membership)
    db.commit()
    
    return new_circle