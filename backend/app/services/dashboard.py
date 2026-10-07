from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.entities import Initiative, RiskValueStream, SolutionTeam, User, WorkflowStage

FUNNEL_STAGES = [
    ("idea_submitted", "Submitted"),
    ("management_review", "Management Approved"),
    ("solution_review", "Solution Accepted"),
    ("design", "Design Approved"),
    ("ready_to_build", "Ready to Build"),
    ("build_in_progress", "Building"),
    ("prototype_ready", "Prototype Ready"),
    ("ipsafe_cd", "Capability Demonstrator"),
    ("deployable_solution", "Solution"),
]

ACTIVE_STAGES = {
    "idea_submitted",
    "management_review",
    "requirements",
    "solution_review",
    "design",
    "ready_to_build",
    "build_in_progress",
    "show_and_tell",
    "feedback",
    "prototype_ready",
    "ipsafe_cd",
    "cd_approved",
    "solution_candidate",
}


def _serialize_initiative(init: Initiative) -> dict[str, Any]:
    return {
        "id": init.id,
        "idea_id": init.idea_id,
        "title": init.title,
        "value_stream": init.value_stream.name if init.value_stream else None,
        "value_stream_id": init.value_stream_id,
        "owner": init.owner.name if init.owner else None,
        "initiative_type": init.initiative_type,
        "solution_team": init.solution_team.name if init.solution_team else None,
        "solution_team_id": init.solution_team_id,
        "stage_code": init.stage_code,
        "stage_name": None,
        "status": init.status,
        "priority": init.priority,
        "readiness_pct": init.readiness_pct,
        "ipsafe_pct": init.ipsafe_pct,
        "raghu_approval": init.raghu_approval,
        "vijay_approval": init.vijay_approval,
        "solution_approval": init.solution_approval,
        "age_days": init.age_days,
        "attention_level": init.attention_level,
        "attention_reason": init.attention_reason,
        "submitted_at": init.submitted_at.isoformat() if init.submitted_at else None,
        "last_updated": init.last_updated.isoformat() if init.last_updated else None,
        "business_problem": init.business_problem,
        "proposed_concept": init.proposed_concept,
        "business_value": init.business_value,
        "target_users": init.target_users,
        "expected_outcome": init.expected_outcome,
    }


def get_dashboard(db: Session, user_id: int | None = None) -> dict[str, Any]:
    from app.services.roles import apply_role_filters, get_user_or_404

    user = get_user_or_404(db, user_id) if user_id else None
    query = db.query(Initiative).options(
        joinedload(Initiative.value_stream),
        joinedload(Initiative.owner),
        joinedload(Initiative.solution_team),
    )
    query = apply_role_filters(query, user)
    initiatives = query.all()
    stages = {s.code: s.name for s in db.query(WorkflowStage).all()}

    total = len(initiatives)
    active = sum(1 for i in initiatives if i.status == "Active")
    awaiting_mgmt = sum(1 for i in initiatives if i.stage_code == "management_review")
    awaiting_solution = sum(1 for i in initiatives if i.stage_code == "solution_review")
    ready_to_build = sum(1 for i in initiatives if i.stage_code == "ready_to_build")
    building = sum(1 for i in initiatives if i.stage_code == "build_in_progress")
    rapid = sum(1 for i in initiatives if i.initiative_type == "Rapid Prototype")
    mvps = sum(1 for i in initiatives if i.initiative_type == "MVP")
    cds = sum(
        1
        for i in initiatives
        if i.stage_code in {"ipsafe_cd", "cd_approved", "solution_candidate"}
    )
    solutions = sum(1 for i in initiatives if i.stage_code == "deployable_solution")
    completed = sum(
        1 for i in initiatives if i.status == "Completed" or i.stage_code == "completed"
    )
    blocked = sum(
        1
        for i in initiatives
        if i.attention_level in {"Amber", "Red"} or i.status == "Blocked"
    )

    vs_stats: dict[int, dict[str, Any]] = {}
    for vs in db.query(RiskValueStream).filter_by(is_active=True).all():
        vs_stats[vs.id] = {
            "id": vs.id,
            "name": vs.name,
            "ideas": 0,
            "active": 0,
            "ready_to_build": 0,
            "building": 0,
            "completed": 0,
            "solutions": 0,
        }

    for init in initiatives:
        bucket = vs_stats.get(init.value_stream_id)
        if not bucket:
            continue
        bucket["ideas"] += 1
        if init.status == "Active":
            bucket["active"] += 1
        if init.stage_code == "ready_to_build":
            bucket["ready_to_build"] += 1
        if init.stage_code == "build_in_progress":
            bucket["building"] += 1
        if init.status == "Completed" or init.stage_code == "completed":
            bucket["completed"] += 1
        if init.stage_code == "deployable_solution":
            bucket["solutions"] += 1

    leaderboard = sorted(vs_stats.values(), key=lambda x: x["ideas"], reverse=True)

    funnel = []
    for code, label in FUNNEL_STAGES:
        count = sum(1 for i in initiatives if i.stage_code == code)
        funnel.append({"stage_code": code, "label": label, "count": count})

    attention = [
        {
            "idea_id": i.idea_id,
            "title": i.title,
            "value_stream": i.value_stream.name if i.value_stream else None,
            "attention_level": i.attention_level,
            "reason": i.attention_reason,
            "age_days": i.age_days,
        }
        for i in initiatives
        if i.attention_level in {"Amber", "Red"} and i.attention_reason
    ]
    attention.sort(key=lambda x: 0 if x["attention_level"] == "Red" else 1)

    insights = [
        f"{leaderboard[0]['name']} has the largest idea volume with {leaderboard[0]['ideas']} initiatives."
        if leaderboard
        else "No value stream data available.",
        f"{awaiting_mgmt} initiatives are currently awaiting management approval.",
        f"{sum(1 for i in initiatives if i.readiness_pct < 60 and i.priority == 'High')} high-priority initiatives have readiness below 60%.",
        f"{building} initiatives are currently in build.",
        f"{cds} initiatives are progressing through Capability Demonstrator / IPSAFE stages.",
        f"{blocked} initiatives require attention due to aging, blockers, or missing information.",
    ]

    return {
        "kpis": {
            "total_ideas": total,
            "active_initiatives": active,
            "awaiting_management_approval": awaiting_mgmt,
            "awaiting_solution_review": awaiting_solution,
            "ready_to_build": ready_to_build,
            "build_in_progress": building,
            "rapid_prototypes": rapid,
            "mvps": mvps,
            "capability_demonstrators": cds,
            "solutions": solutions,
            "completed": completed,
            "blocked_attention_required": blocked,
        },
        "leaderboard": leaderboard,
        "funnel": funnel,
        "attention_required": attention,
        "ai_insights": insights,
        "stages": stages,
        "persona": (
            {
                "id": user.id,
                "name": user.name,
                "role": user.role,
                "scope": "all"
                if user.role == "Administrator"
                else "solution_team"
                if user.role == "Solution Lead"
                else "value_stream",
            }
            if user
            else None
        ),
    }


