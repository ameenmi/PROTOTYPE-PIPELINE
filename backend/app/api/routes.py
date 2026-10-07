from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.schemas import (
    CreateIdeaRequest,
    ManagementApprovalRequest,
    SolutionReadinessRequest,
)
from app.api.lifecycle_schemas import (
    ConvertSolutionRequest,
    DesignApproveRequest,
    DesignPackageRequest,
    IpsafeUpdateRequest,
    PromoteRequest,
    ShowTellRequest,
    StageAdvanceRequest,
)
from app.api.ai_admin_schemas import (
    AiAnalysisUpdateRequest,
    CopilotRequest,
    IpsafeActivityRequest,
    SolutionTeamRequest,
    StageRequest,
    UserRequest,
    ValueStreamRequest,
)
from app.core.database import get_db
from app.services import admin as admin_service
from app.services import ai_service
from app.services import dashboard as dashboard_service
from app.services import documents as documents_service
from app.services import lifecycle as lifecycle_service
from app.services import reports as reports_service
from app.services import roles as roles_service
from app.services import workflow as workflow_service
from app.services.documents import DocumentUploadRequest

router = APIRouter(prefix="/api", tags=["pipeline"])


@router.get("/health")
def health():
    return {"status": "ok", "service": "Risk & Compliance Innovation Pipeline"}


@router.get("/dashboard")
def dashboard(user_id: int | None = None, db: Session = Depends(get_db)):
    return dashboard_service.get_dashboard(db, user_id=user_id)


@router.get("/initiatives")
def initiatives(
    value_stream_id: int | None = None,
    solution_team_id: int | None = None,
    initiative_type: str | None = None,
    stage_code: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    search: str | None = Query(default=None),
    user_id: int | None = None,
    db: Session = Depends(get_db),
):
    return dashboard_service.list_initiatives(
        db,
        value_stream_id=value_stream_id,
        solution_team_id=solution_team_id,
        initiative_type=initiative_type,
        stage_code=stage_code,
        status=status,
        priority=priority,
        search=search,
        user_id=user_id,
    )


@router.post("/initiatives")
def create_initiative(payload: CreateIdeaRequest, db: Session = Depends(get_db)):
    return workflow_service.create_idea(db, payload)


@router.get("/initiatives/{idea_id}")
def initiative_detail(idea_id: str, db: Session = Depends(get_db)):
    item = dashboard_service.get_initiative(db, idea_id)
    if not item:
        raise HTTPException(status_code=404, detail="Initiative not found")
    return item


@router.post("/initiatives/{idea_id}/management-approval")
def management_approval(
    idea_id: str, payload: ManagementApprovalRequest, db: Session = Depends(get_db)
):
    return workflow_service.apply_management_approval(db, idea_id, payload)


@router.post("/initiatives/{idea_id}/solution-readiness")
def solution_readiness(
    idea_id: str, payload: SolutionReadinessRequest, db: Session = Depends(get_db)
):
    return workflow_service.apply_solution_readiness(db, idea_id, payload)


@router.get("/approvals/pending")
def pending_approvals(db: Session = Depends(get_db)):
    return workflow_service.list_pending_approvals(db)


@router.get("/solution-review/queue")
def solution_review_queue(db: Session = Depends(get_db)):
    return workflow_service.list_solution_review_queue(db)


@router.get("/design/queue")
def design_queue(db: Session = Depends(get_db)):
    return lifecycle_service.list_design_queue(db)


@router.get("/initiatives/{idea_id}/design")
def get_design(idea_id: str, db: Session = Depends(get_db)):
    return lifecycle_service.get_or_create_design(db, idea_id)


@router.put("/initiatives/{idea_id}/design")
def put_design(idea_id: str, payload: DesignPackageRequest, db: Session = Depends(get_db)):
    return lifecycle_service.save_design(db, idea_id, payload)


