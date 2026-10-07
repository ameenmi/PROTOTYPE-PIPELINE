from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.entities import User


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter_by(id=user_id, is_active=True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def serialize_persona(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "value_stream_id": user.value_stream_id,
        "solution_team_id": user.solution_team_id,
        "scope": role_scope(user.role),
    }


def role_scope(role: str) -> str:
    if role == "Administrator":
        return "all"
    if role == "Solution Lead":
        return "solution_team"
    return "value_stream"


def list_personas(db: Session) -> dict[str, Any]:
    users = (
        db.query(User)
        .filter(User.is_active.is_(True))
        .order_by(User.role, User.name)
        .all()
    )
    # Prefer one clear demo persona per role up front
    preferred_names = {"Vijay", "Priya Shah", "Aisha Rahman"}
    preferred = [u for u in users if u.name in preferred_names]
    others = [u for u in users if u.name not in preferred_names]
    ordered = preferred + others
    return {
        "personas": [serialize_persona(u) for u in ordered],
        "default_user_id": next((u.id for u in ordered if u.role == "Administrator"), ordered[0].id if ordered else None),
    }


def apply_role_filters(query, user: User | None):
    """Restrict initiative query by persona role."""
    from app.models.entities import Initiative

    if not user:
        return query
    if user.role == "Administrator":
        return query
    if user.role == "Solution Lead":
        if user.solution_team_id:
            return query.filter(Initiative.solution_team_id == user.solution_team_id)
        return query.filter(Initiative.id == -1)
    # Value Stream Lead (and similar)
    if user.value_stream_id:
        return query.filter(Initiative.value_stream_id == user.value_stream_id)
    return query.filter(Initiative.owner_id == user.id)
