from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from auth import get_current_user # 🛡️ THE BOUNCER

router = APIRouter(prefix="/subjects", tags=["Subjects & Attendance"])

# 1. ADD A NEW SUBJECT
@router.post("/", response_model=schemas.SubjectResponse)
def add_subject(
    subject_data: schemas.SubjectCreate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Tag with user_id
    new_subject = models.Subject(**subject_data.model_dump(), user_id=current_user.id)
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

# 2. GET ALL SUBJECTS
@router.get("/", response_model=List[schemas.SubjectResponse])
def get_subjects(
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Only get subjects belonging to the logged-in user
    return db.query(models.Subject).filter(models.Subject.user_id == current_user.id).all()

# 3. UPDATE ATTENDANCE
@router.put("/{subject_id}/attendance", response_model=schemas.SubjectResponse)
def update_attendance(
    subject_id: int,
    attended: bool,
    # "lab" only actually does anything for an EMBEDDED subject — every
    # other subject_type has a single component and always uses the theory
    # (default) counters below, same as before this param existed.
    component: str = "theory",
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Verify ownership
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id, models.Subject.user_id == current_user.id).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or unauthorized")

    log_lab = component == "lab" and subject.subject_type == "EMBEDDED"

    # 🔥 THE CAP: Prevent exceeding total classes
    if log_lab:
        if subject.lab_conducted_classes >= subject.lab_total_classes:
            raise HTTPException(status_code=400, detail="Maximum total classes reached.")
        subject.lab_conducted_classes += 1
        if attended:
            subject.lab_attended_classes += 1
    else:
        if subject.conducted_classes >= subject.total_classes:
            raise HTTPException(status_code=400, detail="Maximum total classes reached.")
        subject.conducted_classes += 1
        if attended:
            subject.attended_classes += 1

    db.commit()
    db.refresh(subject)
    return subject

# 4. DELETE A SUBJECT
@router.delete("/{subject_id}")
def delete_subject(
    subject_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Verify ownership
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id, models.Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or unauthorized")
    
    db.delete(subject)
    db.commit()
    return {"message": "Subject completely removed from the grid"}

# 5. GENERAL UPDATE ROUTE
@router.put("/{subject_id}", response_model=schemas.SubjectResponse)
def update_subject(
    subject_id: int, 
    subject_data: schemas.SubjectUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Verify ownership
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id, models.Subject.user_id == current_user.id).first()
    
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or unauthorized")

    update_data = subject_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(subject, key, value)
        
    db.commit()
    db.refresh(subject)
    return subject