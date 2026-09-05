from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/notes", tags=["Scratchpad"])

@router.get("/", response_model=List[schemas.NoteResponse])
def get_notes(db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    return db.query(models.Note).filter(models.Note.user_id == current_user.id).all()

@router.post("/", response_model=schemas.NoteResponse)
def create_note(data: schemas.NoteCreate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    new_note = models.Note(
        user_id=current_user.id,
        title=data.title,
        content=data.content
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.put("/{note_id}", response_model=schemas.NoteResponse)
def update_note(note_id: int, data: schemas.NoteUpdate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    note = db.query(models.Note).filter(models.Note.id == note_id, models.Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    if data.title is not None:
        note.title = data.title
    if data.content is not None:
        note.content = data.content

    db.commit()
    db.refresh(note)
    return note

@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    note = db.query(models.Note).filter(models.Note.id == note_id, models.Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}