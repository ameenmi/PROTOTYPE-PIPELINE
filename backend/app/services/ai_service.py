from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.ai import AiAnalysis
from app.models.entities import ActivityLog, Initiative, RiskValueStream, SolutionTeam
from app.services import azure_openai as ao
from app.services.dashboard import get_dashboard, get_initiative, list_initiatives
from app.services.workflow import build_readiness_checklist


def _portfolio_context(db: Session) -> dict[str, Any]:
    dashboard = get_dashboard(db)
    initiatives = list_initiatives(db)
    compact = [
        {
            "idea_id": i["idea_id"],
            "title": i["title"],
            "value_stream": i["value_stream"],
            "initiative_type": i["initiative_type"],
            "stage_code": i["stage_code"],
            "status": i["status"],
            "priority": i["priority"],
            "readiness_pct": i["readiness_pct"],
            "ipsafe_pct": i["ipsafe_pct"],
            "age_days": i["age_days"],
            "attention_level": i["attention_level"],
            "attention_reason": i["attention_reason"],
            "vijay_approval": i["vijay_approval"],
            "raghu_approval": i["raghu_approval"],
            "solution_team": i["solution_team"],
        }
        for i in initiatives
    ]
    return {"dashboard": dashboard, "initiatives": compact}


def _heuristic_copilot_answer(question: str, ctx: dict[str, Any]) -> dict[str, Any]:
    q = question.lower()
    initiatives = ctx["initiatives"]
    dashboard = ctx["dashboard"]
    kpis = dashboard["kpis"]
    links: list[dict[str, str]] = []

    def match(pred):
        return [i for i in initiatives if pred(i)]

    if "climate" in q and "active" in q:
        rows = match(
            lambda i: i["value_stream"] == "Climate Risk" and i["status"] == "Active"
        )
        answer = f"There are {len(rows)} active Climate Risk initiatives."
        links = [{"idea_id": r["idea_id"], "title": r["title"]} for r in rows[:8]]
    elif "most ideas" in q or "submitted the most" in q:
        top = dashboard["leaderboard"][0] if dashboard["leaderboard"] else None
        answer = (
            f"{top['name']} has submitted the most ideas ({top['ideas']})."
            if top
            else "No value stream data available."
        )
    elif "vijay" in q and "approval" in q:
        rows = match(lambda i: i["vijay_approval"] == "Pending")
        answer = f"{len(rows)} initiatives are waiting for Vijay's approval."
        links = [{"idea_id": r["idea_id"], "title": r["title"]} for r in rows[:8]]
    elif "stuck" in q or "more than 10" in q or "aging" in q:
        rows = match(lambda i: i["age_days"] > 10 and i["attention_level"] in {"Amber", "Red"})
        answer = f"{len(rows)} initiatives appear stuck for more than 10 days or flagged for attention."
        links = [
            {
                "idea_id": r["idea_id"],
                "title": f"{r['title']} ({r['attention_reason'] or r['age_days']}d)",
            }
            for r in rows[:8]
        ]
    elif "mvp" in q and "build" in q:
        rows = match(
            lambda i: i["initiative_type"] == "MVP" and i["stage_code"] == "build_in_progress"
        )
        answer = f"{len(rows)} MVPs are currently in build."
        links = [{"idea_id": r["idea_id"], "title": r["title"]} for r in rows[:8]]
    elif "ready to build" in q:
        rows = match(lambda i: i["stage_code"] == "ready_to_build")
        answer = f"{len(rows)} initiatives are ready to build."
        links = [{"idea_id": r["idea_id"], "title": r["title"]} for r in rows[:8]]
    elif "missing user stories" in q or "user stories" in q:
        rows = match(lambda i: i["readiness_pct"] < 60)
        answer = f"{len(rows)} initiatives have readiness below 60% and may be missing user stories or requirements."
        links = [{"idea_id": r["idea_id"], "title": r["title"]} for r in rows[:8]]
    elif "completion rate" in q:
        best = max(
            dashboard["leaderboard"],
            key=lambda x: (x["completed"] / x["ideas"]) if x["ideas"] else 0,
            default=None,
        )
        answer = (
            f"{best['name']} has the highest completion rate ({best['completed']}/{best['ideas']})."
            if best
            else "No leaderboard data."
        )
    elif "capability demonstrator" in q or "candidates" in q:
        rows = match(
            lambda i: i["initiative_type"] == "MVP"
            and i["stage_code"] in {"prototype_ready", "ipsafe_cd", "cd_approved"}
        )
        answer = f"{len(rows)} initiatives are Capability Demonstrator candidates or in IPSAFE CD."
        links = [{"idea_id": r["idea_id"], "title": r["title"]} for r in rows[:8]]
    elif "credit risk" in q and ("summar" in q or "pipeline" in q):
        rows = match(lambda i: i["value_stream"] == "Credit Risk")
        stages = {}
        for r in rows:
            stages[r["stage_code"]] = stages.get(r["stage_code"], 0) + 1
        answer = (
            f"Credit Risk has {len(rows)} initiatives. Stage mix: "
            + ", ".join(f"{k}={v}" for k, v in stages.items())
        )
        links = [{"idea_id": r["idea_id"], "title": r["title"]} for r in rows[:8]]
    elif "solution team" in q and ("workload" in q or "largest" in q):
        counts: dict[str, int] = {}
        for i in initiatives:
            if i["solution_team"]:
                counts[i["solution_team"]] = counts.get(i["solution_team"], 0) + 1
        if counts:
            team = max(counts, key=counts.get)
            answer = f"{team} currently has the largest workload with {counts[team]} assigned initiatives."
        else:
            answer = "No solution team assignments found."
    elif "management summary" in q or "executive" in q:
        answer = (
            f"Pipeline summary: {kpis['total_ideas']} ideas, {kpis['active_initiatives']} active, "
            f"{kpis['awaiting_management_approval']} awaiting management approval, "
            f"{kpis['build_in_progress']} in build, {kpis['blocked_attention_required']} need attention."
        )
    else:
        answer = (
            f"Portfolio snapshot — Total ideas: {kpis['total_ideas']}, Active: {kpis['active_initiatives']}, "
            f"Awaiting management: {kpis['awaiting_management_approval']}, "
            f"Attention required: {kpis['blocked_attention_required']}. "
            "Ask about value streams, approvals, aging, MVPs in build, or readiness gaps."
        )
        links = [
            {"idea_id": i["idea_id"], "title": i["title"]}
            for i in match(lambda i: i["attention_level"] in {"Amber", "Red"})[:5]
        ]

    return {
        "answer": answer,
        "links": links,
        "table": links,
        "source": "heuristic",
        "recommendations": dashboard.get("ai_insights", [])[:3],
    }


