from collections import defaultdict
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.entities import Document, Initiative, Notification, RiskValueStream, SolutionTeam, WorkflowStage
from app.services.dashboard import _serialize_initiative


STAGE_LABELS = {
    "idea_submitted": "Idea Submitted",
    "management_review": "Management Review",
    "requirements": "Requirements",
    "solution_review": "Solution Review",
    "design": "Design",
    "ready_to_build": "Ready to Build",
    "build_in_progress": "Build in Progress",
    "show_and_tell": "Show & Tell",
    "feedback": "Feedback",
    "prototype_ready": "Prototype Ready",
    "ipsafe_cd": "IPSAFE CD",
    "cd_approved": "CD Approved",
    "solution_candidate": "Solution Candidate",
    "deployable_solution": "Deployable Solution",
    "completed": "Completed",
}


def get_analytics(db: Session) -> dict[str, Any]:
    initiatives = (
        db.query(Initiative)
        .options(
            joinedload(Initiative.value_stream),
            joinedload(Initiative.solution_team),
            joinedload(Initiative.owner),
        )
        .all()
    )
    stages = {s.code: s.name for s in db.query(WorkflowStage).all()}

    by_vs: dict[str, int] = defaultdict(int)
    by_stage: dict[str, int] = defaultdict(int)
    by_type: dict[str, int] = defaultdict(int)
    by_team: dict[str, int] = defaultdict(int)
    aging_buckets = {"0-7": 0, "8-14": 0, "15-30": 0, "31+": 0}
    conversion = {
        "idea_to_prototype": 0,
        "prototype_to_mvp": 0,
        "mvp_to_cd": 0,
        "cd_to_solution": 0,
        "total_ideas": len(initiatives),
        "prototypes": 0,
        "mvps": 0,
        "cds": 0,
        "solutions": 0,
    }

    age_sum_by_stage: dict[str, list[int]] = defaultdict(list)

    for init in initiatives:
        vs = init.value_stream.name if init.value_stream else "Unassigned"
        by_vs[vs] += 1
        by_stage[init.stage_code] += 1
        by_type[init.initiative_type] += 1
        team = init.solution_team.name if init.solution_team else "Unassigned"
        by_team[team] += 1
        age_sum_by_stage[init.stage_code].append(init.age_days or 0)

        age = init.age_days or 0
        if age <= 7:
            aging_buckets["0-7"] += 1
        elif age <= 14:
            aging_buckets["8-14"] += 1
        elif age <= 30:
            aging_buckets["15-30"] += 1
        else:
            aging_buckets["31+"] += 1

        if init.stage_code in {
            "prototype_ready",
            "ipsafe_cd",
            "cd_approved",
            "solution_candidate",
            "deployable_solution",
            "completed",
            "show_and_tell",
            "feedback",
            "build_in_progress",
        }:
            conversion["prototypes"] += 1
        if init.initiative_type == "MVP":
            conversion["mvps"] += 1
        if init.stage_code in {"ipsafe_cd", "cd_approved", "solution_candidate", "deployable_solution"}:
            conversion["cds"] += 1
        if init.stage_code == "deployable_solution":
            conversion["solutions"] += 1

    total = max(len(initiatives), 1)
    conversion["idea_to_prototype"] = round(100 * conversion["prototypes"] / total)
    conversion["prototype_to_mvp"] = (
        round(100 * conversion["mvps"] / max(conversion["prototypes"], 1))
    )
    conversion["mvp_to_cd"] = round(100 * conversion["cds"] / max(conversion["mvps"], 1))
    conversion["cd_to_solution"] = round(
        100 * conversion["solutions"] / max(conversion["cds"], 1)
    )

    avg_age_by_stage = [
        {
            "stage_code": code,
            "label": stages.get(code, STAGE_LABELS.get(code, code)),
            "avg_age_days": round(sum(ages) / len(ages), 1) if ages else 0,
            "count": len(ages),
        }
        for code, ages in sorted(age_sum_by_stage.items(), key=lambda x: -len(x[1]))
    ]

    ipsafe_progress = [
        {
            "idea_id": i.idea_id,
            "title": i.title,
            "value_stream": i.value_stream.name if i.value_stream else None,
            "ipsafe_pct": i.ipsafe_pct,
            "stage_code": i.stage_code,
        }
        for i in initiatives
        if i.ipsafe_pct and i.ipsafe_pct > 0
    ]
    ipsafe_progress.sort(key=lambda x: -x["ipsafe_pct"])

    return {
        "ideas_by_value_stream": [
            {"label": k, "count": v, "filter": {"value_stream": k}}
            for k, v in sorted(by_vs.items(), key=lambda x: -x[1])
        ],
        "initiatives_by_stage": [
            {
                "label": stages.get(k, STAGE_LABELS.get(k, k)),
                "stage_code": k,
                "count": v,
                "filter": {"stage_code": k},
            }
            for k, v in sorted(by_stage.items(), key=lambda x: -x[1])
        ],
        "type_mix": [
            {"label": k, "count": v, "filter": {"initiative_type": k}}
            for k, v in sorted(by_type.items(), key=lambda x: -x[1])
        ],
        "solution_team_workload": [
            {"label": k, "count": v, "filter": {"solution_team": k}}
            for k, v in sorted(by_team.items(), key=lambda x: -x[1])
        ],
        "aging_analysis": [
            {"label": k, "count": v} for k, v in aging_buckets.items()
        ],
        "avg_age_by_stage": avg_age_by_stage,
        "conversion_rates": conversion,
        "ipsafe_progress": ipsafe_progress[:15],
        "approval_turnaround": {
            "pending_raghu": sum(1 for i in initiatives if i.raghu_approval == "Pending"),
            "pending_vijay": sum(1 for i in initiatives if i.vijay_approval == "Pending"),
            "both_approved": sum(
                1
                for i in initiatives
                if i.raghu_approval == "Approved" and i.vijay_approval == "Approved"
            ),
        },
    }


