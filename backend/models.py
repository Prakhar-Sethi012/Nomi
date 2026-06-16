from sqlalchemy import Column, Integer, String, Float, Date, ARRAY, DateTime, Boolean
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
    task_type = Column(String, nullable=False)        
    due_date = Column(DateTime, nullable=False)
    status = Column(String, default="Pending")        
    tags = Column(ARRAY(String), nullable=False)      
    completed_at = Column(DateTime, nullable=True)    
    
    #  NEW FEATURE TOGGLE
    is_todo = Column(Boolean, default=False)
from sqlalchemy import Column, Integer, String
# Assuming you have your Base imported at the top of the file

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    subject_type = Column(String) # Will store: 'THEORY', 'LAB', or 'EMBEDDED'
    
    # Slots
    theory_slot = Column(String, nullable=True) # e.g., 'A1+TA1'
    lab_slot = Column(String, nullable=True)    # e.g., 'L31+L32'
    
    # Crystal Ball / Attendance Tracking
    total_classes = Column(Integer, default=60)
    attended_classes = Column(Integer, default=0)
    conducted_classes = Column(Integer, default=0)

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