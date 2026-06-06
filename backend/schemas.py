from pydantic import BaseModel
from typing import List, Optional
from datetime import date,datetime

# 1. SETUP SCHEMA (What the frontend sends when you first open the app)
class ProfileCreate(BaseModel):
    name: str
    reg_no: str
    app_pin: str

# 2. RESPONSE SCHEMA (What the backend sends to the frontend to display)
class ProfileResponse(BaseModel):
    id: int
    name: str
    reg_no: str
    cgpa: Optional[float] = None
    current_streak: int
    last_active_date: Optional[date] = None
    custom_task_tags: List[str]

# 3. PORTFOLIO SCHEMAS (Skills & Projects)
class PortfolioCreate(BaseModel):
    item_type: str  # Must be "Skill" or "Project"
    title: str
    description: Optional[str] = None
    links: List[str] = []

class PortfolioResponse(BaseModel):
    id: int
    item_type: str
    title: str
    description: Optional[str] = None
    links: List[str] = []
    
from datetime import datetime

# 4. TASK SCHEMAS (Powers both Schedule and Work)
class TaskCreate(BaseModel):
    title: str
    task_type: str      # Must be "Schedule" or "Work"
    due_date: datetime  # e.g., "2026-06-07T14:30:00"
    tags: List[str]
    is_todo: Optional[bool] = False

class TaskResponse(BaseModel):
    id: int
    title: str
    task_type: str
    due_date: datetime
    status: str
    tags: List[str]
    completed_at: Optional[datetime] = None
    is_todo: bool

    class Config:
        from_attributes = True