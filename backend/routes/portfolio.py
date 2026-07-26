from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from auth import get_current_user # 🛡️ THE BOUNCER

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])

# ROUTE 1: Add a new Skill or Project
@router.post("/", response_model=schemas.PortfolioResponse)
def add_portfolio_item(
    item_data: schemas.PortfolioCreate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Tag with user_id
    new_item = models.PortfolioItem(**item_data.model_dump(), user_id=current_user.id)
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

# ROUTE 2: Get your entire resume/portfolio
@router.get("/", response_model=List[schemas.PortfolioResponse])
def get_portfolio(
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Only get portfolio items belonging to the logged-in user
    items = db.query(models.PortfolioItem).filter(models.PortfolioItem.user_id == current_user.id).all()
    return items

# ROUTE 3: Delete an item
@router.delete("/{item_id}")
def delete_portfolio_item(
    item_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Verify ownership
    item = db.query(models.PortfolioItem).filter(models.PortfolioItem.id == item_id, models.PortfolioItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")
        
    db.delete(item)
    db.commit()
    return {"status": "success", "detail": "Item deleted"}

# ROUTE 4: Update an item
@router.put("/{item_id}", response_model=schemas.PortfolioResponse)
def update_portfolio_item(
    item_id: int, 
    item_data: schemas.PortfolioUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Verify ownership
    item = db.query(models.PortfolioItem).filter(models.PortfolioItem.id == item_id, models.PortfolioItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")
        
    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
        
    db.commit()
    db.refresh(item)
    return item