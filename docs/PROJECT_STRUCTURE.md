# Project Structure

Oracy is a modular monorepo. Each top-level module has one responsibility and a defined boundary.

## Modules

| Directory | Responsibility | Must not |
|---|---|---|
| `frontend/` | UI, resume upload, interview experience (recording), dashboards, API integration | Contain scoring or ML logic |
| `backend/` | REST endpoints, validation, DB access, orchestration, application business logic | Run heavy ML inference inside request handlers |
| `ml-engine/` | Resume parsing, question generation, answer evaluation, readiness scoring, feedback | Access HTTP or DB directly |
| `speech-analysis/` | Transcription, audio features, fluency metrics | Score candidates (it only emits metrics) |
| `vision-engine/` | Pose landmarks, gaze estimation, movement and framing metrics | Make judgments about personality |
| `shared/` | Versioned API contracts and schemas used by multiple components | Contain implementation code |
| `docs/` | Architecture decisions, setup, interfaces, workflows | |
| `scripts/` | Developer utilities (seed data, local helpers) | |

## Dependency direction

```
frontend ──HTTP──> backend ──imports──> ml-engine
                      │                 speech-analysis
                      │                 vision-engine
                      └──> PostgreSQL / file storage
```

- `ml-engine`, `speech-analysis`, and `vision-engine` never import from `backend` or from each other, except shared helpers in their own `common/` or in `shared/`. This avoids circular dependencies.
- `ml-engine` consumes the *metrics* produced by speech and vision through plain data structures defined in `shared/schemas`.

## Backend layout (`backend/app/`)

| Path | Purpose | Status |
|---|---|---|
| `main.py` | App factory, router mounting | Exists |
| `api/v1/router.py`, `endpoints/` | Versioned routes under `/api/v1` | Health only |
| `core/` | Settings, logging, security helpers | `config.py` only |
| `db/` | Engine, session management | Planned |
| `models/` | SQLAlchemy models (DB representation) | Planned |
| `schemas/` | Pydantic request/response schemas (API representation) | Planned |
| `repositories/` | Data-access layer, the only code that queries the DB | Planned |
| `services/` | Business logic and orchestration | Planned |
| `middleware/` | Request IDs, error handling, logging | Planned |

DB models and API schemas are kept separate on purpose; do not reuse one as the other.

## Frontend layout (`frontend/src/`, planned)

`app/` routes, `components/` shared UI, `features/` feature-scoped code (resume, interview, dashboard), `hooks/`, `lib/`, `services/` (API client), `types/`, `styles/`.

## Engine modules (planned subpackages)

- `ml-engine/`: `resume_parser/`, `interview_generator/`, `answer_evaluator/`, `readiness_scorer/`, `feedback_generator/`, `common/`
- `speech-analysis/`: `transcription/`, `audio_features/`, `fluency_analysis/`, `common/`
- `vision-engine/`: `pose_analysis/`, `gaze_analysis/`, `movement_analysis/`, `framing_analysis/`, `common/`

Subpackages are created when the first real code for them is written, with `__init__.py` and tests. Hyphenated directory names (`ml-engine`) are not importable Python names; when implementation starts, either add a `src`-style package inside each (e.g. `ml_engine/`) or install them as editable packages.

## Naming

Lowercase directories; `snake_case` for Python; `kebab-case` for frontend route folders; `PascalCase` for React components.
