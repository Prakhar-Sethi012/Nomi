import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Fetch the database URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nomi.db")

# Create the SQLAlchemy engine
# pool_pre_ping tests each connection with a lightweight query before handing
# it to a request — without it, a connection Postgres dropped (idle timeout,
# restart, load balancer) surfaces as a hard 500 on whatever request happens
# to grab it next, instead of transparently reconnecting.
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

# Create a sessionmaker to talk to the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our database models (we will use this tomorrow)
Base = declarative_base()

# Dependency to get the database session in our routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()