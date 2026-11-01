# ml-engine

**Status: not implemented.**

Resume parsing, question generation, answer evaluation, readiness scoring, and feedback generation. Planned subpackages: `resume_parser/`, `interview_generator/`, `answer_evaluator/`, `readiness_scorer/`, `feedback_generator/`, `common/`.

## Rules

- Plain data in, plain data out (schemas from `../shared/schemas`).
- No HTTP or database access; no imports from `backend`.
- Create subpackages (with `__init__.py` and tests) only when real code is added.
- Heavy inference runs in workers, not request handlers (see `../docs/ARCHITECTURE.md`).
