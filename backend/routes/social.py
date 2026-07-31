from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import string, random
from utils.slot_engine import get_current_active_slots, check_user_status, get_next_class

import models, schemas
from database import get_db
from auth import get_current_user
from utils.slot_engine import get_current_active_slots, check_user_status

router = APIRouter(prefix="/social", tags=["Multiplayer & Circles"])

# ==========================================
# CORE ACTIONS
# ==========================================
@router.put("/ghost-mode")
def toggle_ghost_mode(data: schemas.GhostModeUpdate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    current_user.is_ghost = data.is_ghost
    db.commit()
    return {"message": "Ghost mode updated", "is_ghost": current_user.is_ghost}

@router.post("/circles")
def create_circle(circle_data: schemas.CircleCreate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    new_circle = models.Circle(name=circle_data.name, join_token=token)
    db.add(new_circle)
    db.commit()
    db.refresh(new_circle)
    
    member = models.CircleMember(circle_id=new_circle.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    return {"id": new_circle.id, "name": new_circle.name, "join_token": new_circle.join_token}

@router.post("/circles/join")
def join_circle(data: schemas.CircleJoin, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    circle = db.query(models.Circle).filter(models.Circle.join_token == data.join_token).first()
    if not circle:
        raise HTTPException(status_code=404, detail="Invalid invite code.")
        
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

# ==========================================
# LEVEL 1: THE LOBBY (My Circles)
# ==========================================
@router.get("/circles/my-circles")
def get_my_circles(db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    memberships = db.query(models.CircleMember).filter(models.CircleMember.user_id == current_user.id).all()
    circle_ids = [m.circle_id for m in memberships]
    
    circles = db.query(models.Circle).filter(models.Circle.id.in_(circle_ids)).all()
    return [{"id": c.id, "name": c.name, "join_token": c.join_token} for c in circles]

# ==========================================
# LEVEL 2: THE ROSTER (Live Status Engine)
# ==========================================
@router.get("/circles/{circle_id}/roster")
def get_circle_roster(circle_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    # 🛡️ SECURITY: Verify user is actually in this circle
    is_member = db.query(models.CircleMember).filter(
        models.CircleMember.circle_id == circle_id,
        models.CircleMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this circle.")
        
    # ⏱️ ENGINE: Get active FFCS slots right now
    active_slots = get_current_active_slots()
    
    members = db.query(models.CircleMember).filter(models.CircleMember.circle_id == circle_id).all()
    roster = []
    
    for m in members:
        # Skip current user (you don't need to see yourself in the roster)
        if m.user_id == current_user.id:
            continue
            
        profile = db.query(models.Profile).filter(models.Profile.id == m.user_id).first()
        if not profile:
            continue
            
        if profile.is_ghost:
            status = {"is_free": None, "message": "Classified"}
            next_class = None
        else:
            subjects = db.query(models.Subject).filter(models.Subject.user_id == m.user_id).all()
            status = check_user_status(subjects, active_slots)
            next_class = get_next_class(subjects) # 🔥 NEW: Calculate the next class!
            
        roster.append({
            "user_id": profile.id,
            "name": profile.name,
            "is_ghost": profile.is_ghost,
            "live_status": status,
            "next_class": next_class 
        })
        
    return roster

# ==========================================
# LEVEL 3: PEEPING TOM (Read-Only Timetable)
# ==========================================
@router.get("/member/{target_user_id}/timetable")
def get_friend_timetable(target_user_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    # 🛡️ SECURITY: Do they share at least one circle?
    my_circles = db.query(models.CircleMember.circle_id).filter(models.CircleMember.user_id == current_user.id).subquery()
    shares_circle = db.query(models.CircleMember).filter(
        models.CircleMember.user_id == target_user_id,
        models.CircleMember.circle_id.in_(my_circles)
    ).first()
    
    if not shares_circle:
        raise HTTPException(status_code=403, detail="You must share a circle with this user to view their timetable.")
        
    target_profile = db.query(models.Profile).filter(models.Profile.id == target_user_id).first()
    
    # 👻 GHOST PROTOCOL ENFORCEMENT
    if target_profile.is_ghost:
        raise HTTPException(status_code=403, detail="This user is in Ghost Mode.")
        
    # Send data exactly how the frontend TimetableView expects it
    subjects = db.query(models.Subject).filter(models.Subject.user_id == target_user_id).all()
    return subjects