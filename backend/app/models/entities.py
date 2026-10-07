from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RiskValueStream(Base):
    __tablename__ = "risk_value_streams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    lead_user_id: Mapped[Optional[int]] = mapped_column(Integer)

    initiatives: Mapped[list["Initiative"]] = relationship(back_populates="value_stream")


class SolutionTeam(Base):
    __tablename__ = "solution_teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=10)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    lead_user_id: Mapped[Optional[int]] = mapped_column(Integer)

    initiatives: Mapped[list["Initiative"]] = relationship(back_populates="solution_team")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(180), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(60), nullable=False)
    value_stream_id: Mapped[Optional[int]] = mapped_column(ForeignKey("risk_value_streams.id"))
    solution_team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("solution_teams.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class WorkflowStage(Base):
    __tablename__ = "workflow_stages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Initiative(Base):
    __tablename__ = "initiatives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    idea_id: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    value_stream_id: Mapped[int] = mapped_column(ForeignKey("risk_value_streams.id"))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    solution_team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("solution_teams.id"))
    initiative_type: Mapped[str] = mapped_column(String(40), default="Rapid Prototype")
    stage_code: Mapped[str] = mapped_column(String(60), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="Active")
    priority: Mapped[str] = mapped_column(String(20), default="Medium")
    business_problem: Mapped[Optional[str]] = mapped_column(Text)
    proposed_concept: Mapped[Optional[str]] = mapped_column(Text)
    business_value: Mapped[Optional[str]] = mapped_column(Text)
    target_users: Mapped[Optional[str]] = mapped_column(Text)
    expected_outcome: Mapped[Optional[str]] = mapped_column(Text)
    readiness_pct: Mapped[float] = mapped_column(Float, default=0)
    ipsafe_pct: Mapped[float] = mapped_column(Float, default=0)
    raghu_approval: Mapped[str] = mapped_column(String(30), default="Pending")
    vijay_approval: Mapped[str] = mapped_column(String(30), default="Pending")
    solution_approval: Mapped[str] = mapped_column(String(30), default="Not Started")
    age_days: Mapped[int] = mapped_column(Integer, default=0)
    attention_level: Mapped[str] = mapped_column(String(20), default="Green")
    attention_reason: Mapped[Optional[str]] = mapped_column(Text)
    submitted_at: Mapped[Optional[date]] = mapped_column(Date)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    value_stream: Mapped["RiskValueStream"] = relationship(back_populates="initiatives")
    solution_team: Mapped[Optional["SolutionTeam"]] = relationship(back_populates="initiatives")
    owner: Mapped["User"] = relationship(foreign_keys=[owner_id])
    documents: Mapped[list["Document"]] = relationship(back_populates="initiative")
    activities: Mapped[list["ActivityLog"]] = relationship(back_populates="initiative")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    initiative_id: Mapped[int] = mapped_column(ForeignKey("initiatives.id"))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(60), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(120), nullable=False)
    uploaded_at: Mapped[date] = mapped_column(Date)
    version: Mapped[str] = mapped_column(String(20), default="1.0")

    initiative: Mapped["Initiative"] = relationship(back_populates="documents")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    initiative_id: Mapped[int] = mapped_column(ForeignKey("initiatives.id"))
    actor: Mapped[str] = mapped_column(String(120), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    detail: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    initiative: Mapped["Initiative"] = relationship(back_populates="activities")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipient: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
