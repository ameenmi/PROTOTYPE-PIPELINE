from datetime import date
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.schemas import (
    CreateIdeaRequest,
    ManagementApprovalRequest,
    SolutionReadinessRequest,
)
from app.models.entities import ActivityLog, Document, Initiative, Notification, User
from app.services.dashboard import get_initiative

VALID_MGMT_ACTIONS = {
    "Approve",
    "Reject",
    "Request Clarification",
    "Send Back",
}
VALID_SOLUTION_ACTIONS = {
    "Accept",
    "Request More Information",
    "Return to Value Stream",
}


def _next_idea_id(db: Session) -> str:
    year = date.today().year
    prefix = f"IDEA-{year}-"
    latest = (
        db.query(Initiative.idea_id)
        .filter(Initiative.idea_id.like(f"{prefix}%"))
        .order_by(Initiative.idea_id.desc())
        .first()
    )
    if not latest:
        return f"{prefix}001"
    try:
        num = int(latest[0].split("-")[-1]) + 1
    except ValueError:
        num = db.query(func.count(Initiative.id)).scalar() + 1
    return f"{prefix}{num:03d}"


def build_readiness_checklist(init: Initiative) -> dict[str, Any]:
    docs = init.documents or []
    has_arch = any(
        "arch" in (d.filename or "").lower() or d.document_type.lower() in {"architecture", "design"}
        for d in docs
    )
    has_data = any(
        "data" in (d.filename or "").lower() or "data" in (d.document_type or "").lower()
        for d in docs
    )
    has_reqs = any(
        "req" in (d.filename or "").lower() or d.document_type.lower() in {"word", "requirements"}
        for d in docs
    )

    items = [
        {
            "key": "business_problem",
            "label": "Business problem defined",
            "status": "pass" if init.business_problem else "fail",
        },
        {
            "key": "business_outcome",
            "label": "Business outcome defined",
            "status": "pass" if (init.expected_outcome or init.business_value) else "fail",
        },
        {
            "key": "functional_requirements",
            "label": "Functional requirements",
            "status": "pass" if has_reqs or (init.proposed_concept and len(init.proposed_concept) > 40) else "partial",
        },
        {
            "key": "user_stories",
            "label": "User stories",
            "status": "pass" if init.target_users else "partial",
        },
        {
            "key": "data_requirements",
            "label": "Data requirements",
            "status": "pass" if has_data else "partial",
        },
        {
            "key": "synthetic_data",
            "label": "Synthetic/manufactured data requirement",
            "status": "partial",
        },
        {
            "key": "methodology",
            "label": "Model/methodology identified",
            "status": "pass" if init.proposed_concept else "fail",
        },
        {
            "key": "architecture",
            "label": "Architecture/design",
            "status": "pass" if has_arch else "fail",
        },
        {
            "key": "upstream",
            "label": "Upstream dependencies",
            "status": "partial",
        },
        {
            "key": "downstream",
            "label": "Downstream dependencies",
            "status": "pass" if init.target_users else "partial",
        },
    ]

    score_map = {"pass": 1.0, "partial": 0.5, "fail": 0.0}
    score = round(100 * sum(score_map[i["status"]] for i in items) / len(items))
    return {"score": score, "items": items}


