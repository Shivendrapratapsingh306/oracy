# ML Pipeline

> Design document. No pipeline stage is implemented.

## Stages

1. **Resume parsing** (`ml-engine/resume_parser`): extract text (PDF/DOCX), then use spaCy plus rules to extract skills, experience, education, projects into a structured profile. Output validated against a shared schema. Parsing errors are expected; the user should be able to correct the profile.
2. **Question generation** (`ml-engine/interview_generator`): combine profile, target role, and difficulty. Use an LLM behind an abstraction (`LLMClient` interface, provider chosen by config) with a template/fallback path so the system runs with no external API. Sentence Transformers can help deduplicate and match skills to role requirements.
3. **Adaptive follow-ups**: after each answer, the evaluator flags gaps (vague, missing example, off-topic); the generator produces a follow-up tied to the gap. Cap follow-up depth.
4. **Transcription and speech analysis** (`speech-analysis`): Whisper produces the transcript with timestamps; librosa and timestamps give speaking rate, pause counts and durations, filler-word counts, hesitation markers, and simple fluency indicators.
5. **Vision analysis** (`vision-engine`): MediaPipe/OpenCV on sampled frames: pose landmarks (posture), gaze direction estimate, movement magnitude, face framing in camera. Each metric carries a confidence value and is skipped when detection quality is low.
6. **Answer evaluation** (`ml-engine/answer_evaluator`): relevance (embedding similarity to question plus LLM/rubric judgment), structure (e.g., STAR-style signals), grammar (rule-based or model-based checks), completeness (coverage of expected points).
7. **Readiness scoring** (`ml-engine/readiness_scorer`): scikit-learn models and/or a transparent weighted aggregation over four components: technical knowledge, answer quality, communication, presentation.
8. **Feedback generation** (`ml-engine/feedback_generator`): turn component evidence into prioritized, specific recommendations.

## Explainable, configurable scoring

- Each component score lists its inputs and evidence (e.g., "filler rate 6/min", "missed key points: X, Y").
- Weights and thresholds live in a versioned config file, not in code. **No weights are validated yet; initial values must be labeled placeholders** until justified by data or expert review.
- Learned models (scikit-learn) require labeled data we do not have; until then, use rule-based scoring and document that clearly. Report `config_version` and `model_version` with every score.
- Presentation metrics (vision) should have low default influence and be presented as estimates; lighting, camera angle, culture, and disability affect them. They must not be used as claims about personality or employability.

## Interfaces

Each engine module exposes pure functions/classes taking and returning plain data (Pydantic or dataclasses defined in `shared/schemas`), with no HTTP or DB access, so they can be unit-tested with fixtures.

## Evaluation and testing

- Unit tests with small synthetic fixtures; no real user media in the repo.
- Keep a held-out, consented evaluation set (stored outside Git) to check parsing accuracy, transcription WER, and scoring consistency.
- Track model/version in outputs for reproducibility.

## Execution model

See ARCHITECTURE.md: heavy stages (4, 5, embeddings) run in workers; text-only stages may run synchronously at first.
