# vision-engine

**Status: not implemented.**

Pose landmarks, gaze estimation, movement metrics, and framing analysis (OpenCV, MediaPipe). Outputs are estimates with confidence values, not judgments of personality. Planned subpackages: `pose_analysis/`, `gaze_analysis/`, `movement_analysis/`, `framing_analysis/`, `common/`.

## Rules

- Plain data in, plain data out (schemas from `../shared/schemas`).
- No HTTP or database access; no imports from `backend`.
- Create subpackages (with `__init__.py` and tests) only when real code is added.
- Heavy inference runs in workers, not request handlers (see `../docs/ARCHITECTURE.md`).
