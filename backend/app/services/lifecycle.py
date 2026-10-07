from datetime import date
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.lifecycle_schemas import (
    ConvertSolutionRequest,
    DesignApproveRequest,
    DesignPackageRequest,
    IpsafeUpdateRequest,
    PromoteRequest,
    ShowTellRequest,
    StageAdvanceRequest,
)
from app.models.entities import ActivityLog, Initiative, Notification
from app.models.lifecycle import (
    DesignPackage,
    InitiativeIpsafeStatus,
    IpsafeActivity,
    ShowTellFeedback,
)
from app.services.dashboard import _serialize_initiative, get_initiative
from app.services.seed import ensure_ipsafe_activities

DESIGN_STAGES = {"design", "ready_to_build"}
BUILD_STAGES = {
    "ready_to_build",
    "build_in_progress",
    "show_and_tell",
    "feedback",
    "prototype_ready",
}
IPSAFE_STAGES = {
    "prototype_ready",
    "ipsafe_cd",
    "cd_approved",
    "solution_candidate",
    "deployable_solution",
    "completed",
}

BUILD_FLOW = [
    "ready_to_build",
    "build_in_progress",
    "show_and_tell",
    "feedback",
    "prototype_ready",
]


def _get_initiative(db: Session, idea_id: str) -> Initiative:
    init = (
        db.query(Initiative)
        .options(
            joinedload(Initiative.value_stream),
            joinedload(Initiative.owner),
            joinedload(Initiative.solution_team),
            joinedload(Initiative.documents),
        )
        .filter(Initiative.idea_id == idea_id)
        .first()
    )
    if not init:
        raise HTTPException(status_code=404, detail="Initiative not found")
    return init


def _serialize_design(pkg: DesignPackage | None) -> dict[str, Any] | None:
    if not pkg:
        return None
    return {
        "initiative_id": pkg.initiative_id,
        "solution_architecture": pkg.solution_architecture,
        "functional_design": pkg.functional_design,
        "technical_design": pkg.technical_design,
        "data_architecture": pkg.data_architecture,
        "upstream_systems": pkg.upstream_systems,
        "downstream_systems": pkg.downstream_systems,
        "api_integration": pkg.api_integration,
        "synthetic_data": pkg.synthetic_data,
        "models": pkg.models,
        "methodologies": pkg.methodologies,
        "security_considerations": pkg.security_considerations,
        "deployment_considerations": pkg.deployment_considerations,
        "dependencies": pkg.dependencies,
        "design_approved": pkg.design_approved,
        "approved_by": pkg.approved_by,
        "approved_at": pkg.approved_at.isoformat() if pkg.approved_at else None,
    }


def list_by_stages(db: Session, stage_codes: set[str] | list[str]) -> list[dict[str, Any]]:
    rows = (
        db.query(Initiative)
        .options(
            joinedload(Initiative.value_stream),
            joinedload(Initiative.owner),
            joinedload(Initiative.solution_team),
        )
        .filter(Initiative.stage_code.in_(list(stage_codes)))
        .order_by(Initiative.idea_id)
        .all()
    )
    items = []
    for init in rows:
        payload = _serialize_initiative(init)
        payload["stage_name"] = init.stage_code
        items.append(payload)
    return items


def get_or_create_design(db: Session, idea_id: str) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    pkg = db.query(DesignPackage).filter_by(initiative_id=init.id).first()
    if not pkg:
        pkg = DesignPackage(initiative_id=init.id)
        db.add(pkg)
        db.commit()
        db.refresh(pkg)
    detail = get_initiative(db, idea_id)
    detail["design"] = _serialize_design(pkg)
    return detail


def save_design(db: Session, idea_id: str, payload: DesignPackageRequest) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    pkg = db.query(DesignPackage).filter_by(initiative_id=init.id).first()
    if not pkg:
        pkg = DesignPackage(initiative_id=init.id)
        db.add(pkg)

    for field in (
        "solution_architecture",
        "functional_design",
        "technical_design",
        "data_architecture",
        "upstream_systems",
        "downstream_systems",
        "api_integration",
        "synthetic_data",
        "models",
        "methodologies",
        "security_considerations",
        "deployment_considerations",
        "dependencies",
    ):
        value = getattr(payload, field)
        if value is not None:
            setattr(pkg, field, value)

    if init.stage_code not in {"design", "ready_to_build", "build_in_progress"}:
        init.stage_code = "design"

    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.actor,
            action="Updated design package",
            detail="Design sections saved",
        )
    )
    db.commit()
    return get_or_create_design(db, idea_id)