@router.post("/initiatives/{idea_id}/design/approve")
def post_design_approve(
    idea_id: str, payload: DesignApproveRequest, db: Session = Depends(get_db)
):
    return lifecycle_service.approve_design(db, idea_id, payload)


@router.get("/ready-to-build")
def ready_to_build(db: Session = Depends(get_db)):
    return lifecycle_service.list_ready_to_build(db)


@router.get("/build/queue")
def build_queue(db: Session = Depends(get_db)):
    return lifecycle_service.list_build(db)


@router.post("/initiatives/{idea_id}/stage")
def post_stage(idea_id: str, payload: StageAdvanceRequest, db: Session = Depends(get_db)):
    return lifecycle_service.advance_stage(db, idea_id, payload)


@router.get("/show-and-tell/queue")
def show_tell_queue(db: Session = Depends(get_db)):
    return lifecycle_service.list_show_tell_queue(db)


@router.get("/initiatives/{idea_id}/show-tell")
def get_show_tell(idea_id: str, db: Session = Depends(get_db)):
    return lifecycle_service.get_show_tell(db, idea_id)


@router.post("/initiatives/{idea_id}/show-tell")
def post_show_tell(idea_id: str, payload: ShowTellRequest, db: Session = Depends(get_db)):
    return lifecycle_service.add_show_tell(db, idea_id, payload)


@router.post("/initiatives/{idea_id}/promote-mvp")
def post_promote(idea_id: str, payload: PromoteRequest, db: Session = Depends(get_db)):
    return lifecycle_service.promote_to_mvp(db, idea_id, payload)


@router.get("/ipsafe/queue")
def ipsafe_queue(db: Session = Depends(get_db)):
    return lifecycle_service.list_ipsafe_queue(db)


@router.get("/initiatives/{idea_id}/ipsafe")
def get_ipsafe(idea_id: str, db: Session = Depends(get_db)):
    return lifecycle_service.get_ipsafe(db, idea_id)


@router.put("/initiatives/{idea_id}/ipsafe")
def put_ipsafe(idea_id: str, payload: IpsafeUpdateRequest, db: Session = Depends(get_db)):
    return lifecycle_service.update_ipsafe(db, idea_id, payload)


@router.post("/initiatives/{idea_id}/convert-solution")
def post_convert(
    idea_id: str, payload: ConvertSolutionRequest, db: Session = Depends(get_db)
):
    return lifecycle_service.convert_to_solution(db, idea_id, payload)


@router.post("/copilot/ask")
def copilot_ask(payload: CopilotRequest, db: Session = Depends(get_db)):
    return ai_service.ask_copilot(db, payload.question)


@router.post("/ai/executive-summary")
def executive_summary(db: Session = Depends(get_db)):
    return ai_service.generate_executive_summary(db)


@router.post("/initiatives/{idea_id}/ai-analyze")
def ai_analyze(idea_id: str, db: Session = Depends(get_db)):
    return ai_service.analyze_initiative_documents(db, idea_id)


@router.get("/initiatives/{idea_id}/ai-analysis")
def ai_analysis_get(idea_id: str, db: Session = Depends(get_db)):
    return ai_service.get_ai_analysis(db, idea_id)


@router.put("/initiatives/{idea_id}/ai-analysis")
def ai_analysis_put(
    idea_id: str, payload: AiAnalysisUpdateRequest, db: Session = Depends(get_db)
):
    return ai_service.update_ai_analysis(db, idea_id, payload.model_dump(exclude_none=True))


@router.get("/admin")
def admin_get(db: Session = Depends(get_db)):
    return admin_service.list_admin(db)


@router.post("/admin/value-streams")
def admin_vs_create(payload: ValueStreamRequest, db: Session = Depends(get_db)):
    return admin_service.upsert_value_stream(db, payload.model_dump())


