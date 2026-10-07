import os
import jwt
import bcrypt
import hmac
import datetime
from dotenv import load_dotenv
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
import models

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is not set. Add it to backend/.env "
        "(e.g. `python -c \"import secrets; print(secrets.token_hex(32))\"`)."
    )
ALGORITHM = "HS256"
security = HTTPBearer()

# --- 1. PASSWORD HASHING (No more Passlib!) ---
def get_password_hash(password: str) -> str:
    # bcrypt requires bytes, so we encode the string
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # Decode back to a string so it can be saved in your PostgreSQL database
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except ValueError:
        # If the hash is corrupted or still plain text, bcrypt throws a ValueError
        return False

# Constant-time comparison for the legacy plain-text PIN fallback, so a mismatch
# can't be timed character-by-character.
def constant_time_str_eq(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode('utf-8'), b.encode('utf-8'))

# --- 2. TOKEN GENERATION ---
def create_access_token(user_id: int):
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    to_encode = {"sub": str(user_id), "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- 3. THE GATEKEEPER DEPENDENCY ---
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    user = db.query(models.Profile).filter(models.Profile.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found. Please log in again.")
    
    return user