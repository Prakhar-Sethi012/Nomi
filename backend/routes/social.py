from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import uuid 

router = APIRouter(prefix="/social", tags=["Social Layer"])

# 1. Toggle Ghost Mode
@router.put("/ghost-mode", response_model=schemas.ProfileResponse)
def toggle_ghost_mode(is_ghost: bool, db: Session = Depends(get_db)):
    # NOTE: Hardcoded to ID 1 until we wire up JWT Authentication later
    profile = db.query(models.Profile).filter(models.Profile.id == 1).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile.is_ghost = is_ghost
    db.commit()
    db.refresh(profile)
    return profile

# 2. Create a Circle & Generate QR Token
@router.post("/circles", response_model=schemas.CircleResponse)
def create_circle(circle: schemas.CircleCreate, db: Session = Depends(get_db)):
    # Generate a random 8-character string for the QR Code
    qr_token = str(uuid.uuid4())[:8] 
    
    new_circle = models.Circle(name=circle.name, join_token=qr_token)
    db.add(new_circle)
    db.commit()
    db.refresh(new_circle)
    
    # Automatically add the creator (ID 1) to their new circle
    membership = models.CircleMember(circle_id=new_circle.id, user_id=1)
    db.add(membership)
    db.commit()
    
    return new_circle