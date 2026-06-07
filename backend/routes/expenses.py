from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter(prefix="/expenses", tags=["Money Manager"])

# 1. LOG A NEW EXPENSE
@router.post("/", response_model=schemas.ExpenseResponse)
def log_expense(expense_data: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    new_expense = models.Expense(**expense_data.model_dump())
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

# 2. GET ALL EXPENSES
@router.get("/", response_model=List[schemas.ExpenseResponse])
def get_expenses(db: Session = Depends(get_db)):
    # Order by date descending (newest first)
    return db.query(models.Expense).order_by(models.Expense.date.desc()).all()