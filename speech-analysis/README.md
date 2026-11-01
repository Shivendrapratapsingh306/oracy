# speech-analysis

**Status: not implemented.**

Transcription (Whisper), audio features (librosa), and fluency metrics (rate, pauses, fillers, hesitation). Planned subpackages: `transcription/`, `audio_features/`, `fluency_analysis/`, `common/`.

## Rules

- Plain data in, plain data out (schemas from `../shared/schemas`).
- No HTTP or database access; no imports from `backend`.
- Create subpackages (with `__init__.py` and tests) only when real code is added.
- Heavy inference runs in workers, not request handlers (see `../docs/ARCHITECTURE.md`).
