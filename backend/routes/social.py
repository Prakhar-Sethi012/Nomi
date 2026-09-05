from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import string, random,datetime

import models, schemas
from database import get_db
from auth import get_current_user
from utils.slot_engine import get_current_active_slots, check_user_status, get_next_class

router = APIRouter(prefix="/social", tags=["Multiplayer & Circles"])

@router.put("/ghost-mode")
def toggle_ghost_mode(data: schemas.GhostModeUpdate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    current_user.is_ghost = data.is_ghost
    db.commit()
    return {"message": "Ghost mode updated", "is_ghost": current_user.is_ghost}

# ==========================================
# CIRCLE MANAGEMENT (Create, Search, Join, Leave, Delete)
# ==========================================
@router.post("/circles")
def create_circle(circle_data: schemas.CircleCreate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    if circle_data.custom_token:
        token = circle_data.custom_token.upper()
        if db.query(models.Circle).filter(models.Circle.join_token == token).first():
            raise HTTPException(status_code=400, detail="Token already taken!")
    else:
        token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
    new_circle = models.Circle(name=circle_data.name, join_token=token, creator_id=current_user.id) # 🔥 Assign Leader
    db.add(new_circle)
    db.commit()
    db.refresh(new_circle)
    
    db.add(models.CircleMember(circle_id=new_circle.id, user_id=current_user.id))
    db.commit()
    return {"id": new_circle.id, "name": new_circle.name, "join_token": new_circle.join_token}

@router.get("/circles/search", response_model=List[schemas.CircleSearchResponse])
def search_circles(q: str, db: Session = Depends(get_db)):
    if not q or len(q) < 2: return []
    return db.query(models.Circle).filter(models.Circle.name.ilike(f"%{q}%")).limit(10).all()

@router.post("/circles/join")
def join_circle(data: schemas.CircleJoin, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    circle = db.query(models.Circle).filter(models.Circle.join_token == data.join_token).first()
    if not circle: raise HTTPException(status_code=404, detail="Invalid passcode.")
    if db.query(models.CircleMember).filter_by(circle_id=circle.id, user_id=current_user.id).first():
        raise HTTPException(status_code=400, detail="Already in this circle.")
        
    db.add(models.CircleMember(circle_id=circle.id, user_id=current_user.id))
    db.add(models.CircleHistory(circle_id=circle.id, user_name=current_user.name, action="joined"))
    db.commit()
    return {"message": f"Joined {circle.name}!"}

@router.delete("/circles/{circle_id}/leave")
def leave_circle(circle_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    member = db.query(models.CircleMember).filter_by(circle_id=circle_id, user_id=current_user.id).first()
    if not member: raise HTTPException(status_code=404, detail="Not in circle.")
    db.delete(member)
    # 🔥 LOG HISTORY
    db.add(models.CircleHistory(circle_id=circle_id, user_name=current_user.name, action="left"))
    db.commit()
    return {"message": "Left circle."}

@router.get("/circles/{circle_id}/history")
def get_circle_history(circle_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    circle = db.query(models.Circle).filter_by(id=circle_id).first()
    if not circle or circle.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the leader can view history.")
        
    # Get last 30 days of history, ordered newest first
    thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    history = db.query(models.CircleHistory).filter(
        models.CircleHistory.circle_id == circle_id,
        models.CircleHistory.timestamp >= thirty_days_ago
    ).order_by(models.CircleHistory.timestamp.desc()).all()
    
    return [{"user_name": h.user_name, "action": h.action, "timestamp": h.timestamp} for h in history]

@router.delete("/circles/{circle_id}")
def delete_circle(circle_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    circle = db.query(models.Circle).filter_by(id=circle_id).first()
    if not circle: raise HTTPException(status_code=404)
    if circle.creator_id != current_user.id: raise HTTPException(status_code=403, detail="Only the leader can delete this.")
    db.delete(circle)
    db.commit()
    return {"message": "Circle destroyed."}

@router.get("/circles/my-circles")
def get_my_circles(db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    memberships = db.query(models.CircleMember).filter_by(user_id=current_user.id).all()
    circle_ids = [m.circle_id for m in memberships]
    circles = db.query(models.Circle).filter(models.Circle.id.in_(circle_ids)).all()
    return [{"id": c.id, "name": c.name, "join_token": c.join_token, "creator_id": c.creator_id} for c in circles]

@router.get("/circles/{circle_id}/roster")
def get_circle_roster(circle_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    if not db.query(models.CircleMember).filter_by(circle_id=circle_id, user_id=current_user.id).first():
        raise HTTPException(status_code=403, detail="No access.")
        
    active_slots = get_current_active_slots()
    members = db.query(models.CircleMember).filter_by(circle_id=circle_id).all()
    member_ids = [m.user_id for m in members if m.user_id != current_user.id]

    profiles_by_id = {p.id: p for p in db.query(models.Profile).filter(models.Profile.id.in_(member_ids)).all()}

    settings_by_friend_id = {
        s.friend_id: s for s in db.query(models.FriendSetting).filter(
            models.FriendSetting.user_id == current_user.id,
            models.FriendSetting.friend_id.in_(member_ids)
        ).all()
    }

    non_ghost_ids = [uid for uid, p in profiles_by_id.items() if not p.is_ghost]
    subjects_by_user_id = {}
    for sub in db.query(models.Subject).filter(models.Subject.user_id.in_(non_ghost_ids)).all():
        subjects_by_user_id.setdefault(sub.user_id, []).append(sub)

    roster = []
    for user_id in member_ids:
        profile = profiles_by_id.get(user_id)
        if not profile: continue

        setting = settings_by_friend_id.get(profile.id)
        display_name = setting.nickname if setting else profile.name

        if profile.is_ghost:
            status, next_class = {"is_free": None, "message": "Classified"}, None
        else:
            subjects = subjects_by_user_id.get(user_id, [])
            status, next_class = check_user_status(subjects, active_slots), get_next_class(subjects)

        roster.append({
            "user_id": profile.id, "name": display_name, "real_name": profile.name,
            "is_ghost": profile.is_ghost, "live_status": status, "next_class": next_class
        })
    return roster

@router.get("/member/{target_user_id}/timetable")
def get_friend_timetable(target_user_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    target_profile = db.query(models.Profile).filter_by(id=target_user_id).first()
    if target_profile.is_ghost: raise HTTPException(status_code=403, detail="User in Ghost Mode.")
    return db.query(models.Subject).filter_by(user_id=target_user_id).all()

@router.put("/member/{friend_id}/nickname")
def set_nickname(friend_id: int, data: schemas.FriendSettingUpdate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    setting = db.query(models.FriendSetting).filter_by(user_id=current_user.id, friend_id=friend_id).first()
    if not data.nickname.strip(): 
        if setting: db.delete(setting)
    else:
        if setting: setting.nickname = data.nickname
        else: db.add(models.FriendSetting(user_id=current_user.id, friend_id=friend_id, nickname=data.nickname))
    db.commit()
    return {"message": "Updated"}

# ==========================================
# CLOSE FRIENDS (Offline Clones & NPCs)
# ==========================================
@router.post("/member/{target_user_id}/clone")
def clone_friend(target_user_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    target = db.query(models.Profile).filter_by(id=target_user_id).first()
    if not target or target.is_ghost: raise HTTPException(status_code=403)
    
    # Create the NPC Shell
    npc = models.Profile(
        name=target.name, reg_no=f"NPC_{current_user.id}_{target.id}_{random.randint(100,999)}",
        app_pin="0000", is_npc=True, managed_by=current_user.id
    )
    db.add(npc)
    db.commit()
    db.refresh(npc)
    
    # Clone their subjects into the NPC
    subjects = db.query(models.Subject).filter_by(user_id=target_user_id).all()
    for sub in subjects:
        db.add(models.Subject(user_id=npc.id, name=sub.name, subject_type=sub.subject_type, theory_slot=sub.theory_slot, lab_slot=sub.lab_slot, room_number=sub.room_number, total_classes=sub.total_classes))
    db.commit()
    return {"message": "Cloned to Close Friends!"}

@router.get("/close-friends")
def get_close_friends(db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    npcs = db.query(models.Profile).filter_by(managed_by=current_user.id).all()
    active_slots = get_current_active_slots()
    roster = []

    npc_ids = [npc.id for npc in npcs]
    subjects_by_npc_id = {}
    for sub in db.query(models.Subject).filter(models.Subject.user_id.in_(npc_ids)).all():
        subjects_by_npc_id.setdefault(sub.user_id, []).append(sub)

    for npc in npcs:
        subjects = subjects_by_npc_id.get(npc.id, [])

        # 🔥 Extract the REAL friend's ID so meetups route correctly!
        try:
            real_user_id = int(npc.reg_no.split('_')[2])
        except:
            real_user_id = npc.id
            
        roster.append({
            "user_id": npc.id, 
            "real_user_id": real_user_id, # Safely pass the true ID to the frontend
            "name": npc.name, 
            "real_name": npc.name, 
            "is_ghost": False,
            "live_status": check_user_status(subjects, active_slots), 
            "next_class": get_next_class(subjects)
        })
    return roster

@router.delete("/close-friends/{npc_id}")
def delete_close_friend(npc_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    npc = db.query(models.Profile).filter_by(id=npc_id, managed_by=current_user.id, is_npc=True).first()
    if not npc: 
        raise HTTPException(status_code=404, detail="Clone not found")
    db.delete(npc)
    db.commit()
    return {"message": "Clone removed"}


# ==========================================
# PHASE 2: THE MEETUP REQUEST ROOM
# ==========================================
@router.post("/meetups", response_model=schemas.MeetupResponse)
def send_meetup_request(data: schemas.MeetupCreate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    receiver = db.query(models.Profile).filter_by(id=data.receiver_id).first()
    if not receiver or receiver.is_ghost:
        raise HTTPException(status_code=400, detail="Cannot send request to this user. They might be a Ghost.")
    
    meetup = models.Meetup(sender_id=current_user.id, receiver_id=data.receiver_id, location=data.location, meet_time=data.meet_time)
    db.add(meetup)
    db.commit()
    db.refresh(meetup)
    return meetup

@router.get("/meetups/incoming")
def get_incoming_meetups(db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    # AUTO-CLEANUP: Destroy meetups where the meet_time was over 7 days ago
    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    db.query(models.Meetup).filter(models.Meetup.meet_time < seven_days_ago).delete(synchronize_session=False)
    db.commit()

    # Fetch pending or accepted requests sent TO you
    meetups = db.query(models.Meetup).filter(
        models.Meetup.receiver_id == current_user.id,
        models.Meetup.status.in_(["pending", "accepted"])
    ).order_by(models.Meetup.meet_time.asc()).all()

    senders_by_id = {
        p.id: p for p in db.query(models.Profile).filter(
            models.Profile.id.in_([m.sender_id for m in meetups])
        ).all()
    }

    result = []
    for m in meetups:
        sender = senders_by_id.get(m.sender_id)
        result.append({
            "id": m.id, "location": m.location, "meet_time": m.meet_time, "status": m.status,
            "friend_name": sender.name if sender else "Unknown"
        })
    return result

@router.get("/meetups/outgoing")
def get_outgoing_meetups(db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    # AUTO-CLEANUP: Destroy meetups where the meet_time was over 7 days ago
    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    db.query(models.Meetup).filter(models.Meetup.meet_time < seven_days_ago).delete(synchronize_session=False)
    db.commit()

    # Fetch requests sent BY you
    meetups = db.query(models.Meetup).filter(
        models.Meetup.sender_id == current_user.id
    ).order_by(models.Meetup.meet_time.asc()).all()

    receivers_by_id = {
        p.id: p for p in db.query(models.Profile).filter(
            models.Profile.id.in_([m.receiver_id for m in meetups])
        ).all()
    }

    result = []
    for m in meetups:
        receiver = receivers_by_id.get(m.receiver_id)
        result.append({
            "id": m.id, "location": m.location, "meet_time": m.meet_time, "status": m.status,
            "friend_name": receiver.name if receiver else "Unknown"
        })
    return result

@router.put("/meetups/{meetup_id}/status")
def update_meetup_status(meetup_id: int, status: str, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    meetup = db.query(models.Meetup).filter_by(id=meetup_id, receiver_id=current_user.id).first()
    if not meetup: raise HTTPException(status_code=404, detail="Meetup not found.")
    
    meetup.status = status # 'accepted' or 'declined'
    db.commit()
    return {"message": f"Meetup {status}"}