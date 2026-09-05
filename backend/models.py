from sqlalchemy import Column, Integer, String, Float, Date, ARRAY, DateTime, Boolean, ForeignKey,JSON
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
    is_npc = Column(Boolean, default=False)
    managed_by = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE"), nullable=True)
    monthly_budgets = Column(JSON, default={})
    security_question = Column(String, nullable=True)
    security_answer = Column(String, nullable=True)
    
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
    frequency = Column(String, default="Once", nullable=False)
    
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
class Circle(Base):
    __tablename__ = "circles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    join_token = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    creator_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE"), nullable=True) # 🔥 NEW: Leader tracking

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

# 🔥 NEW: Nicknames mapping
class FriendSetting(Base):
    __tablename__ = "friend_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE"))
    friend_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE"))
    nickname = Column(String, nullable=False)

# 🔥 NEW: Request Room / Meetups
class Meetup(Base):
    __tablename__ = "meetups"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE"))
    receiver_id = Column(Integer, ForeignKey("profile.id", ondelete="CASCADE"))
    location = Column(String, nullable=False)
    meet_time = Column(DateTime, nullable=False)
    status = Column(String, default="pending")    

# 🔥 NEW: Circle Audit Log
class CircleHistory(Base):
    __tablename__ = "circle_history"
    id = Column(Integer, primary_key=True, index=True)
    circle_id = Column(Integer, ForeignKey("circles.id", ondelete="CASCADE"))
    user_name = Column(String, nullable=False)
    action = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)