def create_idea(db: Session, payload: CreateIdeaRequest) -> dict[str, Any]:
    owner = db.query(User).filter(User.id == payload.owner_id).first()
    if not owner:
        raise HTTPException(status_code=400, detail="Owner not found")

    idea_id = _next_idea_id(db)
    init = Initiative(
        idea_id=idea_id,
        title=payload.title.strip(),
        value_stream_id=payload.value_stream_id,
        owner_id=payload.owner_id,
        initiative_type=payload.initiative_type,
        stage_code="management_review",
        status="Active",
        priority=payload.priority,
        business_problem=payload.business_problem,
        proposed_concept=payload.proposed_concept,
        business_value=payload.business_value,
        target_users=payload.target_users,
        expected_outcome=payload.expected_outcome,
        readiness_pct=35,
        ipsafe_pct=0,
        raghu_approval="Pending",
        vijay_approval="Pending",
        solution_approval="Not Started",
        age_days=0,
        attention_level="Green",
        attention_reason=None,
        submitted_at=date.today(),
    )
    db.add(init)
    db.flush()

    for doc in payload.documents:
        db.add(
            Document(
                initiative_id=init.id,
                filename=doc.filename,
                document_type=doc.document_type,
                uploaded_by=doc.uploaded_by or owner.name,
                uploaded_at=date.today(),
                version=doc.version or "1.0",
            )
        )

    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=owner.name,
            action="Submitted idea",
            detail=f"{idea_id} entered Management Review",
        )
    )
    db.add(
        Notification(
            recipient="Vijay",
            message=f"New initiative {idea_id} requires management review.",
        )
    )
    db.add(
        Notification(
            recipient="Raghu",
            message=f"New initiative {idea_id} requires management review.",
        )
    )
    db.commit()
    # Auto-run document intelligence after submission
    try:
        from app.services import ai_service

        return ai_service.analyze_initiative_documents(db, idea_id)
    except Exception:
        return get_initiative(db, idea_id)


def apply_management_approval(
    db: Session, idea_id: str, payload: ManagementApprovalRequest
) -> dict[str, Any]:
    if payload.approver not in {"Raghu", "Vijay"}:
        raise HTTPException(status_code=400, detail="Approver must be Raghu or Vijay")
    if payload.action not in VALID_MGMT_ACTIONS:
        raise HTTPException(status_code=400, detail="Invalid management action")

    init = (
        db.query(Initiative)
        .options(
            joinedload(Initiative.documents),
            joinedload(Initiative.owner),
        )
        .filter(Initiative.idea_id == idea_id)
        .first()
    )
    if not init:
        raise HTTPException(status_code=404, detail="Initiative not found")

    if payload.initiative_type in {"Rapid Prototype", "MVP"}:
        old_type = init.initiative_type
        if payload.initiative_type != old_type:
            init.initiative_type = payload.initiative_type
            db.add(
                ActivityLog(
                    initiative_id=init.id,
                    actor=payload.approver,
                    action="Classification changed",
                    detail=f"{old_type} → {payload.initiative_type}",
                )
            )

    status_value = {
        "Approve": "Approved",
        "Reject": "Rejected",
        "Request Clarification": "Clarification",
        "Send Back": "Sent Back",
    }[payload.action]

    if payload.approver == "Raghu":
        init.raghu_approval = status_value
    else:
        init.vijay_approval = status_value

    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.approver,
            action=f"Management review: {payload.action}",
            detail=payload.comment,
        )
    )

    if payload.action == "Reject":
        init.status = "Rejected"
        init.stage_code = "idea_submitted"
        init.attention_level = "Red"
        init.attention_reason = f"Rejected by {payload.approver}"
    elif payload.action in {"Request Clarification", "Send Back"}:
        init.stage_code = "idea_submitted"
        init.attention_level = "Amber"
        init.attention_reason = f"{payload.action} by {payload.approver}"
        db.add(
            Notification(
                recipient=init.owner.name if init.owner else "Value Stream Lead",
                message=f"{idea_id}: {payload.action} — please update and resubmit.",
            )
        )
    elif init.raghu_approval == "Approved" and init.vijay_approval == "Approved":
        init.stage_code = "solution_review"
        init.solution_approval = "Pending"
        init.attention_level = "Green"
        init.attention_reason = None
        checklist = build_readiness_checklist(init)
        init.readiness_pct = checklist["score"]
        db.add(
            ActivityLog(
                initiative_id=init.id,
                actor="System",
                action="Advanced to Solution Review",
                detail="Both management approvals received",
            )
        )

    db.commit()
    result = get_initiative(db, idea_id)
    result["readiness"] = build_readiness_checklist(
        db.query(Initiative)
        .options(joinedload(Initiative.documents))
        .filter(Initiative.idea_id == idea_id)
        .one()
    )
    return result


