from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime

# ==========================================
# 1. PROFILE SCHEMAS
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
    last_active_date: Optional[date] = None
    custom_task_tags: Optional[List[str]] = None

class ProfileResponse(BaseModel):
    id: int
    name: str
    reg_no: str
    # 🚨 SECURITY FIX: app_pin has been permanently removed from the response model.
    cgpa: Optional[float] = None
    current_streak: int
    last_active_date: Optional[date] = None
    custom_task_tags: List[str]

    class Config:
        from_attributes = True

# ==========================================
# 2. PORTFOLIO SCHEMAS 
# ==========================================
class PortfolioCreate(BaseModel):
    item_type: str 
    title: str = Field(..., min_length=2)
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

# ==========================================
# 3. TASK SCHEMAS 
# ==========================================
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1)
    task_type: str      
    due_date: datetime  
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

# ==========================================
# 4. SUBJECTS SCHEMAS 
# ==========================================
class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=2)
    subject_type: str
    theory_slot: Optional[str] = None
    lab_slot: Optional[str] = None
    total_classes: int = Field(60, gt=0, description="Total classes must be greater than 0")
    room_number: Optional[str] = None

class SubjectResponse(SubjectCreate):
    id: int
    attended_classes: int = Field(..., ge=0)
    conducted_classes: int = Field(..., ge=0)

    class Config:
        from_attributes = True

# ==========================================
# 5. EXPENSES SCHEMAS 
# ==========================================
class ExpenseCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Expense amount must be positive")
    reason: str = Field(..., min_length=2)
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

# Add this inside the "4. SUBJECTS SCHEMAS" section
class SubjectUpdate(BaseModel):
    total_classes: Optional[int] = Field(None, gt=0, description="Cannot be zero or negative")
    room_number: Optional[str] = None