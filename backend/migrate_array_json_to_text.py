"""
One-off migration: converts the Postgres-native ARRAY/JSON columns that
predate the JSONEncodedValue TypeDecorator (see models.py) into plain TEXT
columns holding the equivalent JSON text — data-preserving, run once per
database (dev now, production before/during deploy).

Usage: python migrate_array_json_to_text.py
"""
from sqlalchemy import text
from database import engine

STATEMENTS = [
    """ALTER TABLE profile
       ALTER COLUMN custom_task_tags TYPE text
       USING COALESCE(array_to_json(custom_task_tags)::text, '[]')""",
    """ALTER TABLE profile
       ALTER COLUMN monthly_budgets TYPE text
       USING COALESCE(monthly_budgets::text, '{}')""",
    """ALTER TABLE tasks
       ALTER COLUMN tags TYPE text
       USING COALESCE(array_to_json(tags)::text, '[]')""",
    """ALTER TABLE expenses
       ALTER COLUMN tags TYPE text
       USING COALESCE(array_to_json(tags)::text, '[]')""",
    """ALTER TABLE portfolio
       ALTER COLUMN links TYPE text
       USING COALESCE(array_to_json(links)::text, '[]')""",
]

if __name__ == "__main__":
    with engine.begin() as conn:
        for stmt in STATEMENTS:
            print(f"Running: {stmt.splitlines()[0]}...")
            conn.execute(text(stmt))
    print("Migration complete.")
