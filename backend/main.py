from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware  # NEW IMPORT
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db
from routers import weather
import models

from routes import profile, portfolio, tasks, subjects, expenses

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- NEW CORS CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your Vite React port
    allow_credentials=True,
    allow_methods=["*"],                      # Allow all requests (GET, POST, etc.)
    allow_headers=["*"],
)
# ------------------------------

app.include_router(profile.router)
app.include_router(portfolio.router)
app.include_router(tasks.router)
app.include_router(subjects.router)
app.include_router(expenses.router)
app.include_router(weather.router)
@app.get("/")
def read_root(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "API is alive", "database": "Connected successfully"}
    except Exception as e:
        return {"status": "API is alive", "database": "Connection FAILED", "error": str(e)}