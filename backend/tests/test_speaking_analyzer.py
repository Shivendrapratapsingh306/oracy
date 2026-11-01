"""Tests for speaking analysis metrics, pauses, silence %, and contextual filler word rules."""
import pytest
from app.services.speaking_analyzer import analyze_speech, detect_filler_words


def test_wpm_calculation_and_categorization() -> None:
    # 120 words spoken in 60 seconds = 120 WPM (optimal)
    words = "word " * 120
    metrics = analyze_speech(words, duration_seconds=60.0)
    assert metrics.word_count == 120
    assert metrics.duration_seconds == 60.0
    assert metrics.speaking_rate_wpm == 120.0
    assert metrics.speaking_rate_category == "optimal"

    # Slow pacing: 40 words in 60 seconds = 40 WPM (< 110 WPM)
    metrics_slow = analyze_speech("word " * 40, duration_seconds=60.0)
    assert metrics_slow.speaking_rate_category == "slow"
    assert metrics_slow.speaking_rate_wpm == 40.0

    # Fast pacing: 200 words in 60 seconds = 200 WPM (> 165 WPM)
    metrics_fast = analyze_speech("word " * 200, duration_seconds=60.0)
    assert metrics_fast.speaking_rate_category == "fast"
    assert metrics_fast.speaking_rate_wpm == 200.0


def test_pause_and_silence_percentage_from_segments() -> None:
    transcript = "I implemented Redis caching. It improved response times significantly."
    # Two segments with a 2.0 second pause between them
    # seg 1: 0.5s to 3.0s, seg 2: 5.0s to 8.0s -> pause gap = 2.0s
    segments = [
        {"id": 0, "start": 0.5, "end": 3.0, "text": "I implemented Redis caching."},
        {"id": 1, "start": 5.0, "end": 8.0, "text": "It improved response times significantly."},
    ]
    metrics = analyze_speech(transcript, duration_seconds=8.0, segments=segments)
    assert metrics.total_pause_duration_seconds == 2.0
    assert metrics.silence_percentage == 25.0  # 2.0 / 8.0 = 25%
    assert len(metrics.limitations) > 0


def test_pure_filler_words_detected() -> None:
    text = "Um, so uh, I think we should, ah, use a relational database, erm, for ACID transactions."
    count, details = detect_filler_words(text)
    assert count >= 4
    words = [d.word for d in details]
    assert "um" in words
    assert "uh" in words
    assert "ah" in words
    assert "erm" in words


def test_contextual_like_distinguishes_functional_from_filler() -> None:
    # Functional 'like': preposition giving examples
    functional_text = (
        "In our backend, we use tools like PostgreSQL and languages like Python and Go. "
        "It acts like a buffer."
    )
    count_func, _ = detect_filler_words(functional_text)
    assert count_func == 0, f"Expected 0 fillers for functional 'like', found {count_func}"

    # Filler 'like': conversational verbal crutch
    filler_text = "And then, like, we had to, like, restart the server because it was like completely hung."
    count_filler, details = detect_filler_words(filler_text)
    assert count_filler >= 2
    assert any(d.word == "like" for d in details)


def test_contextual_actually_distinguishes_factual_from_filler() -> None:
    # Factual usage: stating what actually took place
    factual_text = "The database actually crashed because the disk ran out of space."
    count_fact, _ = detect_filler_words(factual_text)
    assert count_fact == 0, "Factual 'actually' should not be flagged"

    # Filler usage: repeated or opening hesitation
    filler_text = "Actually, um, actually, we didn't check that, and actually we just skipped it."
    count_filler, details = detect_filler_words(filler_text)
    assert count_filler >= 2
    assert any(d.word == "actually" for d in details)


def test_contextual_matlab_distinguishes_meaning_from_filler() -> None:
    # Meaning usage: "iska matlab yeh hai"
    meaning_text = "Iska matlab yeh hai ki latency badh jayegi agar hum cache invalidate nahi karenge."
    count_meaning, _ = detect_filler_words(meaning_text)
    assert count_meaning == 0, "Semantic 'iska matlab' should not be flagged as a filler"

    # Filler particle: English sentence with hesitation particle
    filler_text = "We configured the queue, matlab, to handle concurrent events, matlab, without dropped messages."
    count_filler, details = detect_filler_words(filler_text)
    assert count_filler >= 1
    assert any(d.word == "matlab" for d in details)


def test_contextual_you_know_distinguishes_question_from_crutch() -> None:
    # Question: "Do you know if"
    inquiry_text = "Do you know if the microservice supports gRPC?"
    count_inquiry, _ = detect_filler_words(inquiry_text)
    assert count_inquiry == 0

    # Crutch: ", you know,"
    crutch_text = "We decided to, you know, refactor the code because, you know, technical debt was high."
    count_crutch, details = detect_filler_words(crutch_text)
    assert count_crutch >= 2
    assert any(d.word == "you know" for d in details)


def test_empty_transcript_handled_gracefully() -> None:
    metrics = analyze_speech("", duration_seconds=0.0)
    assert metrics.word_count == 0
    assert metrics.filler_word_count == 0
    assert metrics.speaking_rate_wpm == 0.0
    assert metrics.speaking_rate_category == "unmeasured"

