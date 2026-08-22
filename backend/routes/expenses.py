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

    if year is not None and month is not None:
        query = query.filter(extract('year', models.Expense.date) == year, extract('month', models.Expense.date) == month)
        title += f" ({year}-{month:02d})"
        filename += f"_{year}_{month:02d}.txt"
    elif year is not None:
        query = query.filter(extract('year', models.Expense.date) == year)
        title += f" ({year})"
        filename += f"_{year}.txt"

    expenses = query.order_by(models.Expense.date.asc()).all()
    
    output = io.StringIO()
    output.write(f"{title}\n")
    output.write(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
    output.write("="*75 + "\n\n")
    
    if not expenses:
        output.write("No transactions found for this period.\n")
        return PlainTextResponse(output.getvalue(), media_type="text/plain", headers={"Content-Disposition": f"attachment; filename={filename}"})

    # --- 1. DYNAMIC COLUMN WIDTHS ---
    # Find the longest description to make the table perfectly aligned
    max_desc_len = max([len(exp.reason) for exp in expenses] + [11]) # 11 is length of "DESCRIPTION"
    max_desc_len = min(max_desc_len, 40) # Cap at 40 chars so it doesn't break screens
    
    # Header Row
    header = f"| {'DATE':<10} | {'CATEGORY':<13} | {'DESCRIPTION':<{max_desc_len}} | {'AMOUNT (₹)':>10} |"
    separator = "-" * len(header)
    
    output.write("TRANSACTION LOG\n")
    output.write(separator + "\n")
    output.write(header + "\n")
    output.write(separator + "\n")
    
    total = 0
    category_totals = {}
    
    for exp in expenses:
        total += exp.amount
        
        # Track category totals
        cat = exp.tags[0].upper() if exp.tags else "OTHER"
        category_totals[cat] = category_totals.get(cat, 0) + exp.amount
        
        # Truncate long descriptions with '...'
        desc = (exp.reason[:max_desc_len-3] + '...') if len(exp.reason) > max_desc_len else exp.reason
        
        row = f"| {str(exp.date):<10} | {cat:<13} | {desc:<{max_desc_len}} | {exp.amount:>10.2f} |"
        output.write(row + "\n")
        
    output.write(separator + "\n")
    output.write(f"| {'':<10}   {'':<13}   {'TOTAL SPEND:':>{max_desc_len}} | {total:>10.2f} |\n")
    output.write(separator + "\n\n")
    
    # --- 2. CATEGORY SUMMARY TABLE ---
    output.write("CATEGORY SUMMARY\n")
    summary_header = f"| {'CATEGORY':<15} | {'TOTAL (₹)':>12} | {'PERCENTAGE':>10} |"
    sum_separator = "-" * len(summary_header)
    
    output.write(sum_separator + "\n")
    output.write(summary_header + "\n")
    output.write(sum_separator + "\n")
    
    # Sort categories by highest spend
    sorted_cats = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    
    for cat, amt in sorted_cats:
        percent = (amt / total) * 100 if total > 0 else 0
        output.write(f"| {cat:<15} | {amt:>12.2f} | {percent:>9.1f}% |\n")
        
    output.write(sum_separator + "\n")
    
    return PlainTextResponse(output.getvalue(), media_type="text/plain", headers={
        "Content-Disposition": f"attachment; filename={filename}"
    })