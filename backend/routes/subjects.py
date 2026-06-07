from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter(prefix="/subjects", tags=["Subjects & Attendance"])

# 1. ADD A NEW SUBJECT
@router.post("/", response_model=schemas.SubjectResponse)
def add_subject(subject_data: schemas.SubjectCreate, db: Session = Depends(get_db)):
    new_subject = models.Subject(**subject_data.model_dump())
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

# 2. GET ALL SUBJECTS (To render your timetable)
@router.get("/", response_model=List[schemas.SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    return db.query(models.Subject).all()

# 3. UPDATE ATTENDANCE (Click a button on frontend to +1)
@router.put("/{subject_id}/attendance", response_model=schemas.SubjectResponse)
def update_attendance(subject_id: int, attended: bool, db: Session = Depends(get_db)):
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Increment total classes. If they attended, increment attended_classes too.
    subject.total_classes += 1
    if attended:
        subject.attended_classes += 1
        
    db.commit()
    db.refresh(subject)
    return subject