def approve_design(db: Session, idea_id: str, payload: DesignApproveRequest) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    pkg = db.query(DesignPackage).filter_by(initiative_id=init.id).first()
    if not pkg:
        raise HTTPException(status_code=400, detail="Save design package before approval")

    pkg.design_approved = True
    pkg.approved_by = payload.actor
    pkg.approved_at = date.today()
    init.stage_code = "ready_to_build"
    init.attention_level = "Green"
    init.attention_reason = None
    init.readiness_pct = max(init.readiness_pct, 90)

    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.actor,
            action="Design approved — Ready to Build",
            detail=payload.comment,
        )
    )
    db.commit()
    return get_or_create_design(db, idea_id)


def advance_stage(db: Session, idea_id: str, payload: StageAdvanceRequest) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    target = payload.target_stage
    allowed = set(BUILD_FLOW) | IPSAFE_STAGES | {"completed", "design"}
    if target not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported target stage: {target}")

    previous = init.stage_code
    init.stage_code = target
    if target == "build_in_progress":
        init.attention_level = "Green"
        init.attention_reason = None
    if target == "completed":
        init.status = "Completed"

    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.actor,
            action=f"Stage changed: {previous} → {target}",
            detail=payload.comment,
        )
    )
    db.commit()
    return get_initiative(db, idea_id)


def add_show_tell(db: Session, idea_id: str, payload: ShowTellRequest) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    entry = ShowTellFeedback(
        initiative_id=init.id,
        session_date=payload.session_date or date.today(),
        facilitator=payload.facilitator,
        audience=payload.audience,
        summary=payload.summary,
        feedback=payload.feedback,
        decision=payload.decision,
    )
    db.add(entry)
    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.facilitator,
            action="Show & Tell feedback recorded",
            detail=f"{payload.decision}: {payload.summary[:120]}",
        )
    )

    if payload.advance:
        if payload.decision.lower().startswith("refine"):
            init.stage_code = "feedback"
        else:
            init.stage_code = "prototype_ready"
            if init.initiative_type == "MVP":
                # MVPs move toward IPSAFE CD path after prototype ready
                pass

    db.commit()
    return get_show_tell(db, idea_id)


def get_show_tell(db: Session, idea_id: str) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    rows = (
        db.query(ShowTellFeedback)
        .filter_by(initiative_id=init.id)
        .order_by(ShowTellFeedback.id.desc())
        .all()
    )
    detail = get_initiative(db, idea_id)
    detail["show_tell"] = [
        {
            "id": r.id,
            "session_date": r.session_date.isoformat() if r.session_date else None,
            "facilitator": r.facilitator,
            "audience": r.audience,
            "summary": r.summary,
            "feedback": r.feedback,
            "decision": r.decision,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
    return detail


def promote_to_mvp(db: Session, idea_id: str, payload: PromoteRequest) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    if init.initiative_type == "MVP":
        raise HTTPException(status_code=400, detail="Initiative is already an MVP")
    old = init.initiative_type
    init.initiative_type = "MVP"
    if init.stage_code in {"prototype_ready", "completed"}:
        init.stage_code = "ipsafe_cd"
        init.status = "Active"
        _ensure_ipsafe_rows(db, init)
    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.actor,
            action="Promoted to MVP",
            detail=payload.comment or f"{old} → MVP",
        )
    )
    db.commit()
    return get_ipsafe(db, idea_id)


def _ensure_ipsafe_rows(db: Session, init: Initiative) -> None:
    ensure_ipsafe_activities(db)
    activities = (
        db.query(IpsafeActivity)
        .filter(IpsafeActivity.is_active.is_(True))
        .order_by(IpsafeActivity.sequence)
        .all()
    )
    existing = {
        row.activity_id
        for row in db.query(InitiativeIpsafeStatus).filter_by(initiative_id=init.id).all()
    }
    for activity in activities:
        if activity.id not in existing:
            db.add(
                InitiativeIpsafeStatus(
                    initiative_id=init.id,
                    activity_id=activity.id,
                    status="Not Started",
                )
            )
    db.flush()


def _calc_ipsafe_pct(db: Session, init: Initiative) -> dict[str, Any]:
    _ensure_ipsafe_rows(db, init)
    rows = (
        db.query(InitiativeIpsafeStatus, IpsafeActivity)
        .join(IpsafeActivity, IpsafeActivity.id == InitiativeIpsafeStatus.activity_id)
        .filter(InitiativeIpsafeStatus.initiative_id == init.id)
        .order_by(IpsafeActivity.sequence)
        .all()
    )

    def pct(predicate) -> float:
        subset = [(status, act) for status, act in rows if predicate(act)]
        if not subset:
            return 0.0
        done = sum(1 for status, _ in subset if status.status == "Complete")
        return round(100 * done / len(subset))

    cd_pct = pct(lambda a: a.required_for_cd)
    sol_pct = pct(lambda a: a.required_for_solution)
    return {
        "cd_pct": cd_pct,
        "solution_pct": sol_pct,
        "items": [
            {
                "activity_id": act.id,
                "code": act.code,
                "name": act.name,
                "description": act.description,
                "required_for_cd": act.required_for_cd,
                "required_for_solution": act.required_for_solution,
                "status": status.status,
                "notes": status.notes,
            }
            for status, act in rows
        ],
    }


