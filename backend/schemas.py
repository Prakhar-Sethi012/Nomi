from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

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

    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

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

# 5. SUBJECTS SCHEMAS (Timetable & Attendance)
class SubjectCreate(BaseModel):
    name: str
    subject_type: str
    theory_slot: Optional[str] = None
    lab_slot: Optional[str] = None
    total_classes: int = 60
    room_number: Optional[str] = None

class SubjectResponse(SubjectCreate):
    id: int
    attended_classes: int
    conducted_classes: int

    class Config:
        from_attributes = True # Use orm_mode = True if you are on an older Pydantic version

# 6. EXPENSES SCHEMAS (Money Manager)
class ExpenseCreate(BaseModel):
    amount: float
    reason: str
    date: date
    tags: List[str]

class ExpenseResponse(BaseModel):
    id: int
    amount: float
    reason: str
    date: date
    tags: List[str]

    class Config:
        from_attributes = True