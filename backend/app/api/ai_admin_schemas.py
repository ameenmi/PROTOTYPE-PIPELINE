from typing import Optional

from pydantic import BaseModel, Field


class CopilotRequest(BaseModel):
    question: str = Field(min_length=2)


class AiAnalysisUpdateRequest(BaseModel):
    actor: str = "User"
    problem_statement: Optional[str] = None
    proposed_solution: Optional[str] = None
    business_objective: Optional[str] = None
    functional_requirements: Optional[str] = None
    non_functional_requirements: Optional[str] = None
    user_stories: Optional[str] = None
    data_requirements: Optional[str] = None
    upstream_systems: Optional[str] = None
    downstream_systems: Optional[str] = None
    dependencies: Optional[str] = None
    models_required: Optional[str] = None
    methodologies_required: Optional[str] = None
    risks: Optional[str] = None
    assumptions: Optional[str] = None
    open_questions: Optional[str] = None
    missing_information: Optional[str] = None
    overall_readiness: Optional[str] = None
    recommendation: Optional[str] = None
    readiness_score: Optional[float] = None


class ValueStreamRequest(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True
    lead_user_id: Optional[int] = None


class SolutionTeamRequest(BaseModel):
    name: str
    capacity: int = 8
    is_active: bool = True
    lead_user_id: Optional[int] = None


class UserRequest(BaseModel):
    name: str
    email: str
    role: str = "Value Stream Lead"
    value_stream_id: Optional[int] = None
    solution_team_id: Optional[int] = None
    is_active: bool = True


class StageRequest(BaseModel):
    name: str
    code: str
    sequence: int = 99
    is_active: bool = True


class IpsafeActivityRequest(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    sequence: int = 99
    required_for_cd: bool = True
    required_for_solution: bool = True
    is_active: bool = True