def get_ipsafe(db: Session, idea_id: str) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    progress = _calc_ipsafe_pct(db, init)
    init.ipsafe_pct = progress["cd_pct"] if init.stage_code in {"ipsafe_cd", "prototype_ready"} else progress["solution_pct"]
    db.commit()
    detail = get_initiative(db, idea_id)
    detail["ipsafe"] = progress
    return detail


def update_ipsafe(db: Session, idea_id: str, payload: IpsafeUpdateRequest) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    _ensure_ipsafe_rows(db, init)

    for item in payload.updates:
        status_row = None
        if item.get("activity_id"):
            status_row = (
                db.query(InitiativeIpsafeStatus)
                .filter_by(initiative_id=init.id, activity_id=item["activity_id"])
                .first()
            )
        elif item.get("code"):
            activity = db.query(IpsafeActivity).filter_by(code=item["code"]).first()
            if activity:
                status_row = (
                    db.query(InitiativeIpsafeStatus)
                    .filter_by(initiative_id=init.id, activity_id=activity.id)
                    .first()
                )
        if not status_row:
            continue
        if item.get("status"):
            status_row.status = item["status"]
        if "notes" in item:
            status_row.notes = item.get("notes")
        status_row.updated_by = payload.actor

    progress = _calc_ipsafe_pct(db, init)
    init.ipsafe_pct = progress["cd_pct"]

    # Auto stage progression for MVP path
    if init.initiative_type == "MVP":
        if progress["cd_pct"] >= 50 and init.stage_code in {"prototype_ready", "ipsafe_cd"}:
            if progress["cd_pct"] >= 100:
                init.stage_code = "cd_approved"
            else:
                init.stage_code = "ipsafe_cd"
        if progress["solution_pct"] >= 100:
            init.stage_code = "deployable_solution"
        elif progress["cd_pct"] >= 100 and init.stage_code == "cd_approved":
            pass

    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.actor,
            action="Updated IPSAFE progress",
            detail=f"CD {progress['cd_pct']}% / Solution {progress['solution_pct']}%",
        )
    )
    db.commit()
    return get_ipsafe(db, idea_id)


def convert_to_solution(db: Session, idea_id: str, payload: ConvertSolutionRequest) -> dict[str, Any]:
    init = _get_initiative(db, idea_id)
    if init.stage_code not in {"cd_approved", "solution_candidate", "ipsafe_cd"}:
        # Allow conversion once CD path is substantially complete
        progress = _calc_ipsafe_pct(db, init)
        if progress["cd_pct"] < 50:
            raise HTTPException(
                status_code=400,
                detail="Capability Demonstrator IPSAFE progress must be at least 50% before conversion",
            )

    init.stage_code = "solution_candidate"
    init.initiative_type = "MVP"
    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.actor,
            action="Converted to Solution Candidate",
            detail=payload.comment,
        )
    )
    db.add(
        Notification(
            recipient="Vijay",
            message=f"{idea_id} converted to Solution Candidate — remaining IPSAFE activities required.",
        )
    )
    db.commit()
    return get_ipsafe(db, idea_id)


def list_ready_to_build(db: Session) -> dict[str, Any]:
    items = list_by_stages(db, {"ready_to_build"})
    return {"items": items, "count": len(items)}


def list_build(db: Session) -> dict[str, Any]:
    items = list_by_stages(db, {"build_in_progress", "show_and_tell", "feedback"})
    return {"items": items, "count": len(items)}


def list_show_tell_queue(db: Session) -> dict[str, Any]:
    items = list_by_stages(db, {"show_and_tell", "feedback", "prototype_ready"})
    return {"items": items, "count": len(items)}


def list_design_queue(db: Session) -> dict[str, Any]:
    items = list_by_stages(db, {"design", "ready_to_build"})
    return {"items": items, "count": len(items)}


def list_ipsafe_queue(db: Session) -> dict[str, Any]:
    items = list_by_stages(
        db, {"prototype_ready", "ipsafe_cd", "cd_approved", "solution_candidate", "deployable_solution"}
    )
    enriched = []
    for item in items:
        init = db.query(Initiative).filter_by(idea_id=item["idea_id"]).one()
        progress = _calc_ipsafe_pct(db, init)
        item["ipsafe"] = {"cd_pct": progress["cd_pct"], "solution_pct": progress["solution_pct"]}
        enriched.append(item)
    db.commit()
    return {"items": enriched, "count": len(enriched)}