def list_initiatives(
    db: Session,
    value_stream_id: int | None = None,
    solution_team_id: int | None = None,
    initiative_type: str | None = None,
    stage_code: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    user_id: int | None = None,
) -> list[dict[str, Any]]:
    from app.services.roles import apply_role_filters, get_user_or_404

    query = db.query(Initiative).options(
        joinedload(Initiative.value_stream),
        joinedload(Initiative.owner),
        joinedload(Initiative.solution_team),
    )
    user = get_user_or_404(db, user_id) if user_id else None
    query = apply_role_filters(query, user)
    if value_stream_id:
        query = query.filter(Initiative.value_stream_id == value_stream_id)
    if solution_team_id:
        query = query.filter(Initiative.solution_team_id == solution_team_id)
    if initiative_type:
        query = query.filter(Initiative.initiative_type == initiative_type)
    if stage_code:
        query = query.filter(Initiative.stage_code == stage_code)
    if status:
        query = query.filter(Initiative.status == status)
    if priority:
        query = query.filter(Initiative.priority == priority)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Initiative.title.ilike(like)) | (Initiative.idea_id.ilike(like))
        )

    stages = {s.code: s.name for s in db.query(WorkflowStage).all()}
    items = []
    for init in query.order_by(Initiative.idea_id).all():
        payload = _serialize_initiative(init)
        payload["stage_name"] = stages.get(init.stage_code, init.stage_code)
        items.append(payload)
    return items


def get_initiative(db: Session, idea_id: str) -> dict[str, Any] | None:
    init = (
        db.query(Initiative)
        .options(
            joinedload(Initiative.value_stream),
            joinedload(Initiative.owner),
            joinedload(Initiative.solution_team),
            joinedload(Initiative.documents),
            joinedload(Initiative.activities),
        )
        .filter(Initiative.idea_id == idea_id)
        .first()
    )
    if not init:
        return None
    stages = {s.code: s.name for s in db.query(WorkflowStage).all()}
    payload = _serialize_initiative(init)
    payload["stage_name"] = stages.get(init.stage_code, init.stage_code)
    payload["documents"] = [
        {
            "id": d.id,
            "filename": d.filename,
            "document_type": d.document_type,
            "uploaded_by": d.uploaded_by,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "version": d.version,
        }
        for d in init.documents
    ]
    payload["activities"] = [
        {
            "id": a.id,
            "actor": a.actor,
            "action": a.action,
            "detail": a.detail,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in sorted(init.activities, key=lambda x: x.id)
    ]
    from app.services.workflow import build_readiness_checklist
    from app.services.reports import build_approval_timeline
    from app.models.ai import AiAnalysis
    from app.services.ai_service import serialize_ai_analysis

    payload["readiness"] = build_readiness_checklist(init)
    payload["approval_timeline"] = build_approval_timeline(init)
    analysis = db.query(AiAnalysis).filter_by(initiative_id=init.id).first()
    payload["ai_analysis"] = serialize_ai_analysis(analysis)
    return payload


def get_reference_data(db: Session) -> dict[str, Any]:
    return {
        "value_streams": [
            {"id": vs.id, "name": vs.name, "code": vs.code, "is_active": vs.is_active}
            for vs in db.query(RiskValueStream).order_by(RiskValueStream.name).all()
        ],
        "solution_teams": [
            {"id": t.id, "name": t.name, "capacity": t.capacity, "is_active": t.is_active}
            for t in db.query(SolutionTeam).order_by(SolutionTeam.name).all()
        ],
        "stages": [
            {"id": s.id, "name": s.name, "code": s.code, "sequence": s.sequence}
            for s in db.query(WorkflowStage).order_by(WorkflowStage.sequence).all()
        ],
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "value_stream_id": u.value_stream_id,
                "solution_team_id": u.solution_team_id,
            }
            for u in db.query(User).filter(User.is_active.is_(True)).order_by(User.name).all()
        ],
    }
