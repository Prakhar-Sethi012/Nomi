from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db
import models

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "API is alive", "database": "Connected successfully"}
    except Exception as e:
        return {"status": "API is alive", "database": "Connection FAILED", "error": str(e)}