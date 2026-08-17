from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy.orm import Session
from typing import List
import models, schemas, io, datetime
from database import get_db
from auth import get_current_user 
from fastapi.responses import PlainTextResponse
from sqlalchemy import extract

router = APIRouter(prefix="/expenses", tags=["Money Manager"])

# 1. LOG A NEW EXPENSE
@router.post("/", response_model=schemas.ExpenseResponse)
def log_expense(
    expense_data: schemas.ExpenseCreate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Tag with user_id
    new_expense = models.Expense(**expense_data.model_dump(), user_id=current_user.id)
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

# 2. GET ALL EXPENSES
@router.get("/", response_model=List[schemas.ExpenseResponse])
def get_expenses(
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Filter by user_id and keep your custom descending date order
    return db.query(models.Expense).filter(
        models.Expense.user_id == current_user.id
    ).order_by(models.Expense.date.desc()).all()

# 3. DELETE AN EXPENSE
@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Verify ownership
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized")
    
    db.delete(expense)
    db.commit()
    return {"status": "success", "detail": "Expense deleted"}

# 4. UPDATE AN EXPENSE
@router.put("/{expense_id}", response_model=schemas.ExpenseResponse)
def update_expense(
    expense_id: int, 
    expense_data: schemas.ExpenseUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(get_current_user) # 🛡️
):
    # 🛡️ Verify ownership
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized")
        
    update_data = expense_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(expense, key, value)
        
    db.commit()
    db.refresh(expense)
    return expense

# 5. EXPORT EXPENSES TO TXT
@router.get("/export")
def export_expenses(month: int = None, year: int = None, db: Session = Depends(get_db), current_user: models.Profile = Depends(get_current_user)):
    query = db.query(models.Expense).filter_by(user_id=current_user.id)
    
    title = f"EXPENSE REPORT FOR {current_user.name.upper()}"
    filename = f"expenses_{current_user.name.replace(' ', '_')}"

    # Filter by specific Month & Year, or just Year
    if year is not None and month is not None:
        query = query.filter(extract('year', models.Expense.date) == year, extract('month', models.Expense.date) == month)
        title += f" ({year}-{month:02d})"
        filename += f"_{year}_{month:02d}.txt"
    elif year is not None:
        query = query.filter(extract('year', models.Expense.date) == year)
        title += f" ({year})"
        filename += f"_{year}.txt"

    expenses = query.order_by(models.Expense.date.desc()).all()
    
    output = io.StringIO()
    output.write(title + "\n")
    output.write("="*40 + "\n")
    output.write(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
    
    total = 0
    for exp in expenses:
        total += exp.amount
        output.write(f"[{exp.date}] {exp.reason}: ₹{exp.amount:.2f}\n")
        if exp.tags:
            output.write(f"    Tags: {', '.join(exp.tags)}\n")
    
    output.write("="*40 + "\n")
    output.write(f"TOTAL SPEND: ₹{total:.2f}\n")
    
    return PlainTextResponse(output.getvalue(), media_type="text/plain", headers={
        "Content-Disposition": f"attachment; filename={filename}"
    })