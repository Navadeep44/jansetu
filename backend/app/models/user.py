"""User model for Role-Based Access Control (RBAC).

Supports both Citizens (independent grievance tracking, personal data protection)
and Officers (Super Admin, Admin, State Officer, District Officer, Department Officer, Field Officer)
with fine-grained jurisdictional boundaries (State, District, Department).
"""
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(120), nullable=True, index=True)
    phone = Column(String(32), nullable=True, index=True)
    password_hash = Column(String(256), nullable=False)
    name = Column(String(120), nullable=False)
    title = Column(String(160), nullable=True)
    
    # "citizen" or "officer"
    user_type = Column(String(32), nullable=False, default="citizen", index=True)
    
    # "citizen", "super_admin", "admin", "state_officer", "district_officer", "dept_officer", "field_officer"
    role = Column(String(32), nullable=False, default="citizen", index=True)
    
    # Jurisdiction Scoping
    country_code = Column(String(4), nullable=False, default="IN", index=True)
    state = Column(String(80), nullable=True, index=True)          # e.g., "Telangana", "Delhi", "Bihar"
    district = Column(String(80), nullable=True, index=True)       # e.g., "Adilabad", "South Delhi"
    block = Column(String(80), nullable=True, index=True)          # e.g., "Utnoor", "Mehrauli" (block / ward / zone)
    department = Column(String(64), nullable=True, index=True)     # e.g., "water", "roads", "health", "all"
    
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "phone": self.phone,
            "name": self.name,
            "title": self.title,
            "user_type": self.user_type,
            "role": self.role,
            "country_code": self.country_code,
            "state": self.state,
            "district": self.district,
            "block": self.block,
            "department": self.department,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
