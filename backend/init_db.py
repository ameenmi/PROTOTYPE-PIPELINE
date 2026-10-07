"""
Create tables and load seed data into the configured PostgreSQL database.

Usage (from /backend):
  .\\.venv\\Scripts\\activate
  python init_db.py
"""

from __future__ import annotations

import sys

from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models import (  # noqa: F401
    ActivityLog,
    AiAnalysis,
    DesignPackage,
    Document,
    Initiative,
    InitiativeIpsafeStatus,
    IpsafeActivity,
    Notification,
    RiskValueStream,
    ShowTellFeedback,
    SolutionTeam,
    User,
    WorkflowStage,
)
from app.services.seed import ensure_ipsafe_activities, seed_database


def main() -> int:
    print(f"Connecting: {settings.database_url}")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        print("ERROR: Could not connect to PostgreSQL.")
        print(exc)
        print("\nEnsure the database exists, e.g.:")
        print("  CREATE DATABASE prototype_pipeline;")
        return 1

    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables ready.")

    db = SessionLocal()
    try:
        existing = db.query(Initiative).count()
        if existing > 0:
            print(f"Initiative seed skipped — {existing} initiatives already present.")
            ensure_ipsafe_activities(db)
            print("IPSAFE activities ensured.")
        else:
            print("Seeding reference data and 30 initiatives...")
            seed_database(db)
            print("Seed completed.")
        print(f"Initiatives in DB: {db.query(Initiative).count()}")
        print(f"Value streams: {db.query(RiskValueStream).count()}")
        print(f"Solution teams: {db.query(SolutionTeam).count()}")
        print(f"Users: {db.query(User).count()}")
        print(f"IPSAFE activities: {db.query(IpsafeActivity).count()}")
    finally:
        db.close()

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
