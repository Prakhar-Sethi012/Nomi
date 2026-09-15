from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Annotated
import datetime

# Reusable bounded element types for the list-of-strings fields below, so a
# client can't smuggle either a single giant string or an absurdly long list
# into a Postgres ARRAY / JSON-backed column.
Tag = Annotated[str, Field(max_length=50)]
Link = Annotated[str, Field(max_length=500)]

# ==========================================
# 1. PROFILE SCHEMAS (User Data & Settings)
# ==========================================
class ProfileCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    reg_no: str = Field(..., min_length=8, max_length=20)
    # 🔥 UPGRADED: Allows 4 characters (letters and numbers)
    app_pin: str = Field(..., pattern=r"^[a-zA-Z0-9]{4}$", description="Must be exactly 4 letters/numbers")

class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    reg_no: Optional[str] = Field(None, min_length=8, max_length=20)
    app_pin: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9]{4}$")
    previous_pin: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9]{4}$")
    cgpa: Optional[float] = Field(None, ge=0.0, le=10.0, description="CGPA must be between 0 and 10")
    custom_task_tags: Optional[List[Tag]] = Field(None, max_length=20)
    is_ghost: Optional[bool] = None
    monthly_limit: Optional[float] = None
    monthly_budgets: Optional[Dict[str, float]] = None
    security_question: Optional[str] = Field(None, max_length=200)
    security_answer: Optional[str] = Field(None, max_length=100)

    # 🔥 STRICT ONE-WORD VALIDATOR
    @field_validator('security_answer')
    @classmethod
    def answer_must_be_one_word(cls, v):
        if v is not None and " " in v.strip():
            raise ValueError('Security answer must be exactly one word with no spaces.')
        return v

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
    monthly_budgets: Optional[Dict[str, float]] = None
    security_question: Optional[str] = None

    class Config:
        from_attributes = True

class PinResetRequest(BaseModel):
    reg_no: str = Field(..., min_length=8, max_length=20)
    security_answer: str = Field(..., max_length=100)
    new_pin: str = Field(..., pattern=r"^[a-zA-Z0-9]{4}$")


class PinVerifyRequest(BaseModel):
    # Was an unbounded, unvalidated string — any client could send a huge
    # payload into the bcrypt compare. Match the same 4-char pattern every
    # other PIN field already enforces.
    app_pin: str = Field(..., pattern=r"^[a-zA-Z0-9]{4}$")

# ==========================================
# 2. PORTFOLIO SCHEMAS (Skills & Projects)
# ==========================================
class PortfolioCreate(BaseModel):
    item_type: str = Field(..., max_length=50)
    title: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    links: List[Link] = Field(default_factory=list, max_length=20)

class PortfolioUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    links: Optional[List[Link]] = Field(None, max_length=20)

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
    title: str = Field(..., min_length=1, max_length=100)
    task_type: str = Field(..., max_length=50)
    due_date: datetime.datetime
    tags: List[Tag] = Field(default_factory=list, max_length=20)
    is_todo: Optional[bool] = False
    frequency: Optional[str] = Field("Once", max_length=20) # 🔥 NEW

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    due_date: Optional[datetime.datetime] = None
    tags: Optional[List[Tag]] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=50)
    is_todo: Optional[bool] = None
    frequency: Optional[str] = Field(None, max_length=20) # 🔥 NEW

class TaskResponse(BaseModel):
    id: int
    title: str
    task_type: str
    due_date: datetime.datetime
    status: str
    tags: List[str]
    completed_at: Optional[datetime.datetime] = None
    is_todo: bool
    frequency: str # 🔥 NEW

    @field_validator('frequency', mode='before')
    @classmethod
    def set_default_frequency(cls, v):
        return v or "Once"

    class Config:
        from_attributes = True

# ==========================================
# 4. SUBJECTS SCHEMAS (Timetable & Attendance)
# ==========================================
class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    subject_type: str = Field(..., max_length=50)
    theory_slot: Optional[str] = Field(None, max_length=50)
    lab_slot: Optional[str] = Field(None, max_length=50)
    total_classes: int = Field(60, gt=0, description="Total classes must be greater than 0")
    room_number: Optional[str] = Field(None, max_length=50)

class SubjectUpdate(BaseModel):
    total_classes: Optional[int] = Field(None, gt=0, description="Cannot be zero or negative")
    room_number: Optional[str] = Field(None, max_length=50)

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
    reason: str = Field(..., min_length=2, max_length=500)
    date: datetime.date
    tags: List[Tag] = Field(default_factory=list, max_length=20)

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    reason: Optional[str] = Field(None, min_length=2, max_length=500)
    date: Optional[datetime.date] = None
    tags: Optional[List[Tag]] = Field(None, max_length=20)

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
class CircleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    custom_token: Optional[str] = Field(None, min_length=6, max_length=10, pattern=r"^[a-zA-Z0-9]+$")

class CircleResponse(BaseModel):
    id: int
    name: str
    join_token: str
    created_at: datetime.datetime
    creator_id: Optional[int] = None # 🔥 NEW

    class Config:
        from_attributes = True

class CircleSearchResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

# ==========================================
# MULTIPLAYER SOCIAL SCHEMAS
# ==========================================

class CircleJoin(BaseModel):
    # Matches CircleCreate.custom_token's own bound — a join token is never
    # longer than 10 chars, generated or custom.
    join_token: str = Field(..., min_length=1, max_length=10)

class GhostModeUpdate(BaseModel):
    is_ghost: bool

# ==========================================
# NOTES SCHEMAS (Scratchpad)
# ==========================================
class NoteCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    content: str = Field(..., max_length=5000)

class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    content: Optional[str] = Field(None, max_length=5000)

class NoteResponse(BaseModel):
    id: int
    title: Optional[str] = None
    content: str
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# ==========================================
# 8. MEETUPS & NICKNAMES (Phase 2)
# ==========================================
class FriendSettingUpdate(BaseModel):
    nickname: str = Field(..., max_length=50)

class MeetupCreate(BaseModel):
    receiver_id: int
    location: str = Field(..., max_length=200)
    meet_time: datetime.datetime

class MeetupResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    location: str
    meet_time: datetime.datetime
    status: str

    class Config:
        from_attributes = True