def ask_copilot(db: Session, question: str) -> dict[str, Any]:
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question is required")
    ctx = _portfolio_context(db)

    if ao.azure_configured():
        try:
            system = (
                "You are the Innovation Pipeline Copilot for a Risk & Compliance innovation portfolio. "
                "Answer using only the provided JSON portfolio data. Be concise. "
                "Return JSON with keys: answer (string), links (array of {idea_id, title}), "
                "recommendations (array of strings)."
            )
            user = json.dumps({"question": question, "portfolio": ctx}, default=str)
            data, source = ao.chat_json(system, user)
            return {
                "answer": data.get("answer", ""),
                "links": data.get("links", []),
                "table": data.get("links", []),
                "recommendations": data.get("recommendations", []),
                "source": source,
                "azure_configured": True,
            }
        except Exception as exc:
            fallback = _heuristic_copilot_answer(question, ctx)
            fallback["warning"] = f"Azure OpenAI unavailable, used local analysis ({exc})"
            fallback["azure_configured"] = True
            return fallback

    result = _heuristic_copilot_answer(question, ctx)
    result["azure_configured"] = False
    result["warning"] = (
        "Azure OpenAI credentials are not set; responding with portfolio heuristics. "
        "Set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT in backend/.env."
    )
    return result


def _heuristic_document_intelligence(init: Initiative) -> dict[str, Any]:
    docs = init.documents or []
    doc_names = ", ".join(d.filename for d in docs) or "No documents uploaded"
    checklist = build_readiness_checklist(init)
    missing = [i["label"] for i in checklist["items"] if i["status"] != "pass"]
    score = checklist["score"]
    overall = (
        "Ready for Solution Review"
        if score >= 80
        else "Not Ready for Solution Review"
        if score < 65
        else "Nearly Ready — gaps remain"
    )
    return {
        "problem_statement": init.business_problem or "Not extracted",
        "proposed_solution": init.proposed_concept or "Not extracted",
        "business_objective": init.business_value or init.expected_outcome or "Not extracted",
        "functional_requirements": (
            f"Derived from concept and supporting material ({doc_names}). "
            "Confirm detailed functional requirements with the Value Stream Lead."
        ),
        "non_functional_requirements": "Performance, auditability, access control, and explainability expected for Risk & Compliance use.",
        "user_stories": (
            f"As a {init.target_users or 'risk user'}, I want {init.proposed_concept or 'the proposed capability'} "
            f"so that {init.business_value or 'business outcomes improve'}."
        ),
        "data_requirements": "Identify authoritative risk data sources, refresh cadence, and lineage before build.",
        "upstream_systems": "Likely upstream risk data platforms and reference data services (to be confirmed).",
        "downstream_systems": f"Target consumers: {init.target_users or 'Risk stakeholders and reporting forums'}.",
        "dependencies": "Management approval, solution team capacity, and data access agreements.",
        "models_required": "Analytical/ML components implied by the proposed concept; validate model risk requirements.",
        "methodologies_required": "Document methodology assumptions and validation approach.",
        "risks": "Incomplete requirements, data quality gaps, and delayed approvals may block progress.",
        "assumptions": "Supporting documents accurately represent the intended scope.",
        "open_questions": "; ".join(missing[:4]) if missing else "None major",
        "missing_information": "; ".join(missing) if missing else "None identified",
        "readiness_summary": f"Requirements completeness: {score}%",
        "readiness_score": score,
        "overall_readiness": overall,
        "recommendation": (
            f"Additional information is required before Solution Review: {', '.join(missing[:3])}."
            if missing
            else "Initiative appears sufficiently complete to proceed."
        ),
        "checklist": checklist,
        "source": "heuristic",
    }


