# 🎙️ Oracy

🌐 **Live Demo:** [https://oracy-git-main-treat1.vercel.app/](https://oracy-git-main-treat1.vercel.app/)

<h3 align="center">AI-Powered Multimodal Interview Preparation</h3>

<p align="center">
  Practice interviews, improve communication, and track your readiness with AI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Development-orange?style=flat-square" alt="Project Status" />
  <img src="https://img.shields.io/badge/Next.js-Frontend-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-ML%20Engine-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
</p>

---

## ✨ Overview

**Oracy** is an AI-powered interview preparation platform designed to help candidates practice personalized interviews, improve communication, and assess interview readiness through multimodal analysis.

By combining natural language processing, speech analysis, and computer vision, Oracy aims to provide actionable feedback beyond traditional interview practice.

## 🚀 Features

- 📄 **Resume Analysis** — Extract skills, projects, and experience from candidate resumes.
- 🎯 **Personalized Questions** — Generate role-specific interview questions based on candidate profiles.
- 🔄 **Adaptive Interviews** — Ask relevant follow-up questions based on previous responses.
- 🧠 **Answer Evaluation (baseline)** — Estimate relevance, completeness, and structure from simple text signals and provide improvement suggestions. This is not semantic/technical grading yet.
- 🎤 **Speech Analysis** — Analyze speaking rate, pauses, filler words, and fluency.
- 👁️ **Visual Analysis** — Estimate posture, gaze, movement, and camera framing.
- 📊 **Readiness Score** — Generate explainable scores based on interview practice performance.
- 💡 **AI Feedback** — Recommend personalized areas for improvement.
- 📈 **User-Specific Interview History** — Persist answers and evaluation results to the signed-in student account.
- 🔐 **Student and Admin Accounts** — Student registration/sign-in plus a separately provisioned administrator portal with role-protected metrics.

## Current Implementation Notes

- `POST /api/v1/answers/evaluate` returns explainable rule-based practice feedback for submitted text answers.
- The scores are heuristic estimates, not objective measures of interview performance or technical correctness.
- Resume parsing processes the file in memory and does not store the upload or raw resume text.
- Interview sessions, answers, and evaluation results are persisted and scoped to the authenticated owner.
- Student account registration and login are handled by the FastAPI backend; admin accounts must be provisioned by an operator.
- Student name, education, target role and career goals are saved to the account; profile photo, resume metadata and dashboard preferences remain browser-local.
- The frontend requires the FastAPI backend and database to be running and configured via `NEXT_PUBLIC_API_BASE_URL`.

## 🛠️ Tech Stack

| Component | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL (existing auth/interview persistence); MongoDB Atlas connector added for connectivity verification |
| NLP & Machine Learning | spaCy, Sentence Transformers, scikit-learn |
| Speech Analysis | Whisper, librosa |
| Computer Vision | OpenCV, MediaPipe |
| Storage | Local Storage, AWS S3 abstraction |
| Infrastructure | Docker |

## 🏗️ Project Structure

```text
oracy/
├── frontend/          # Next.js application
├── backend/           # FastAPI backend
├── ml-engine/         # NLP, scoring, and feedback
├── speech-analysis/   # Audio processing and speech metrics
├── vision-engine/     # Computer vision and visual analysis
├── shared/            # Shared schemas and utilities
├── docs/              # Project documentation
├── scripts/           # Development and utility scripts
├── .env.example       # Example environment configuration
├── docker-compose.yml
├── Makefile
└── README.md
```

## ⚙️ Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm
- Python
- Git
- Docker (optional, for containerized development)

### Clone the Repository

```bash
git clone https://github.com/AnshiniChaturvedi/Oracy.git
cd Oracy
```

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run the Backend

Follow the backend setup instructions and environment requirements before starting the FastAPI service. Backend dependencies and configuration may vary as development progresses.

> **Note:** Configure environment variables locally using `.env.example` as a reference. Never commit API keys, passwords, or other secrets to GitHub.

## 📍 Development Roadmap

- [x] Initial database foundation (PostgreSQL config, SQLAlchemy session, core models, readiness endpoint)
- [x] Database migrations for persisted interviews and account roles
- [ ] Persistent resume records
- [x] In-memory PDF/DOCX resume parsing endpoint (profile extraction only)
- [x] Rule-based personalized question generation endpoint
- [x] Frontend flow for resume parsing and question generation
- [x] In-browser interview room with answer drafts, progress, timer, and review screen
- [ ] Persistent resume upload, OCR, and LLM-powered question generation
- [ ] NLP-based answer evaluation and adaptive interviews (answers are not yet scored or persisted)
- [ ] Speech analysis and fluency metrics
- [ ] Computer vision and visual presentation analysis
- [ ] Explainable readiness scoring and personalized feedback
- [x] Persistent interview history (account-scoped)
- [ ] Cross-device profile/preferences and progress analytics
- [ ] Deployment and production configuration

## 📚 Documentation

- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [API Design](docs/API_DESIGN.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [ML Pipeline](docs/ML_PIPELINE.md)
- [Development Guide](docs/DEVELOPMENT_GUIDE.md)

## 🔐 Privacy and Responsible AI

Oracy is designed to support interview practice and self-improvement. Speech and visual metrics should be interpreted as estimates rather than definitive judgments about a candidate.

- Feedback should focus on observable practice performance.
- Visual presentation metrics are estimates and should not be treated as measures of personality, competence, or employability.
- Sensitive data, credentials, and private recordings should be handled carefully.

## ⚠️ Project Status

Oracy is currently in **early development**. The repository structure, documentation, frontend prototype, and initial backend scaffolding are being developed. Resume processing, database integration, and AI analysis pipelines may be incomplete or under active development.

The student flow calls `POST /api/v1/auth/register` and `POST /api/v1/auth/login`; admin sign-in is available at `/admin/login`. Interview session APIs require a bearer token and return only sessions owned by that user. Configure `DATABASE_URL`, `AUTH_SECRET`, `CORS_ALLOWED_ORIGINS`, and frontend `NEXT_PUBLIC_API_BASE_URL`. Run `python -m app.scripts.create_admin` from `backend/` to provision the administrator. The connected changes are in this source package but have not been deployed to the existing live demo.

---

<p align="center">
  <strong>🎙️ Oracy — Practice smarter. Interview better.</strong>
</p>


### Implemented API baseline
- `POST /api/v1/questions/generate`: role-aware question templates using a target role and optional resume-derived skills/projects/experience. Questions are categorized as technical, project, experience, or HR. This is deterministic, not LLM-powered, and does not persist interview sessions.


### Task 8: persisted interview sessions
Interview sessions, questions, answers, completion status, and rule-based evaluation feedback are persisted per authenticated account. See `backend/README.md` for auth endpoints, migrations, admin provisioning, and remaining production security work.
