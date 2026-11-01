# API Design

All routes are versioned under `/api/v1`. JSON unless noted.

**Implemented:** health/readiness; student registration/login and separate admin login; authenticated identity and admin overview; resume parsing; role-based question generation; heuristic answer evaluation; and persistent, owner-scoped interview sessions. Interview endpoints require a bearer token. Resume parsing and question generation remain stateless. Dashboard preferences remain browser-local.

## Endpoint groups

| Group | Endpoint | Status |
|---|---|---|
| Health | `GET /health` | Implemented |
| Auth | `POST /auth/register`, `POST /auth/login` | Implemented (students) |
| Auth | `POST /auth/admin/login` | Implemented (provisioned admins only) |
| Auth | `GET /auth/me`, `PATCH /auth/me`, `POST /auth/logout` | Implemented |
| Admin | `GET /auth/admin/overview` | Implemented (admin-only) |
| Resumes | `POST /resumes/parse` (multipart PDF/DOCX) | Implemented (in-memory parse; no persistence) |
| Resumes | `POST /resumes` (multipart, persistent) | Proposed |
| Resumes | `GET /resumes/{id}` | Proposed |
| Profiles | `GET /profiles/{resume_id}` | Proposed |
| Sessions | `POST /interviews` | Implemented (authenticated owner) |
| Sessions | `GET /interviews/{id}`, `GET /interviews/history` | Implemented (owner-scoped) |
| Sessions | `PUT /interviews/{id}/answers/{question_id}`, `POST /interviews/{id}/complete` | Implemented (owner-scoped) |
| Questions | `POST /questions/generate` | Implemented (deterministic baseline; no LLM) |
| Questions | `GET /sessions/{id}/questions` | Proposed |
| Answers | `POST /answers/evaluate` (JSON) | Implemented (heuristic estimate; no persistence) |
| Answers | `POST /sessions/{id}/answers` (multipart: text/audio/video) | Proposed |
| Answers | `GET /answers/{id}` | Proposed |
| Jobs | `GET /jobs/{id}` | Proposed |
| Results | `GET /sessions/{id}/readiness` | Proposed |
| Feedback | `GET /sessions/{id}/feedback` | Proposed |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/sessions` | Proposed |

Auth status: interview persistence and admin overview are role/owner protected. Resume parsing, question generation, and standalone evaluation are stateless and currently do not require authentication. Public registration always assigns the `student` role; admins must be provisioned server-side. Bearer tokens are currently stored in browser localStorage, so this is not yet production-grade session handling.


### `POST /questions/generate` (implemented baseline)

Request JSON accepts `target_role` (required), optional `skills`, `project_mentions`, and `experience_mentions` from the resume parser response, and `question_count` (3–15, default 8). Example:

```json
{
  "target_role": "Backend Engineer",
  "skills": ["Python", "Redis"],
  "project_mentions": ["PrepMate interview coach"],
  "experience_mentions": ["Software internship"],
  "question_count": 8
}
```

Response contains `target_role`, `generation_method: "rule_based_baseline"`, and question objects with `id`, `category` (`technical`, `project`, `experience`, or `hr`), `text`, and `rationale`. The current generator is deterministic and template-based; it does not call an LLM, persist sessions, or claim to assess candidate quality.

### `POST /answers/evaluate` (implemented baseline)

Accepts a `target_role` and 1–15 answer objects. Each object includes `question_id`, `question_text`, `category`, and `answer`. Returns a per-answer estimated score, relevance/completeness/structure signals, strengths, and improvement suggestions. The overall score is a transparent text heuristic based on word overlap, answer length, and visible structure markers; it does **not** verify technical correctness or use an LLM. The response carries a disclaimer. Blank answers score zero. Submitted answers are processed for the response only and are not saved.

Example request:

```json
{
  "target_role": "Backend Engineer",
  "answers": [
    {
      "question_id": "q1",
      "question_text": "How would you design a REST API with caching?",
      "category": "technical",
      "answer": "First, I would define endpoints and validate requests. For example, Redis can cache frequent reads. Then I would monitor latency and invalidate stale values."
    }
  ]
}
```

## Conventions

- Errors: `{ "error": { "code": "invalid_file_type", "message": "...", "details": {} } }` with proper HTTP status.
- Long-running work returns `202 Accepted` with a job reference.
- Pagination: `?limit=&cursor=` on list routes.
- Timestamps: ISO 8601 UTC.
- Contract files live in `shared/api-contracts/`; Pydantic schemas in `backend/app/schemas/` must match.

## Example contracts (proposed)

### `POST /resumes`

Request: `multipart/form-data` with `file` (PDF/DOCX) and `target_role`.

Response `201`:
```json
{
  "id": "res_123",
  "status": "parsing",
  "job_id": "job_456"
}
```

### `POST /sessions`

```json
{ "resume_id": "res_123", "target_role": "Backend Engineer", "question_count": 5 }
```

Response `201`:
```json
{ "id": "ses_789", "status": "in_progress", "created_at": "2026-01-01T10:00:00Z" }
```

### `POST /sessions/{id}/answers`

Multipart: `question_id`, optional `answer_text`, optional `audio`, optional `video`.

Response `202`:
```json
{ "answer_id": "ans_1", "job_id": "job_457", "status": "queued" }
```

### `GET /jobs/{id}`

```json
{ "id": "job_457", "status": "succeeded", "result_ref": "/api/v1/answers/ans_1" }
```

### `GET /sessions/{id}/readiness`

```json
{
  "session_id": "ses_789",
  "readiness_score": 0.0,
  "scale": "0-100",
  "config_version": "example",
  "components": [
    { "name": "technical_knowledge", "score": 0.0, "weight": 0.0, "confidence": 0.0,
      "evidence": ["..."] }
  ],
  "disclaimer": "Presentation metrics are estimates and not measures of employability."
}
```
Values are placeholders; weights come from configuration and are not validated.
