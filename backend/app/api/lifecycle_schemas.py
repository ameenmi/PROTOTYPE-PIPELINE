from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class DesignPackageRequest(BaseModel):
    solution_architecture: Optional[str] = None
    functional_design: Optional[str] = None
    technical_design: Optional[str] = None
    data_architecture: Optional[str] = None
    upstream_systems: Optional[str] = None
    downstream_systems: Optional[str] = None
    api_integration: Optional[str] = None
    synthetic_data: Optional[str] = None
    models: Optional[str] = None
    methodologies: Optional[str] = None
    security_considerations: Optional[str] = None
    deployment_considerations: Optional[str] = None
    dependencies: Optional[str] = None
    actor: str = "Solution Lead"


class DesignApproveRequest(BaseModel):
    actor: str = "Solution Lead"
    comment: Optional[str] = None


class StageAdvanceRequest(BaseModel):
    actor: str = "Solution Lead"
    target_stage: str
    comment: Optional[str] = None


class ShowTellRequest(BaseModel):
    facilitator: str = "Solution Lead"
    audience: Optional[str] = None
    summary: str
    feedback: str
    decision: str = "Proceed"
    session_date: Optional[date] = None
    advance: bool = True


class PromoteRequest(BaseModel):
    actor: str = "Administrator"
    comment: Optional[str] = None


class IpsafeUpdateRequest(BaseModel):
    actor: str = "Solution Lead"
    updates: list[dict] = Field(default_factory=list)
    # each: {activity_id|code, status, notes?}


class ConvertSolutionRequest(BaseModel):
    actor: str = "Administrator"
    comment: Optional[str] = None
