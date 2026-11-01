# backend

FastAPI application: REST endpoints under `/api/v1`, validation, database access, orchestration, and application business logic.

**Status:** Authenticated account and interview persistence baseline implemented. The API includes student registration/login, a separate administrator login, `/auth/me`, a role-protected admin overview, resume parsing, personalized question generation, heuristic answer evaluation, and user-owned interview sessions. Student registration always creates a `student` account; it cannot grant admin access. Provision admin accounts with the server-side script described below.

Interview session create/save/complete/detail/history endpoints require `Authorization: Bearer <access_token>`. Every interview is stored with its owner; history is derived from the authenticated user, and another user's session returns `404`. Resume parsing and question generation are currently stateless endpoints. Student name, college, degree, graduation year, target role, and career goals are stored on the account. Profile photos, resume file metadata, and dashboard settings remain browser-local.

Passwords are hashed with PBKDF2-HMAC-SHA256. Access tokens are signed, expiring HMAC bearer tokens. This is an implementation baseline: tokens are stored in browser localStorage, and rate limiting, email verification, password reset, refresh-token rotation, and HttpOnly-cookie deployment are not yet implemented. Before production, configure a strong `AUTH_SECRET`, HTTPS, secure cookie-based sessions, and rate limiting.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
python -m pytest
```

Layering: `api` → `services` → `repositories` → `db`. `models` (DB) and `schemas` (API) stay separate. No heavy ML in request handlers.


## Interview session persistence

- `POST /api/v1/interviews` creates a session and its question list for the authenticated user.
- `PUT /api/v1/interviews/{session_id}/answers/{question_id}` saves that user's answer.
- `POST /api/v1/interviews/{session_id}/complete` closes the session and persists heuristic evaluation results.
- `GET /api/v1/interviews/{session_id}` returns only the authenticated user's session.
- `GET /api/v1/interviews/history` returns all summaries belonging to the authenticated user.

Existing PostgreSQL databases must be backed up and migrated. Review and apply `migrations/0002_persist_interview_results.sql` and `migrations/0003_user_accounts_and_roles.sql` in order. For a fresh local database, configure `DATABASE_URL`, then run `python -m app.scripts.init_db` from `backend/`.


## Authentication and admin setup

1. Configure `DATABASE_URL`, `AUTH_SECRET` (a unique random value of at least 32 characters), and `CORS_ALLOWED_ORIGINS` in the backend environment.
2. For an existing PostgreSQL database, back it up and apply `migrations/0003_user_accounts_and_roles.sql` after migration `0002_persist_interview_results.sql`. For a fresh database, run `python -m app.scripts.init_db` from `backend/`.
3. Create an admin account from the `backend/` directory after the database is available:

   ```bash
   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='Use-A-Long-Unique-Password-123' ADMIN_NAME='Oracy Admin' python -m app.scripts.create_admin
   ```

   On Windows PowerShell, use `$env:ADMIN_EMAIL='admin@example.com'`, `$env:ADMIN_PASSWORD='Use-A-Long-Unique-Password-123'`, and `$env:ADMIN_NAME='Oracy Admin'` before running `python -m app.scripts.create_admin`.
4. Students register at `/signup` and sign in at `/login`. Administrators sign in separately at `/admin/login`; admin accounts are not created through public registration.

### Auth endpoints

- `POST /api/v1/auth/register` — create a student account.
- `POST /api/v1/auth/login` — student sign in.
- `POST /api/v1/auth/admin/login` — administrator-only sign in.
- `GET /api/v1/auth/me` — return the authenticated account and saved profile.
- `PATCH /api/v1/auth/me` — save the authenticated student’s name and career/education profile.
- `POST /api/v1/auth/logout` — client should discard its bearer token; tokens are stateless.
- `GET /api/v1/auth/admin/overview` — admin-only aggregate metrics and recent account list.

### User-owned interview endpoints

- `POST /api/v1/interviews` — create an interview owned by the authenticated user.
- `PUT /api/v1/interviews/{session_id}/answers/{question_id}` — save that user's answer.
- `POST /api/v1/interviews/{session_id}/complete` — evaluate and complete that user's session.
- `GET /api/v1/interviews/{session_id}` — retrieve only a session owned by the authenticated user.
- `GET /api/v1/interviews/history` — retrieve all interview summaries for the authenticated user.


## MongoDB Atlas connection (Task 10 baseline)

Install dependencies from `backend/requirements.txt`, then set `MONGODB_URI` and `MONGODB_DATABASE` in `backend/.env`. Replace the URI placeholder with your Atlas connection string and URL-encode special characters in the password. Never commit `.env` or share the URI. Ensure your development IP is on the Atlas IP Access List and the database user has appropriate permissions.

Start the API and open `GET /api/v1/health/mongodb` (or `/docs`) to verify Atlas connectivity. The endpoint returns only connection status and never returns credentials. `GET /api/v1/health/ready` still checks PostgreSQL. **Important:** existing user accounts and interview-session persistence remain on PostgreSQL in this version; this change adds and verifies an Atlas connection, it does not migrate those repositories to MongoDB yet.
