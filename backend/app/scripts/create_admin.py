"""Create or promote an administrator using environment-provided credentials.

Run from backend/: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... python -m app.scripts.create_admin
"""
import os

from sqlalchemy import select

from app.db.session import get_session_factory
from app.models import User
from app.security.auth import hash_password


def main() -> None:
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "")
    name = os.environ.get("ADMIN_NAME", "Oracy Administrator").strip() or "Oracy Administrator"
    if not email or "@" not in email:
        raise SystemExit("Set ADMIN_EMAIL to a valid email address.")
    if len(password) < 12 or not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise SystemExit("ADMIN_PASSWORD must be at least 12 characters and contain a letter and a number.")

    db = get_session_factory()()
    try:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, full_name=name, password_hash=hash_password(password), role="admin")
            db.add(user)
        else:
            user.full_name = name
            user.password_hash = hash_password(password)
            user.role = "admin"
        db.commit()
        print(f"Administrator account ready: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
