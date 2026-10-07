from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.entities import RiskValueStream, SolutionTeam, User, WorkflowStage
from app.models.lifecycle import IpsafeActivity


def list_admin(db: Session) -> dict[str, Any]:
    return {
        "value_streams": [
            {
                "id": vs.id,
                "name": vs.name,
                "code": vs.code,
                "description": vs.description,
                "is_active": vs.is_active,
                "lead_user_id": vs.lead_user_id,
            }
            for vs in db.query(RiskValueStream).order_by(RiskValueStream.name).all()
        ],
        "solution_teams": [
            {
                "id": t.id,
                "name": t.name,
                "capacity": t.capacity,
                "is_active": t.is_active,
                "lead_user_id": t.lead_user_id,
            }
            for t in db.query(SolutionTeam).order_by(SolutionTeam.name).all()
        ],
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "value_stream_id": u.value_stream_id,
                "solution_team_id": u.solution_team_id,
                "is_active": u.is_active,
            }
            for u in db.query(User).order_by(User.name).all()
        ],
        "stages": [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "sequence": s.sequence,
                "is_active": s.is_active,
            }
            for s in db.query(WorkflowStage).order_by(WorkflowStage.sequence).all()
        ],
        "ipsafe_activities": [
            {
                "id": a.id,
                "code": a.code,
                "name": a.name,
                "description": a.description,
                "sequence": a.sequence,
                "required_for_cd": a.required_for_cd,
                "required_for_solution": a.required_for_solution,
                "is_active": a.is_active,
            }
            for a in db.query(IpsafeActivity).order_by(IpsafeActivity.sequence).all()
        ],
    }


def upsert_value_stream(db: Session, payload: dict[str, Any], stream_id: int | None = None):
    if stream_id:
        vs = db.query(RiskValueStream).filter_by(id=stream_id).first()
        if not vs:
            raise HTTPException(status_code=404, detail="Value stream not found")
    else:
        vs = RiskValueStream(
            name=payload["name"],
            code=payload["code"],
        )
        db.add(vs)
    vs.name = payload.get("name", vs.name)
    vs.code = payload.get("code", vs.code)
    vs.description = payload.get("description", vs.description)
    if "is_active" in payload:
        vs.is_active = bool(payload["is_active"])
    if "lead_user_id" in payload:
        vs.lead_user_id = payload.get("lead_user_id")
    db.commit()
    db.refresh(vs)
    return {
        "id": vs.id,
        "name": vs.name,
        "code": vs.code,
        "description": vs.description,
        "is_active": vs.is_active,
        "lead_user_id": vs.lead_user_id,
    }


def upsert_solution_team(db: Session, payload: dict[str, Any], team_id: int | None = None):
    if team_id:
        team = db.query(SolutionTeam).filter_by(id=team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Solution team not found")
    else:
        team = SolutionTeam(name=payload["name"], capacity=payload.get("capacity", 8))
        db.add(team)
    team.name = payload.get("name", team.name)
    if "capacity" in payload and payload["capacity"] is not None:
        team.capacity = int(payload["capacity"])
    if "is_active" in payload:
        team.is_active = bool(payload["is_active"])
    if "lead_user_id" in payload:
        team.lead_user_id = payload.get("lead_user_id")
    db.commit()
    db.refresh(team)
    return {
        "id": team.id,
        "name": team.name,
        "capacity": team.capacity,
        "is_active": team.is_active,
        "lead_user_id": team.lead_user_id,
    }


def upsert_user(db: Session, payload: dict[str, Any], user_id: int | None = None):
    if user_id:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    else:
        user = User(
            name=payload["name"],
            email=payload["email"],
            role=payload.get("role", "Value Stream Lead"),
        )
        db.add(user)
    user.name = payload.get("name", user.name)
    user.email = payload.get("email", user.email)
    user.role = payload.get("role", user.role)
    if "value_stream_id" in payload:
        user.value_stream_id = payload.get("value_stream_id")
    if "solution_team_id" in payload:
        user.solution_team_id = payload.get("solution_team_id")
    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "value_stream_id": user.value_stream_id,
        "solution_team_id": user.solution_team_id,
        "is_active": user.is_active,
    }


def upsert_stage(db: Session, payload: dict[str, Any], stage_id: int | None = None):
    if stage_id:
        stage = db.query(WorkflowStage).filter_by(id=stage_id).first()
        if not stage:
            raise HTTPException(status_code=404, detail="Stage not found")
    else:
        stage = WorkflowStage(
            name=payload["name"],
            code=payload["code"],
            sequence=payload.get("sequence", 99),
        )
        db.add(stage)
    stage.name = payload.get("name", stage.name)
    stage.code = payload.get("code", stage.code)
    if "sequence" in payload and payload["sequence"] is not None:
        stage.sequence = int(payload["sequence"])
    if "is_active" in payload:
        stage.is_active = bool(payload["is_active"])
    db.commit()
    db.refresh(stage)
    return {
        "id": stage.id,
        "name": stage.name,
        "code": stage.code,
        "sequence": stage.sequence,
        "is_active": stage.is_active,
    }


def upsert_ipsafe_activity(db: Session, payload: dict[str, Any], activity_id: int | None = None):
    if activity_id:
        activity = db.query(IpsafeActivity).filter_by(id=activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="IPSAFE activity not found")
    else:
        activity = IpsafeActivity(
            code=payload["code"],
            name=payload["name"],
            sequence=payload.get("sequence", 99),
        )
        db.add(activity)
    activity.code = payload.get("code", activity.code)
    activity.name = payload.get("name", activity.name)
    activity.description = payload.get("description", activity.description)
    if "sequence" in payload and payload["sequence"] is not None:
        activity.sequence = int(payload["sequence"])
    if "required_for_cd" in payload:
        activity.required_for_cd = bool(payload["required_for_cd"])
    if "required_for_solution" in payload:
        activity.required_for_solution = bool(payload["required_for_solution"])
    if "is_active" in payload:
        activity.is_active = bool(payload["is_active"])
    db.commit()
    db.refresh(activity)
    return {
        "id": activity.id,
        "code": activity.code,
        "name": activity.name,
        "description": activity.description,
        "sequence": activity.sequence,
        "required_for_cd": activity.required_for_cd,
        "required_for_solution": activity.required_for_solution,
        "is_active": activity.is_active,
    }
