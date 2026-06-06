from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db
import models
from routes import profile,portfolio,tasks

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

app.include_router(profile.router)  # Connect the profile routes to the main app
app.include_router(portfolio.router)
app.include_router(tasks.router)

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "API is alive", "database": "Connected successfully"}
    except Exception as e:
        return {"status": "API is alive", "database": "Connection FAILED", "error": str(e)}