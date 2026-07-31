from pydantic import BaseModel, Field
from typing import List, Optional
import datetime 

# ==========================================
# 1. PROFILE SCHEMAS (User Data & Settings)
# ==========================================
class ProfileCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    reg_no: str = Field(..., min_length=8)
    app_pin: str = Field(..., pattern=r"^\d{4}$", description="Must be exactly 4 digits")

class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    reg_no: Optional[str] = Field(None, min_length=8)
    app_pin: Optional[str] = Field(None, pattern=r"^\d{4}$")
    cgpa: Optional[float] = Field(None, ge=0.0, le=10.0, description="CGPA must be between 0 and 10")
    current_streak: Optional[int] = Field(None, ge=0)
    last_active_date: Optional[datetime.date] = None
    custom_task_tags: Optional[List[str]] = None
    is_ghost: Optional[bool] = None 
    monthly_limit: Optional[float] = None

class ProfileResponse(BaseModel):
    id: int
    name: str
    reg_no: str
    cgpa: Optional[float] = None
    current_streak: int
    last_active_date: Optional[datetime.date] = None
    custom_task_tags: List[str]
    is_ghost: bool 
    monthly_limit: Optional[float] = None

    class Config:
        from_attributes = True

# ==========================================
# 2. PORTFOLIO SCHEMAS (Skills & Projects)
# ==========================================
class PortfolioCreate(BaseModel):
    item_type: str 
    title: str = Field(..., min_length=2)
    description: Optional[str] = None
    links: List[str] = []

class PortfolioUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2)
    description: Optional[str] = None
    links: Optional[List[str]] = None

class PortfolioResponse(BaseModel):
    id: int
    item_type: str
    title: str
    description: Optional[str] = None
    links: List[str] = []
    
    class Config:
        from_attributes = True

# ==========================================
# 3. TASK SCHEMAS (Powers both Schedule and Work)
# ==========================================
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1)
    task_type: str      
    due_date: datetime.datetime  
    tags: List[str]
    is_todo: Optional[bool] = False

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    due_date: Optional[datetime.datetime] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    is_todo: Optional[bool] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    task_type: str
    due_date: datetime.datetime
    status: str
    tags: List[str]
    completed_at: Optional[datetime.datetime] = None
    is_todo: bool

    class Config:
        from_attributes = True

# ==========================================
# 4. SUBJECTS SCHEMAS (Timetable & Attendance)
# ==========================================
class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=2)
    subject_type: str
    theory_slot: Optional[str] = None
    lab_slot: Optional[str] = None
    total_classes: int = Field(60, gt=0, description="Total classes must be greater than 0")
    room_number: Optional[str] = None

class SubjectUpdate(BaseModel):
    total_classes: Optional[int] = Field(None, gt=0, description="Cannot be zero or negative")
    room_number: Optional[str] = None

class SubjectResponse(SubjectCreate):
    id: int
    attended_classes: int = Field(..., ge=0)
    conducted_classes: int = Field(..., ge=0)

    class Config:
        from_attributes = True

# ==========================================
# 5. EXPENSES SCHEMAS (Money Manager)
# ==========================================
class ExpenseCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Expense amount must be positive")
    reason: str = Field(..., min_length=2)
    date: datetime.date
    tags: List[str]

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    reason: Optional[str] = Field(None, min_length=2)
    date: Optional[datetime.date] = None
    tags: Optional[List[str]] = None

class ExpenseResponse(BaseModel):
    id: int
    amount: float
    reason: str
    date: datetime.date
    tags: List[str]

    class Config:
        from_attributes = True

# ==========================================
# 6. SOCIAL SCHEMAS (Friends, Circles, Privacy)
# ==========================================
class FriendRequestCreate(BaseModel):
    friend_reg_no: str = Field(..., description="The registration number of the user you want to add")

class FriendResponse(BaseModel):
    id: int
    name: str
    reg_no: str
    is_ghost: bool
    status: str # 'pending' or 'accepted'

    class Config:
        from_attributes = True

class CircleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class CircleResponse(BaseModel):
    id: int
    name: str
    join_token: str # This powers the QR Code!
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ==========================================
# MULTIPLAYER SOCIAL SCHEMAS
# ==========================================
class CircleCreate(BaseModel):
    name: str

class CircleJoin(BaseModel):
    join_token: str

class GhostModeUpdate(BaseModel):
    is_ghost: bool

# ==========================================
# NOTES SCHEMAS (Scratchpad)
# ==========================================
class NoteCreate(BaseModel):
    title: Optional[str] = None
    content: str

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class NoteResponse(BaseModel):
    id: int
    title: Optional[str] = None
    content: str
    updated_at: datetime.datetime

    class Config:
        from_attributes = True