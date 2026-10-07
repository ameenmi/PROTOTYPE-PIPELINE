from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field


class DocumentIn(BaseModel):
    filename: str
    document_type: str
    uploaded_by: str = "Value Stream Lead"
    version: str = "1.0"


class CreateIdeaRequest(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    value_stream_id: int
    owner_id: int
    business_problem: str
    proposed_concept: str
    business_value: str
    priority: str = "Medium"
    target_users: Optional[str] = None
    expected_outcome: Optional[str] = None
    initiative_type: str = "Rapid Prototype"
    documents: list[DocumentIn] = Field(default_factory=list)


class ManagementApprovalRequest(BaseModel):
    approver: str  # Raghu | Vijay
    action: str  # Approve | Reject | Request Clarification | Send Back
    comment: Optional[str] = None
    initiative_type: Optional[str] = None  # Rapid Prototype | MVP


class SolutionReadinessRequest(BaseModel):
    actor: str = "Solution Lead"
    action: str  # Accept | Request More Information | Return to Value Stream
    comment: Optional[str] = None
    solution_team_id: Optional[int] = None
    checklist: Optional[dict[str, str]] = None


class IdeaCreatedResponse(BaseModel):
    idea_id: str
    message: str
