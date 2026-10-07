from datetime import date
from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.models.entities import ActivityLog, Document, Initiative


class DocumentUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    document_type: str = "Other"
    uploaded_by: str = "User"
    version: str | None = None
    replace_of_id: int | None = None


def _bump_version(current: str | None) -> str:
    if not current:
        return "1.0"
    try:
        major, minor = current.split(".", 1)
        return f"{int(major)}.{int(minor) + 1}"
    except Exception:
        return f"{current}.1"


def add_document(db: Session, idea_id: str, payload: DocumentUploadRequest) -> dict[str, Any]:
    init = (
        db.query(Initiative)
        .options(joinedload(Initiative.documents))
        .filter(Initiative.idea_id == idea_id)
        .first()
    )
    if not init:
        raise HTTPException(status_code=404, detail="Initiative not found")

    version = payload.version
    if payload.replace_of_id:
        prior = next((d for d in init.documents if d.id == payload.replace_of_id), None)
        if prior:
            version = version or _bump_version(prior.version)
            # Keep history: do not delete prior; new card is next version
            if not payload.filename:
                payload.filename = prior.filename
            if payload.document_type == "Other":
                payload.document_type = prior.document_type

    if not version:
        # If same filename exists, bump; else 1.0
        same = [d for d in init.documents if d.filename == payload.filename]
        version = _bump_version(same[-1].version) if same else "1.0"

    doc = Document(
        initiative_id=init.id,
        filename=payload.filename,
        document_type=payload.document_type,
        uploaded_by=payload.uploaded_by,
        uploaded_at=date.today(),
        version=version,
    )
    db.add(doc)
    db.add(
        ActivityLog(
            initiative_id=init.id,
            actor=payload.uploaded_by,
            action="Document uploaded",
            detail=f"{payload.filename} v{version}",
        )
    )
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id,
        "filename": doc.filename,
        "document_type": doc.document_type,
        "uploaded_by": doc.uploaded_by,
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        "version": doc.version,
        "idea_id": idea_id,
    }


def document_versions(db: Session, idea_id: str, filename: str | None = None) -> dict[str, Any]:
    init = (
        db.query(Initiative)
        .options(joinedload(Initiative.documents))
        .filter(Initiative.idea_id == idea_id)
        .first()
    )
    if not init:
        raise HTTPException(status_code=404, detail="Initiative not found")
    docs = init.documents
    if filename:
        docs = [d for d in docs if d.filename == filename]
    # Group by base filename
    groups: dict[str, list] = {}
    for d in docs:
        groups.setdefault(d.filename, []).append(
            {
                "id": d.id,
                "filename": d.filename,
                "document_type": d.document_type,
                "uploaded_by": d.uploaded_by,
                "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
                "version": d.version,
            }
        )
    for key in groups:
        groups[key].sort(key=lambda x: x["version"])
    return {"idea_id": idea_id, "groups": groups}