def list_documents(db: Session, search: str | None = None) -> dict[str, Any]:
    query = (
        db.query(Document, Initiative)
        .join(Initiative, Initiative.id == Document.initiative_id)
        .options(joinedload(Initiative.value_stream))
        .order_by(Document.uploaded_at.desc(), Document.id.desc())
    )
    rows = query.all()
    items = []
    for doc, init in rows:
        if search:
            hay = f"{doc.filename} {init.idea_id} {init.title}".lower()
            if search.lower() not in hay:
                continue
        items.append(
            {
                "id": doc.id,
                "filename": doc.filename,
                "document_type": doc.document_type,
                "uploaded_by": doc.uploaded_by,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                "version": doc.version,
                "idea_id": init.idea_id,
                "initiative_title": init.title,
                "value_stream": init.value_stream.name if init.value_stream else None,
            }
        )
    return {"items": items, "count": len(items)}


def list_notifications(db: Session, recipient: str | None = None) -> dict[str, Any]:
    query = db.query(Notification).order_by(Notification.id.desc())
    if recipient:
        query = query.filter(Notification.recipient == recipient)
    rows = query.limit(100).all()
    items = [
        {
            "id": n.id,
            "recipient": n.recipient,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in rows
    ]
    unread = sum(1 for i in items if not i["is_read"])
    return {"items": items, "count": len(items), "unread": unread}


def mark_notification_read(db: Session, notification_id: int) -> dict[str, Any]:
    row = db.query(Notification).filter_by(id=notification_id).first()
    if not row:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Notification not found")
    row.is_read = True
    db.commit()
    return {"id": row.id, "is_read": True}


def mark_all_notifications_read(db: Session, recipient: str | None = None) -> dict[str, Any]:
    query = db.query(Notification).filter(Notification.is_read.is_(False))
    if recipient:
        query = query.filter(Notification.recipient == recipient)
    updated = query.update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"updated": updated}


def build_approval_timeline(init: Initiative) -> list[dict[str, Any]]:
    def status_for(flag: str, pending_label: str = "Pending") -> str:
        if flag in {"Approved", "Accepted", "Complete"}:
            return "done"
        if flag in {"Pending", "Not Started", pending_label}:
            return "pending" if flag == "Pending" else "todo"
        if flag in {"Rejected", "Clarification", "Sent Back", "Request Info", "Returned"}:
            return "blocked"
        return "todo"

    raghu = status_for(init.raghu_approval)
    vijay = status_for(init.vijay_approval)
    solution = status_for(init.solution_approval)

    stage = init.stage_code
    stage_order = [
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
        "deployable_solution",
        "completed",
    ]
    idx = stage_order.index(stage) if stage in stage_order else 0

    def stage_state(min_idx: int) -> str:
        if idx > min_idx:
            return "done"
        if idx == min_idx:
            return "current"
        return "todo"

    return [
        {"key": "submitted", "label": "Submitted", "state": "done", "detail": init.submitted_at.isoformat() if init.submitted_at else ""},
        {"key": "raghu", "label": "Raghu Review", "state": raghu if raghu != "todo" else ("current" if stage == "management_review" else "todo"), "detail": init.raghu_approval},
        {"key": "vijay", "label": "Vijay Review", "state": vijay if vijay != "todo" else ("current" if stage == "management_review" else "todo"), "detail": init.vijay_approval},
        {"key": "solution", "label": "Solution Lead Acceptance", "state": solution if solution != "todo" else stage_state(3), "detail": init.solution_approval},
        {"key": "design", "label": "Design Approval", "state": stage_state(4), "detail": STAGE_LABELS.get(stage, stage)},
        {"key": "ready", "label": "Ready to Build", "state": stage_state(5), "detail": ""},
        {"key": "build", "label": "Build", "state": stage_state(6), "detail": ""},
        {"key": "show", "label": "Show & Tell", "state": stage_state(7), "detail": ""},
        {"key": "prototype", "label": "Prototype Ready", "state": stage_state(9), "detail": ""},
        {"key": "ipsafe", "label": "IPSAFE", "state": stage_state(10), "detail": f"{init.ipsafe_pct}%"},
    ]


def export_portfolio(db: Session, user_id: int | None = None) -> list[dict[str, Any]]:
    from app.services.dashboard import list_initiatives

    return list_initiatives(db, user_id=user_id)


def export_csv(rows: list[dict[str, Any]]) -> str:
    import csv
    import io

    fields = [
        "idea_id",
        "title",
        "value_stream",
        "owner",
        "initiative_type",
        "solution_team",
        "stage_code",
        "status",
        "priority",
        "readiness_pct",
        "ipsafe_pct",
        "age_days",
        "raghu_approval",
        "vijay_approval",
        "solution_approval",
    ]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k, "") for k in fields})
    return buf.getvalue()
