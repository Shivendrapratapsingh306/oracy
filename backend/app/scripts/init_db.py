"""Create all current SQLAlchemy tables for a fresh local development database.

For existing databases, use reviewed SQL migrations instead of this helper.
"""
from app.db.base import Base
from app.db.session import get_engine
from app.models import Answer, InterviewSession, Question, Resume, User  # noqa: F401


def main() -> None:
    Base.metadata.create_all(bind=get_engine())
    print("Oracy database tables are ready.")


if __name__ == "__main__":
    main()
