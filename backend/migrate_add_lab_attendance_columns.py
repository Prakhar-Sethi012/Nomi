"""
One-off migration: adds separate Lab attendance/total columns to `subjects`
so an Embedded course's Theory and Lab components can be logged
independently (see models.Subject for why). Data-preserving — existing rows
just pick up the DEFAULTs below, the existing total_classes/attended_classes/
conducted_classes columns are untouched.

Usage: python migrate_add_lab_attendance_columns.py
"""
from sqlalchemy import text
from database import engine

STATEMENTS = [
    "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS lab_total_classes INTEGER DEFAULT 60",
    "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS lab_attended_classes INTEGER DEFAULT 0",
    "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS lab_conducted_classes INTEGER DEFAULT 0",
]

if __name__ == "__main__":
    with engine.begin() as conn:
        for stmt in STATEMENTS:
            print(f"Running: {stmt}...")
            conn.execute(text(stmt))
    print("Migration complete.")
