from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware  # NEW IMPORT
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db
from routers import weather
import models
from routes import profile, portfolio, tasks, subjects, expenses, social,auth_routes,notes


models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- NEW CORS CONFIGURATION ---
# --- CORS CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174", # Sometimes Vite jumps to 5174!
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ------------------------------
# ------------------------------

app.include_router(profile.router)
app.include_router(portfolio.router)
app.include_router(tasks.router)
app.include_router(subjects.router)
app.include_router(expenses.router)
app.include_router(weather.router)
app.include_router(social.router)
app.include_router(auth_routes.router)
app.include_router(notes.router)

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "API is alive", "database": "Connected successfully"}
    except Exception as e:
        return {"status": "API is alive", "database": "Connection FAILED", "error": str(e)}