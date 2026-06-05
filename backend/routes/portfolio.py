from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

# Create a router specifically for portfolio actions
router = APIRouter(prefix="/portfolio", tags=["Portfolio"])

# ROUTE 1: Add a new Skill or Project
@router.post("/", response_model=schemas.PortfolioResponse)
def add_portfolio_item(item_data: schemas.PortfolioCreate, db: Session = Depends(get_db)):
    # .model_dump() is a Pydantic trick that instantly converts the schema into a dictionary
    new_item = models.PortfolioItem(**item_data.model_dump())
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

# ROUTE 2: Get your entire resume/portfolio
@router.get("/", response_model=List[schemas.PortfolioResponse])
def get_portfolio(db: Session = Depends(get_db)):
    items = db.query(models.PortfolioItem).all()
    return items