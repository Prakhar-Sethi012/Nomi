from sqlalchemy import Column, Integer, String, Float, Date, ARRAY, DateTime
from database import Base

class Profile(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    reg_no = Column(String, unique=True, index=True)
    cgpa = Column(Float, nullable=True)
    app_pin = Column(String, nullable=False)          
    current_streak = Column(Integer, default=0)
    last_active_date = Column(Date, nullable=True)
    custom_task_tags = Column(ARRAY(String), default=[]) # Stores 2-3 customizable tags

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    task_type = Column(String, nullable=False)        # "Schedule" or "Work"
    due_date = Column(DateTime, nullable=False)
    status = Column(String, default="Pending")        
    tags = Column(ARRAY(String), nullable=False)      # Validated later in FastAPI
    completed_at = Column(DateTime, nullable=True)    

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    room = Column(String, nullable=True)
    total_classes = Column(Integer, nullable=False)
    attended_classes = Column(Integer, default=0)

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    reason = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    tags = Column(ARRAY(String), nullable=False)      # e.g., ["Food", "Books"]

class PortfolioItem(Base):
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(String, nullable=False)        # "Skill" or "Project"
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    links = Column(ARRAY(String), default=[])         # Array of links (GitHub, etc.)