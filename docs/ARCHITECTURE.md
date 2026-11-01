# Architecture

> Describes the intended design. Almost nothing below is implemented yet.

## Overview

```
Browser (Next.js)
   │  REST /api/v1 (JSON, multipart upload)
   ▼
FastAPI backend ── PostgreSQL (metadata, scores, feedback)
   │            └─ File storage (local dev / S3): resumes, audio, video
   │ enqueue job (later) / call (initially)
   ▼
Analysis workers (same codebase, separate process once introduced)
   ├─ ml-engine         resume parse, questions, evaluation, scoring, feedback
   ├─ speech-analysis   Whisper transcription, librosa features, fluency metrics
   └─ vision-engine     MediaPipe/OpenCV pose, gaze, movement, framing
```

## Components and interactions

1. **Frontend** uploads a resume, starts an interview session, shows questions, records audio/video of answers, uploads media, polls for results, renders dashboard.
2. **Backend** validates input, stores files via a storage abstraction, persists records, and orchestrates analysis. It does not contain ML code beyond calling module interfaces.
3. **ml-engine** works on text and metric data: profile extraction, question generation (LLM abstraction plus templates), answer evaluation, scoring, feedback.
4. **speech-analysis** and **vision-engine** take media files and return metric records with confidence values.

## Data flow (one interview session)

1. Candidate uploads resume → backend stores file → resume parser extracts profile → profile saved.
2. Candidate picks target role → question generator produces questions from profile and role.
3. For each question, candidate answers on camera/mic → media uploaded.
4. Per answer, in parallel: transcription + speech metrics; vision metrics; NLP evaluation of the transcript.
5. Adaptive follow-up: evaluation output (e.g., missing detail) informs the next question.
6. At session end: scorer combines component scores into the Interview Readiness Score with a per-factor breakdown; feedback generator produces recommendations.
7. Results are persisted and shown in the dashboard.

## Sync vs async inference

- **Initial development:** analysis may run synchronously in a clearly separated service function so the pipeline can be tested end to end. Handlers must return quickly for light work (CRUD, validation).
- **Heavy work** (Whisper, MediaPipe over video, embedding models) must not run inside the HTTP request path in production. Planned approach: an `analysis_jobs` table with status (`queued`, `running`, `succeeded`, `failed`), a worker process, and client polling via `GET /api/v1/jobs/{id}`. A queue (e.g., Redis-based) can be introduced later without changing API contracts.
- Question generation and short text evaluation may stay synchronous if latency is acceptable.

## Cross-cutting conventions

- **Errors:** consistent JSON error body `{ "error": { "code", "message", "details" } }`; never leak stack traces or file paths to clients.
- **Logging:** structured logs with request ID; log job IDs and statuses, never resume text, transcripts, or media contents.
- **Config:** environment variables only (see `.env.example`); optional services (LLM, S3) disabled when unset.
- **Secure file handling:** enforce file-type and size limits; validate content type, not just extension; generate random storage keys (never user-supplied names); store outside the web root; time-limited access (signed URLs for S3); virus scanning and retention/deletion policy to be defined; users must be able to delete their media and data; get explicit consent before recording.
- **Responsible metrics:** gaze, posture, and movement outputs are estimates affected by lighting, camera, and disability; present them as hints, never as judgments of personality or employability.

## Decisions to revisit

Auth approach, job queue choice, LLM provider, retention periods, and how models are packaged/cached.
