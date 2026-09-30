from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401  (register models)
    Base.metadata.create_all(bind=engine)
    
    # Dynamic schema reconciliation for SQLite
    if settings.database_url.startswith("sqlite"):
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        column_specs = {
            "users": [
                ("name", "VARCHAR(100) DEFAULT ''"),
                ("title", "VARCHAR(100) DEFAULT ''"),
                ("state", "VARCHAR(60) DEFAULT ''"),
                ("district", "VARCHAR(60) DEFAULT ''"),
                ("block", "VARCHAR(80) DEFAULT ''"),
                ("department", "VARCHAR(120) DEFAULT ''"),
            ],
            "requests": [
                ("assigned_field_officer_id", "INTEGER"),
                ("sla_due_at", "DATETIME"),
                ("block", "VARCHAR(80) DEFAULT ''"),
                ("escalated", "BOOLEAN DEFAULT 0"),
                ("escalation_reason", "TEXT DEFAULT ''"),
                ("rework_note", "TEXT DEFAULT ''"),
                ("in_progress_at", "DATETIME"),
                ("resolved_at", "DATETIME"),
                ("proof_count", "INTEGER DEFAULT 0"),
                ("phone_last4", "VARCHAR(4)"),
            ],
            "projects": [
                ("sdg", "VARCHAR(20) DEFAULT ''"),
                ("scheme", "VARCHAR(120) DEFAULT ''"),
                ("proposer_user", "VARCHAR(100)"),
                ("proposed_at", "DATETIME"),
                ("district_approved_at", "DATETIME"),
                ("district_approved_by", "VARCHAR(100)"),
                ("state_approved_at", "DATETIME"),
                ("state_approved_by", "VARCHAR(100)"),
                ("sanctioned_amount_inr", "FLOAT DEFAULT 0.0"),
                ("spent_amount_inr", "FLOAT DEFAULT 0.0"),
                ("funded_at", "DATETIME"),
                ("funded_by", "VARCHAR(100)"),
                ("decision_reason", "TEXT DEFAULT ''"),
                ("rejection_reason", "TEXT DEFAULT ''"),
                ("approved_by_district", "VARCHAR(100) DEFAULT ''"),
                ("approved_by_district_at", "DATETIME"),
                ("approved_by_state", "VARCHAR(100) DEFAULT ''"),
                ("approved_by_state_at", "DATETIME"),
                ("funded_by_national", "VARCHAR(100) DEFAULT ''"),
                ("funded_by_national_at", "DATETIME"),
                ("completed_at", "DATETIME"),
            ],
            "status_history": [
                ("public_visible", "BOOLEAN DEFAULT 1"),
            ],
            "proof_uploads": [
                ("sha256_hash", "VARCHAR(64) DEFAULT ''"),
                ("exif_metadata", "JSON"),
                ("is_suspicious", "BOOLEAN DEFAULT 0"),
                ("suspicious_reason", "VARCHAR(255) DEFAULT ''"),
                ("is_public", "BOOLEAN DEFAULT 0"),
                ("lat", "FLOAT"),
                ("lng", "FLOAT"),
            ],
        }
        
        with engine.connect() as conn:
            for tbl, cols in column_specs.items():
                if tbl in existing_tables:
                    existing_cols = {c["name"] for c in inspector.get_columns(tbl)}
                    for col_name, col_type in cols:
                        if col_name not in existing_cols:
                            try:
                                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col_name} {col_type}"))
                                conn.commit()
                            except Exception:
                                pass

