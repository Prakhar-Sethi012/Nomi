from sqlalchemy import Column, Integer, String, Float, Date, ARRAY, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
import datetime
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
    custom_task_tags = Column(ARRAY(String), default=[]) 
    is_ghost = Column(Boolean, default=False)
    monthly_limit = Column(Float, nullable=True, default=0.0)

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE")) # 🛡️ Linked to User
    title = Column(String, nullable=False)
    task_type = Column(String, nullable=False)        
    due_date = Column(DateTime, nullable=False)
    status = Column(String, default="Pending")        
    tags = Column(ARRAY(String), nullable=False)      
    completed_at = Column(DateTime, nullable=True)    
    is_todo = Column(Boolean, default=False)

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE")) # 🛡️ Linked to User
    name = Column(String, index=True)
    subject_type = Column(String) 
    theory_slot = Column(String, nullable=True) 
    lab_slot = Column(String, nullable=True)    
    room_number = Column(String, nullable=True)
    total_classes = Column(Integer, default=60)
    attended_classes = Column(Integer, default=0)
    conducted_classes = Column(Integer, default=0)

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE")) # 🛡️ Linked to User
    amount = Column(Float, nullable=False)
    reason = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    tags = Column(ARRAY(String), nullable=False)      

class PortfolioItem(Base):
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE")) # 🛡️ Linked to User
    item_type = Column(String, nullable=False)        
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    links = Column(ARRAY(String), default=[])         

# ==========================================
# MULTIPLAYER SOCIAL MODELS
# ==========================================
class Friendship(Base):
    __tablename__ = "friendships"
    
    user_id_1 = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE"), primary_key=True)
    user_id_2 = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE"), primary_key=True)
    status = Column(String, default="pending") 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Circle(Base):
    __tablename__ = "circles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    join_token = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CircleMember(Base):
    __tablename__ = "circle_members"
    
    circle_id = Column(Integer, ForeignKey("circles.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE"), primary_key=True)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE")) 
    title = Column(String, nullable=True)
    content = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)