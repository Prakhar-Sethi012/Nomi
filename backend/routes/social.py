from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import string, random
import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/social", tags=["Multiplayer & Circles"])

# 1. TOGGLE GHOST MODE (Privacy)
@router.put("/ghost-mode")
def toggle_ghost_mode(
    data: schemas.GhostModeUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user)
):
    current_user.is_ghost = data.is_ghost
    db.commit()
    return {"message": "Ghost mode updated", "is_ghost": current_user.is_ghost}

# 2. CREATE A NEW CIRCLE
@router.post("/circles")
def create_circle(
    circle_data: schemas.CircleCreate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user)
):
    # Generate a random 6-character join token (e.g., "A7X9BQ")
    token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    new_circle = models.Circle(name=circle_data.name, join_token=token)
    db.add(new_circle)
    db.commit()
    db.refresh(new_circle)
    
    # Add the creator as the first member
    member = models.CircleMember(circle_id=new_circle.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    
    return {"id": new_circle.id, "name": new_circle.name, "join_token": new_circle.join_token}

# 3. JOIN A CIRCLE VIA TOKEN
@router.post("/circles/join")
def join_circle(
    data: schemas.CircleJoin, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user)
):
    circle = db.query(models.Circle).filter(models.Circle.join_token == data.join_token).first()
    if not circle:
        raise HTTPException(status_code=404, detail="Invalid invite code.")
        
    # Check if already a member
    existing = db.query(models.CircleMember).filter(
        models.CircleMember.circle_id == circle.id, 
        models.CircleMember.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You are already in this circle.")
        
    new_member = models.CircleMember(circle_id=circle.id, user_id=current_user.id)
    db.add(new_member)
    db.commit()
    
    return {"message": f"Successfully joined {circle.name}!"}

# 4. GET MY CIRCLES & FRIENDS RADAR
@router.get("/circles/radar")
def get_radar(db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    # Find all circles this user belongs to
    my_memberships = db.query(models.CircleMember).filter(models.CircleMember.user_id == current_user.id).all()
    circle_ids = [m.circle_id for m in my_memberships]
    
    radar_data = []
    
    for cid in circle_ids:
        circle = db.query(models.Circle).filter(models.Circle.id == cid).first()
        
        # Get all users in this circle EXCEPT the current user
        members = db.query(models.CircleMember).filter(models.CircleMember.circle_id == cid).all()
        friend_ids = [m.user_id for m in members if m.user_id != current_user.id]
        
        friends_info = []
        for fid in friend_ids:
            friend_profile = db.query(models.Profile).filter(models.Profile.id == fid).first()
            if not friend_profile:
                continue
                
            # If they are in ghost mode, we hide their subjects!
            friend_subjects = []
            if not friend_profile.is_ghost:
                subjects = db.query(models.Subject).filter(models.Subject.user_id == fid).all()
                friend_subjects = [{"name": s.name, "room": s.room_number, "theory_slot": s.theory_slot, "lab_slot": s.lab_slot} for s in subjects]
                
            friends_info.append({
                "name": friend_profile.name,
                "is_ghost": friend_profile.is_ghost,
                "subjects": friend_subjects
            })
            
        radar_data.append({
            "circle_id": circle.id,
            "circle_name": circle.name,
            "join_token": circle.join_token,
            "friends": friends_info
        })
        
    return radar_data