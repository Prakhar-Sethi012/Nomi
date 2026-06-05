from pydantic import BaseModel
from typing import List, Optional
from datetime import date

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

    class Config:
        from_attributes = True