def analyze_initiative_documents(db: Session, idea_id: str) -> dict[str, Any]:
    init = (
        db.query(Initiative)
        .options(
            joinedload(Initiative.documents),
            joinedload(Initiative.value_stream),
            joinedload(Initiative.owner),
        )
        .filter(Initiative.idea_id == idea_id)
        .first()
    )
    if not init:
        raise HTTPException(status_code=404, detail="Initiative not found")

    payload: dict[str, Any]
    source = "heuristic"
    if ao.azure_configured():
        try:
            system = (
                "Extract initiative intelligence for a Risk & Compliance innovation pipeline. "
                "Return JSON with keys: problem_statement, proposed_solution, business_objective, "
                "functional_requirements, non_functional_requirements, user_stories, data_requirements, "
                "upstream_systems, downstream_systems, dependencies, models_required, methodologies_required, "
                "risks, assumptions, open_questions, missing_information, readiness_score (0-100), "
                "overall_readiness, recommendation."
            )
            user = json.dumps(
                {
                    "title": init.title,
                    "business_problem": init.business_problem,
                    "proposed_concept": init.proposed_concept,
                    "business_value": init.business_value,
                    "target_users": init.target_users,
                    "expected_outcome": init.expected_outcome,
                    "documents": [
                        {"filename": d.filename, "type": d.document_type} for d in init.documents
                    ],
                }
            )
            payload, source = ao.chat_json(system, user)
            checklist = build_readiness_checklist(init)
            payload["checklist"] = checklist
            payload["readiness_score"] = float(payload.get("readiness_score") or checklist["score"])
            payload["readiness_summary"] = f"Requirements completeness: {payload['readiness_score']}%"
            payload["source"] = source
        except Exception:
            payload = _heuristic_document_intelligence(init)
    else:
        payload = _heuristic_document_intelligence(init)

    analysis = db.query(AiAnalysis).filter_by(initiative_id=init.id).first()
    if not analysis:
        analysis = AiAnalysis(initiative_id=init.id)
        db.add(analysis)

    for key in (
        "problem_statement",
        "proposed_solution",
        "business_objective",
        "functional_requirements",
        "non_functional_requirements",
        "user_stories",
        "data_requirements",
        "upstream_systems",
        "downstream_systems",
        "dependencies",
        "models_required",
        "methodologies_required",
        "risks",
        "assumptions",
        "open_questions",
        "missing_information",
        "readiness_summary",
        "overall_readiness",
        "recommendation",
    ):
        setattr(analysis, key, str(payload.get(key) or ""))

    analysis.readiness_score = float(payload.get("readiness_score") or 0)
    analysis.source = payload.get("source", source)
    analysis.raw_json = json.dumps(payload, default=str)
    init.readiness_pct = analysis.readiness_score

    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor="Innovation Pipeline Copilot",
            action="AI document intelligence completed",
            detail=f"Readiness {analysis.readiness_score}% via {analysis.source}",
        )
    )
    db.commit()

    detail = get_initiative(db, idea_id)
    detail["ai_analysis"] = serialize_ai_analysis(analysis)
    return detail


