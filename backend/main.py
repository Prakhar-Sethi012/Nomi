from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db
import models

# Import your route files
from routes import profile, portfolio, tasks, subjects, expenses

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Connect ALL routers to the main engine
app.include_router(profile.router)
app.include_router(portfolio.router)
app.include_router(tasks.router)
app.include_router(subjects.router)
app.include_router(expenses.router)

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "API is alive", "database": "Connected successfully"}
    except Exception as e:
        return {"status": "API is alive", "database": "Connection FAILED", "error": str(e)}