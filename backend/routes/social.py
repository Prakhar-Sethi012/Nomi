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
    # 🔥 NEW: Custom Token Logic
    if circle_data.custom_token:
        token = circle_data.custom_token.upper()
        existing = db.query(models.Circle).filter(models.Circle.join_token == token).first()
        if existing:
            raise HTTPException(status_code=400, detail="This custom token is already taken!")
    else:
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
    is_member = db.query(models.CircleMember).filter(
        models.CircleMember.circle_id == circle_id, models.CircleMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this circle.")
        
    active_slots = get_current_active_slots()
    members = db.query(models.CircleMember).filter(models.CircleMember.circle_id == circle_id).all()
    roster = []
    
    for m in members:
        if m.user_id == current_user.id:
            continue
            
        profile = db.query(models.Profile).filter(models.Profile.id == m.user_id).first()
        if not profile:
            continue
            
        # 🔥 NEW: Nickname Override
        friend_setting = db.query(models.FriendSetting).filter_by(user_id=current_user.id, friend_id=profile.id).first()
        display_name = friend_setting.nickname if friend_setting else profile.name
            
        if profile.is_ghost:
            status = {"is_free": None, "message": "Classified"}
            next_class = None
        else:
            subjects = db.query(models.Subject).filter(models.Subject.user_id == m.user_id).all()
            status = check_user_status(subjects, active_slots)
            next_class = get_next_class(subjects)
            
        roster.append({
            "user_id": profile.id,
            "name": display_name,         # Will show nickname if set
            "real_name": profile.name,    # Keeps real name just in case UI needs it
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

# ==========================================
# NEW: SET FRIEND NICKNAME
# ==========================================
@router.put("/member/{friend_id}/nickname")
def set_nickname(friend_id: int, data: schemas.FriendSettingUpdate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    setting = db.query(models.FriendSetting).filter_by(user_id=current_user.id, friend_id=friend_id).first()
    
    # If they send an empty string, delete the nickname to revert to real name
    if not data.nickname.strip(): 
        if setting:
            db.delete(setting)
            db.commit()
        return {"message": "Nickname removed"}
        
    if setting:
        setting.nickname = data.nickname
    else:
        setting = models.FriendSetting(user_id=current_user.id, friend_id=friend_id, nickname=data.nickname)
        db.add(setting)
        
    db.commit()
    return {"message": "Nickname updated", "nickname": data.nickname}