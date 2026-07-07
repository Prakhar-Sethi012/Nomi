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

# ROUTE 3: Delete an item
@router.delete("/{item_id}")
def delete_portfolio_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.PortfolioItem).filter(models.PortfolioItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    db.delete(item)
    db.commit()
    return {"status": "success", "detail": "Item deleted"}

@router.put("/{item_id}", response_model=schemas.PortfolioResponse)
def update_portfolio_item(item_id: int, item_data: schemas.PortfolioUpdate, db: Session = Depends(get_db)):
    item = db.query(models.PortfolioItem).filter(models.PortfolioItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
        
    db.commit()
    db.refresh(item)
    return item