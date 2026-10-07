import logging
import os

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db
import models
from routes import profile, portfolio, tasks, subjects, expenses, social, auth_routes, notes, weather, system

logger = logging.getLogger("uvicorn.error")

# --- ENVIRONMENT ---
# Defaults to "production" on purpose (fail-safe): if a deploy ever forgets
# to set this, the app should lock itself down, not accidentally expose
# docs/tracebacks. Only an explicit ENVIRONMENT=development opens them up.
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
IS_PRODUCTION = ENVIRONMENT == "production"

models.Base.metadata.create_all(bind=engine)

# Auto-migrate schema updates for existing tables
with engine.connect() as conn:
    for stmt in [
        "ALTER TABLE tasks ADD COLUMN due_time VARCHAR;",
        "ALTER TABLE tasks ADD COLUMN duration INTEGER;",
    ]:
        try:
            conn.execute(text(stmt))
            conn.commit()
        except Exception:
            conn.rollback()

app = FastAPI(
    # Swagger/ReDoc/the raw OpenAPI schema are a free map of every route,
    # model, and field constraint to anyone who asks — only wire them up
    # outside production.
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# --- CORS CONFIGURATION ---
# ALLOWED_ORIGINS is a comma-separated list read from the environment, so
# the real production frontend domain is set at deploy time and never has
# to be hardcoded here. Falls back to the local Vite dev ports when unset.
_DEFAULT_DEV_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_DEV_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- SECURITY HEADERS (Helmet-style) ---
# No Content-Security-Policy here on purpose: this backend only ever returns
# JSON, never HTML, so a CSP belongs on whatever serves the built React app
# (static host / CDN / nginx config), not this API.
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    if IS_PRODUCTION:
        # Only meaningful once you're actually behind HTTPS in production —
        # harmless to send otherwise, but scoped to prod to avoid implying
        # a security guarantee that plain local dev doesn't have.
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# --- GLOBAL ERROR HANDLER ---
# Anything that isn't already an HTTPException (i.e. a genuine bug, not an
# intentional 4xx a route raised on purpose) is logged in full server-side
# and reduced to one generic message for the client. FastAPI still handles
# HTTPException/RequestValidationError with their own, more specific
# handlers first — this only catches what would otherwise be an unhandled
# exception leaking a stack trace.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


app.include_router(profile.router)
app.include_router(portfolio.router)
app.include_router(tasks.router)
app.include_router(subjects.router)
app.include_router(expenses.router)
app.include_router(weather.router)
app.include_router(social.router)
app.include_router(auth_routes.router)
app.include_router(notes.router)
app.include_router(system.router)

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "API is alive", "database": "Connected successfully"}
    except Exception:
        # Never echo the raw exception back to the caller — it can contain
        # hostnames, connection strings, or driver internals. Full detail
        # still goes to the server log for whoever's debugging the outage.
        logger.exception("Database health check failed")
        return {"status": "API is alive", "database": "Connection FAILED"}
