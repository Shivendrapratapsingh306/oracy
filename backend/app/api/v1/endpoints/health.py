from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness check only; it does not require external services."""
    return {"status": "ok"}


@router.get("/health/ready")
def readiness(db: Session = Depends(get_db)) -> dict[str, str]:
    """Readiness check verifies that the configured database accepts queries."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database is unavailable") from exc
    return {"status": "ok", "database": "ok"}


@router.get("/health/mongodb")
def mongodb_readiness() -> dict[str, str]:
    """Verify MongoDB Atlas connectivity without returning the URI or secrets."""
    from pymongo.errors import PyMongoError
    from app.db.mongodb import get_mongo_client

    try:
        client = get_mongo_client()
        client.admin.command("ping")
        return {"status": "ok", "mongodb": "connected"}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="MongoDB Atlas is unavailable or not configured") from exc
