from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db

app = FastAPI()

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    try:
        # Try to execute a simple SQL command
        db.execute(text("SELECT 1"))
        return {"status": "API is alive", "database": "Connected successfully"}
    except Exception as e:
        return {"status": "API is alive", "database": "Connection FAILED", "error": str(e)}