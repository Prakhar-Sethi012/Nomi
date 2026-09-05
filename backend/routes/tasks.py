from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, date, time
import models, schemas
from database import get_db
from auth import get_current_user # 🛡️ THE BOUNCER
from dateutil.relativedelta import relativedelta
router = APIRouter(prefix="/tasks", tags=["Tasks & Schedule"])

# 1. CREATE A TASK
@router.post("/", response_model=schemas.TaskResponse)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    new_task = models.Task(**task.model_dump(), user_id=current_user.id)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, task_data: schemas.TaskUpdate, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_dict = task_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(task, key, value)
        
    db.commit()
    db.refresh(task)
    return task

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

# 5. DELETE A TASK
@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")
    
    # 🔥 RECURRING TASK LOGIC
    if task.frequency == 'Daily':
        task.due_date = task.due_date + timedelta(days=1)
        db.commit()
        return {"status": "success", "detail": "Daily task shifted to tomorrow"}
    
    elif task.frequency == 'Weekly':
        task.due_date = task.due_date + timedelta(weeks=1)
        db.commit()
        return {"status": "success", "detail": "Weekly task shifted to next week"}
        
    elif task.frequency == 'Monthly':
        task.due_date = task.due_date + relativedelta(months=1)
        db.commit()
        return {"status": "success", "detail": "Monthly task shifted to next month"}
        
    # 🔥 STREAK TRACKING: If this was the last pending "Once" todo-item due today or
    # earlier, completing it counts as a "perfect day" — server-computed, not client-trusted.
    tomorrow_midnight = datetime.combine(date.today(), time.min) + timedelta(days=1)
    remaining_once_tasks = db.query(models.Task).filter(
        models.Task.user_id == current_user.id,
        models.Task.id != task_id,
        models.Task.frequency == 'Once',
        models.Task.due_date < tomorrow_midnight,
        (models.Task.task_type == "Work") |
        ((models.Task.task_type == "Schedule") & (models.Task.is_todo == True))
    ).count()

    if remaining_once_tasks == 0 and current_user.last_active_date != date.today():
        current_user.current_streak += 1
        current_user.last_active_date = date.today()

    # If it is 'Once', we actually delete it
    db.delete(task)
    db.commit()
    return {"status": "success", "detail": "Task deleted permanently"}