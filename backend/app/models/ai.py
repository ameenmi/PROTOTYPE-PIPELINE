from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AiAnalysis(Base):
    __tablename__ = "ai_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    initiative_id: Mapped[int] = mapped_column(ForeignKey("initiatives.id"), unique=True)
    problem_statement: Mapped[Optional[str]] = mapped_column(Text)
    proposed_solution: Mapped[Optional[str]] = mapped_column(Text)
    business_objective: Mapped[Optional[str]] = mapped_column(Text)
    functional_requirements: Mapped[Optional[str]] = mapped_column(Text)
    non_functional_requirements: Mapped[Optional[str]] = mapped_column(Text)
    user_stories: Mapped[Optional[str]] = mapped_column(Text)
    data_requirements: Mapped[Optional[str]] = mapped_column(Text)
    upstream_systems: Mapped[Optional[str]] = mapped_column(Text)
    downstream_systems: Mapped[Optional[str]] = mapped_column(Text)
    dependencies: Mapped[Optional[str]] = mapped_column(Text)
    models_required: Mapped[Optional[str]] = mapped_column(Text)
    methodologies_required: Mapped[Optional[str]] = mapped_column(Text)
    risks: Mapped[Optional[str]] = mapped_column(Text)
    assumptions: Mapped[Optional[str]] = mapped_column(Text)
    open_questions: Mapped[Optional[str]] = mapped_column(Text)
    missing_information: Mapped[Optional[str]] = mapped_column(Text)
    readiness_summary: Mapped[Optional[str]] = mapped_column(Text)
    readiness_score: Mapped[float] = mapped_column(Float, default=0)
    overall_readiness: Mapped[Optional[str]] = mapped_column(String(120))
    recommendation: Mapped[Optional[str]] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(40), default="heuristic")
    raw_json: Mapped[Optional[str]] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