def serialize_ai_analysis(analysis: AiAnalysis | None) -> dict[str, Any] | None:
    if not analysis:
        return None
    return {
        "problem_statement": analysis.problem_statement,
        "proposed_solution": analysis.proposed_solution,
        "business_objective": analysis.business_objective,
        "functional_requirements": analysis.functional_requirements,
        "non_functional_requirements": analysis.non_functional_requirements,
        "user_stories": analysis.user_stories,
        "data_requirements": analysis.data_requirements,
        "upstream_systems": analysis.upstream_systems,
        "downstream_systems": analysis.downstream_systems,
        "dependencies": analysis.dependencies,
        "models_required": analysis.models_required,
        "methodologies_required": analysis.methodologies_required,
        "risks": analysis.risks,
        "assumptions": analysis.assumptions,
        "open_questions": analysis.open_questions,
        "missing_information": analysis.missing_information,
        "readiness_summary": analysis.readiness_summary,
        "readiness_score": analysis.readiness_score,
        "overall_readiness": analysis.overall_readiness,
        "recommendation": analysis.recommendation,
        "source": analysis.source,
        "updated_at": analysis.updated_at.isoformat() if analysis.updated_at else None,
    }


def get_ai_analysis(db: Session, idea_id: str) -> dict[str, Any]:
    init = db.query(Initiative).filter_by(idea_id=idea_id).first()
    if not init:
        raise HTTPException(status_code=404, detail="Initiative not found")
    analysis = db.query(AiAnalysis).filter_by(initiative_id=init.id).first()
    detail = get_initiative(db, idea_id)
    detail["ai_analysis"] = serialize_ai_analysis(analysis)
    detail["azure_configured"] = ao.azure_configured()
    return detail


def update_ai_analysis(db: Session, idea_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    init = db.query(Initiative).filter_by(idea_id=idea_id).first()
    if not init:
        raise HTTPException(status_code=404, detail="Initiative not found")
    analysis = db.query(AiAnalysis).filter_by(initiative_id=init.id).first()
    if not analysis:
        analysis = AiAnalysis(initiative_id=init.id)
        db.add(analysis)

    editable = {
        "problem_statement",
        "proposed_solution",
        "business_objective",
        "functional_requirements",
        "non_functional_requirements",
        "user_stories",
        "data_requirements",
        "upstream_systems",
        "downstream_systems",
        "dependencies",
        "models_required",
        "methodologies_required",
        "risks",
        "assumptions",
        "open_questions",
        "missing_information",
        "overall_readiness",
        "recommendation",
    }
    for key, value in updates.items():
        if key in editable:
            setattr(analysis, key, value)
    if "readiness_score" in updates and updates["readiness_score"] is not None:
        analysis.readiness_score = float(updates["readiness_score"])
        init.readiness_pct = analysis.readiness_score

    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=updates.get("actor", "User"),
            action="Edited AI analysis",
            detail="User reviewed/edited AI-generated fields",
        )
    )
    db.commit()
    return get_ai_analysis(db, idea_id)


def generate_executive_summary(db: Session) -> dict[str, Any]:
    ctx = _portfolio_context(db)
    if ao.azure_configured():
        try:
            system = (
                "Write an executive summary for Risk & Compliance innovation leadership. "
                "Return JSON with keys: summary (string), insights (array of strings), "
                "priorities (array of strings)."
            )
            data, source = ao.chat_json(system, json.dumps(ctx["dashboard"], default=str))
            return {
                "summary": data.get("summary", ""),
                "insights": data.get("insights", []),
                "priorities": data.get("priorities", []),
                "source": source,
                "azure_configured": True,
            }
        except Exception as exc:
            pass_exc = str(exc)
    else:
        pass_exc = None

    kpis = ctx["dashboard"]["kpis"]
    insights = ctx["dashboard"].get("ai_insights", [])
    summary = (
        f"The Risk & Compliance Innovation Pipeline currently holds {kpis['total_ideas']} ideas "
        f"with {kpis['active_initiatives']} active. "
        f"{kpis['awaiting_management_approval']} await management approval and "
        f"{kpis['blocked_attention_required']} require attention. "
        f"Build capacity is engaged with {kpis['build_in_progress']} initiatives in progress and "
        f"{kpis['capability_demonstrators']} progressing through Capability Demonstrator / IPSAFE."
    )
    return {
        "summary": summary,
        "insights": insights,
        "priorities": [
            "Clear aged management approvals (Vijay/Raghu).",
            "Unblock low-readiness high-priority initiatives before Solution Review.",
            "Balance Solution Team workload across active builds.",
        ],
        "source": "heuristic",
        "azure_configured": ao.azure_configured(),
        "warning": pass_exc
        or (
            None
            if ao.azure_configured()
            else "Azure OpenAI not configured; generated local executive summary."
        ),
    }
