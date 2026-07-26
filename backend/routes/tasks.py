from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import models, schemas
from database import get_db
from auth import get_current_user # 🛡️ THE BOUNCER

router = APIRouter(prefix="/tasks", tags=["Tasks & Schedule"])

# The strict hardcoded core tag list
HARDCODED_TAGS = {"quiz", "cat-1", "cat-2", "fat", "lab fat", "assignment", "club", "others"}

# 1. CREATE A TASK
@router.post("/", response_model=schemas.TaskResponse)
def create_task(
    task_data: schemas.TaskCreate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🌟 UPGRADE: We don't need to query the DB for the profile anymore. 
    # The bouncer already handed us the current_user!
    custom_tags = set(current_user.custom_task_tags) if current_user.custom_task_tags else set()
    allowed_tags = HARDCODED_TAGS.union(custom_tags)
    
    for tag in task_data.tags:
        if tag.lower() not in allowed_tags:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid tag '{tag}'. Allowed: {list(HARDCODED_TAGS)} plus your custom profile tags."
            )
            
    # 🛡️ Link the new task to the logged-in user
    new_task = models.Task(**task_data.model_dump(), user_id=current_user.id)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

# 2. GET ALL TASKS
@router.get("/", response_model=List[schemas.TaskResponse])
def get_tasks(
    start_date: Optional[datetime] = Query(None, description="Format: YYYY-MM-DDTHH:MM:SS"),
    end_date: Optional[datetime] = Query(None, description="Format: YYYY-MM-DDTHH:MM:SS"),
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ ONLY get tasks owned by the logged-in user
    query = db.query(models.Task).filter(models.Task.user_id == current_user.id)
    
    if start_date:
        query = query.filter(models.Task.due_date >= start_date)
    if end_date:
        query = query.filter(models.Task.due_date <= end_date)
        
    return query.all()

# 3. GET TO-DO LIST ONLY
@router.get("/todo", response_model=List[schemas.TaskResponse])
def get_todo_list(
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    tasks = db.query(models.Task).filter(
        models.Task.user_id == current_user.id, # 🛡️ OWNERSHIP CHECK
        (models.Task.task_type == "Work") | 
        ((models.Task.task_type == "Schedule") & (models.Task.is_todo == True))
    ).order_by(models.Task.due_date.asc()).all()
    return tasks

# 4. UPDATE A TASK
@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: int, 
    task_data: schemas.TaskUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Ensure they own the task before updating
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")
        
    update_data = task_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
        
    db.commit()
    db.refresh(task)
    return task

# 5. DELETE A TASK
@router.delete("/{task_id}")
def delete_task(
    task_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Ensure they own the task before deleting
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")
    
    db.delete(task)
    db.commit()
    
    return {"message": "Task deleted successfully"}