@router.put("/admin/value-streams/{stream_id}")
def admin_vs_update(
    stream_id: int, payload: ValueStreamRequest, db: Session = Depends(get_db)
):
    return admin_service.upsert_value_stream(db, payload.model_dump(), stream_id)


@router.post("/admin/solution-teams")
def admin_team_create(payload: SolutionTeamRequest, db: Session = Depends(get_db)):
    return admin_service.upsert_solution_team(db, payload.model_dump())


@router.put("/admin/solution-teams/{team_id}")
def admin_team_update(
    team_id: int, payload: SolutionTeamRequest, db: Session = Depends(get_db)
):
    return admin_service.upsert_solution_team(db, payload.model_dump(), team_id)


@router.post("/admin/users")
def admin_user_create(payload: UserRequest, db: Session = Depends(get_db)):
    return admin_service.upsert_user(db, payload.model_dump())


@router.put("/admin/users/{user_id}")
def admin_user_update(user_id: int, payload: UserRequest, db: Session = Depends(get_db)):
    return admin_service.upsert_user(db, payload.model_dump(), user_id)


@router.post("/admin/stages")
def admin_stage_create(payload: StageRequest, db: Session = Depends(get_db)):
    return admin_service.upsert_stage(db, payload.model_dump())


@router.put("/admin/stages/{stage_id}")
def admin_stage_update(stage_id: int, payload: StageRequest, db: Session = Depends(get_db)):
    return admin_service.upsert_stage(db, payload.model_dump(), stage_id)


@router.post("/admin/ipsafe-activities")
def admin_ipsafe_create(payload: IpsafeActivityRequest, db: Session = Depends(get_db)):
    return admin_service.upsert_ipsafe_activity(db, payload.model_dump())


@router.put("/admin/ipsafe-activities/{activity_id}")
def admin_ipsafe_update(
    activity_id: int, payload: IpsafeActivityRequest, db: Session = Depends(get_db)
):
    return admin_service.upsert_ipsafe_activity(db, payload.model_dump(), activity_id)


@router.get("/reports/analytics")
def reports_analytics(db: Session = Depends(get_db)):
    return reports_service.get_analytics(db)


@router.get("/reports/export")
def reports_export(
    format: str = Query(default="json"),
    user_id: int | None = None,
    db: Session = Depends(get_db),
):
    rows = reports_service.export_portfolio(db, user_id=user_id)
    if format.lower() == "csv":
        csv_text = reports_service.export_csv(rows)
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=portfolio_export.csv"},
        )
    return {"items": rows, "count": len(rows)}


@router.get("/personas")
def personas(db: Session = Depends(get_db)):
    return roles_service.list_personas(db)


@router.post("/initiatives/{idea_id}/documents")
def upload_document(
    idea_id: str, payload: DocumentUploadRequest, db: Session = Depends(get_db)
):
    return documents_service.add_document(db, idea_id, payload)


@router.get("/initiatives/{idea_id}/document-versions")
def document_versions(
    idea_id: str, filename: str | None = None, db: Session = Depends(get_db)
):
    return documents_service.document_versions(db, idea_id, filename=filename)


@router.get("/documents")
def documents_library(search: str | None = Query(default=None), db: Session = Depends(get_db)):
    return reports_service.list_documents(db, search=search)


@router.get("/notifications")
def notifications_list(
    recipient: str | None = Query(default=None), db: Session = Depends(get_db)
):
    return reports_service.list_notifications(db, recipient=recipient)


@router.post("/notifications/{notification_id}/read")
def notification_read(notification_id: int, db: Session = Depends(get_db)):
    return reports_service.mark_notification_read(db, notification_id)


@router.post("/notifications/read-all")
def notifications_read_all(
    recipient: str | None = Query(default=None), db: Session = Depends(get_db)
):
    return reports_service.mark_all_notifications_read(db, recipient=recipient)


@router.get("/reference")
def reference(db: Session = Depends(get_db)):
    return dashboard_service.get_reference_data(db)
