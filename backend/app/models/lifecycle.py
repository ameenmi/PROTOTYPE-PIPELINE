from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DesignPackage(Base):
    __tablename__ = "design_packages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    initiative_id: Mapped[int] = mapped_column(ForeignKey("initiatives.id"), unique=True)
    solution_architecture: Mapped[Optional[str]] = mapped_column(Text)
    functional_design: Mapped[Optional[str]] = mapped_column(Text)
    technical_design: Mapped[Optional[str]] = mapped_column(Text)
    data_architecture: Mapped[Optional[str]] = mapped_column(Text)
    upstream_systems: Mapped[Optional[str]] = mapped_column(Text)
    downstream_systems: Mapped[Optional[str]] = mapped_column(Text)
    api_integration: Mapped[Optional[str]] = mapped_column(Text)
    synthetic_data: Mapped[Optional[str]] = mapped_column(Text)
    models: Mapped[Optional[str]] = mapped_column(Text)
    methodologies: Mapped[Optional[str]] = mapped_column(Text)
    security_considerations: Mapped[Optional[str]] = mapped_column(Text)
    deployment_considerations: Mapped[Optional[str]] = mapped_column(Text)
    dependencies: Mapped[Optional[str]] = mapped_column(Text)
    design_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(120))
    approved_at: Mapped[Optional[date]] = mapped_column(Date)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ShowTellFeedback(Base):
    __tablename__ = "show_tell_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    initiative_id: Mapped[int] = mapped_column(ForeignKey("initiatives.id"))
    session_date: Mapped[date] = mapped_column(Date)
    facilitator: Mapped[str] = mapped_column(String(120), nullable=False)
    audience: Mapped[Optional[str]] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    decision: Mapped[str] = mapped_column(String(80), default="Proceed")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class IpsafeActivity(Base):
    __tablename__ = "ipsafe_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    required_for_cd: Mapped[bool] = mapped_column(Boolean, default=True)
    required_for_solution: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class InitiativeIpsafeStatus(Base):
    __tablename__ = "initiative_ipsafe_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    initiative_id: Mapped[int] = mapped_column(ForeignKey("initiatives.id"))
    activity_id: Mapped[int] = mapped_column(ForeignKey("ipsafe_activities.id"))
    status: Mapped[str] = mapped_column(String(40), default="Not Started")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    updated_by: Mapped[Optional[str]] = mapped_column(String(120))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