def apply_solution_readiness(
    db: Session, idea_id: str, payload: SolutionReadinessRequest
) -> dict[str, Any]:
    if payload.action not in VALID_SOLUTION_ACTIONS:
        raise HTTPException(status_code=400, detail="Invalid solution action")

    init = (
        db.query(Initiative)
        .options(joinedload(Initiative.documents), joinedload(Initiative.owner))
        .filter(Initiative.idea_id == idea_id)
        .first()
    )
    if not init:
        raise HTTPException(status_code=404, detail="Initiative not found")

    checklist = build_readiness_checklist(init)
    if payload.checklist:
        # Allow UI overrides: pass|partial|fail keyed by checklist key
        by_key = {i["key"]: i for i in checklist["items"]}
        for key, status in payload.checklist.items():
            if key in by_key and status in {"pass", "partial", "fail"}:
                by_key[key]["status"] = status
        score_map = {"pass": 1.0, "partial": 0.5, "fail": 0.0}
        checklist["score"] = round(
            100 * sum(score_map[i["status"]] for i in checklist["items"]) / len(checklist["items"])
        )
    init.readiness_pct = checklist["score"]

    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.actor,
            action=f"Solution readiness: {payload.action}",
            detail=payload.comment,
        )
    )

    if payload.action == "Accept":
        init.solution_approval = "Accepted"
        init.stage_code = "design"
        init.attention_level = "Green"
        init.attention_reason = None
        if payload.solution_team_id:
            init.solution_team_id = payload.solution_team_id
    elif payload.action == "Request More Information":
        init.solution_approval = "Request Info"
        init.attention_level = "Amber"
        init.attention_reason = "Additional information requested by Solution Lead"
        db.add(
            Notification(
                recipient=init.owner.name if init.owner else "Value Stream Lead",
                message=f"{idea_id}: Solution Lead requested more information.",
            )
        )
    else:  # Return to Value Stream
        init.solution_approval = "Returned"
        init.stage_code = "requirements"
        init.attention_level = "Amber"
        init.attention_reason = "Returned to Value Stream for clarification"
        db.add(
            Notification(
                recipient=init.owner.name if init.owner else "Value Stream Lead",
                message=f"{idea_id}: Returned to Value Stream from Solution Review.",
            )
        )

    db.commit()
    result = get_initiative(db, idea_id)
    result["readiness"] = checklist
    return result


def list_pending_approvals(db: Session) -> dict[str, Any]:
    rows = (
        db.query(Initiative)
        .options(
            joinedload(Initiative.value_stream),
            joinedload(Initiative.owner),
            joinedload(Initiative.solution_team),
        )
        .filter(Initiative.stage_code == "management_review")
        .order_by(Initiative.submitted_at.asc())
        .all()
    )
    from app.services.dashboard import _serialize_initiative

    items = []
    for init in rows:
        payload = _serialize_initiative(init)
        payload["stage_name"] = "Management Review"
        items.append(payload)
    return {"items": items, "count": len(items)}


def list_solution_review_queue(db: Session) -> dict[str, Any]:
    rows = (
        db.query(Initiative)
        .options(
            joinedload(Initiative.value_stream),
            joinedload(Initiative.owner),
            joinedload(Initiative.solution_team),
            joinedload(Initiative.documents),
        )
        .filter(Initiative.stage_code == "solution_review")
        .order_by(Initiative.submitted_at.asc())
        .all()
    )
    from app.services.dashboard import _serialize_initiative

    items = []
    for init in rows:
        payload = _serialize_initiative(init)
        payload["stage_name"] = "Solution Review"
        payload["readiness"] = build_readiness_checklist(init)
        items.append(payload)
    return {"items": items, "count": len(items)}
