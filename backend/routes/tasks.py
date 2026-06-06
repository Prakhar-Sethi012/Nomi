from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import models, schemas
from database import get_db

router = APIRouter(prefix="/tasks", tags=["Tasks & Schedule"])

# The strict hardcoded core tag list
HARDCODED_TAGS = {"quiz", "cat-1", "cat-2", "fat", "lab fat", "assignment", "club", "others"}

# 1. CREATE A TASK (With strict tag validation)
@router.post("/", response_model=schemas.TaskResponse)
def create_task(task_data: schemas.TaskCreate, db: Session = Depends(get_db)):
    # Fetch the profile to look up any custom tags the user created
    profile = db.query(models.Profile).first()
    custom_tags = set(profile.custom_task_tags) if profile else set()
    
    # Combine hardcoded tags and custom tags into one master list of allowed items
    allowed_tags = HARDCODED_TAGS.union(custom_tags)
    
    # Validate every incoming tag
    for tag in task_data.tags:
        if tag.lower() not in allowed_tags:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid tag '{tag}'. Allowed: {list(HARDCODED_TAGS)} plus your custom profile tags."
            )
            
    # If all tags pass validation, save to the database
    new_task = models.Task(**task_data.model_dump())
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

# 2. GET ALL TASKS (With your requested Date-Range Filtering)
@router.get("/", response_model=List[schemas.TaskResponse])
def get_tasks(
    start_date: Optional[datetime] = Query(None, description="Format: YYYY-MM-DDTHH:MM:SS"),
    end_date: Optional[datetime] = Query(None, description="Format: YYYY-MM-DDTHH:MM:SS"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Task)
    
    # Apply date filters only if the frontend passes them
    if start_date:
        query = query.filter(models.Task.due_date >= start_date)
    if end_date:
        query = query.filter(models.Task.due_date <= end_date)
        
    return query.all()

# 3. GET TO-DO LIST ONLY (Work tasks + Schedule tasks marked as is_todo)
@router.get("/todo", response_model=List[schemas.TaskResponse])
def get_todo_list(db: Session = Depends(get_db)):
    tasks = db.query(models.Task).filter(
        (models.Task.task_type == "Work") | 
        ((models.Task.task_type == "Schedule") & (models.Task.is_todo == True))
    ).all()
    return tasks