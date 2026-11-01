# Development Guide

## Prerequisites

- Git
- Python 3.11+ and `pip`
- Node.js 20+ and npm (for the frontend, once scaffolded)
- Docker (for local PostgreSQL)
- Optional later: FFmpeg (audio/video handling for Whisper)

## Environment setup

```bash
cp .env.example .env        # fill in local values; never commit .env

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# check: http://localhost:8000/api/v1/health

# Database
docker compose up -d postgres
# Check startup: docker compose ps
# Defaults work without a .env file; copy .env.example to .env to override them
```

Heavy ML dependencies (Whisper, MediaPipe, spaCy models, Sentence Transformers) are intentionally **not** in `requirements.txt` yet. Add them per module when you implement it, preferably in module-specific requirement files.

Frontend scaffolding is not done. Suggested: from the repo root run `npx create-next-app@latest frontend` (TypeScript, Tailwind, App Router, `src/` directory) and then adjust to the structure in PROJECT_STRUCTURE.md.

## Naming conventions

- Directories: lowercase. Python: `snake_case` modules/functions, `PascalCase` classes. TypeScript: `camelCase` variables, `PascalCase` components.
- API paths: lowercase, plural nouns, under `/api/v1`.
- Branches: `feature/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).

## Testing expectations

- Backend and engines: pytest, tests next to each module in `tests/`. New logic needs tests; run `make backend-test`.
- Frontend: Vitest or Jest with React Testing Library (to be chosen when scaffolding).
- Never commit real resumes, recordings, datasets, or model weights; use tiny synthetic fixtures.
- A feature is "done" only when it works and is tested, not when its folder exists.

## Error handling and logging

- Raise typed application errors in services; convert to the standard error body in middleware.
- Use Python `logging` with structured output; include request/job IDs.
- Never log resume text, transcripts, media paths with personal names, or secrets.

## Git workflow

1. Update your branch: `git pull --rebase origin <branch>` (resolve conflicts carefully).
2. Make small focused commits.
3. Open a pull request; at least one teammate reviews.
4. Do not force-push shared branches. Do not commit `.env`, data, or weights.

## Security checklist

Env-only secrets; validate upload type and size; random storage keys; sign S3 URLs; consent before recording; deletion path for user data.
