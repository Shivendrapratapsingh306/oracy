"""Speaking analysis service for interview recordings.

Measures speaking rate (WPM), pause durations, approximate silence percentage,
and contextual language-aware filler word frequency with documented limitations.
"""
from __future__ import annotations

import re
from app.schemas.speaking_analysis import FillerWordDetail, SpeakingMetrics

# Pure hesitation markers that are almost always fillers in speech
PURE_FILLERS = {"um", "uh", "er", "ah", "erm", "hmm", "uhm"}

# Words that can act as fillers depending on syntactic and conversational context
CONTEXTUAL_FILLERS = {"like", "actually", "basically", "you know", "i mean", "matlab", "literally", "sort of", "kind of"}

LIMITATIONS = [
    "Speaking rate (WPM) measures average word delivery speed; standard conversational pace is 120-160 WPM.",
    "Pause duration and silence percentage are approximations derived from segment gaps and acoustic silences.",
    "Filler word analysis uses contextual syntax checks to avoid flagging valid grammatical usage (e.g. 'languages like Python', 'what actually happened', 'iska matlab').",
    "Results are intended as feedback for self-improvement and should not be used as rigid psychometric indicators.",
]


def _extract_context_snippet(text: str, start: int, end: int, window: int = 30) -> str:
    """Return a short excerpt around the matched word for user review."""
    snippet_start = max(0, start - window)
    snippet_end = min(len(text), end + window)
    prefix = "…" if snippet_start > 0 else ""
    suffix = "…" if snippet_end < len(text) else ""
    return f"{prefix}{text[snippet_start:snippet_end].strip()}{suffix}"


def detect_filler_words(text: str, language: str = "en") -> tuple[int, list[FillerWordDetail]]:
    """Detect filler words using language-aware contextual rules.

    Distinguishes legitimate grammatical / semantic uses:
    - 'like' as preposition/verb ('languages like Python', 'I like Go') vs filler ('it was, like, slow')
    - 'actually' as contrastive adverb ('it actually solved the bug') vs filler hesitation ('Actually, um, actually')
    - 'matlab' as meaning/definition ('iska matlab yeh hai') vs filler particle (', matlab,')
    - 'you know' as factual clause ('do you know if') vs verbal crutch (', you know,')
    """
    if not text or not text.strip():
        return 0, []

    lower_text = text.lower()
    details: dict[str, list[str]] = {}

    # Language-aware filler sets
    if language == "hi":
        target_pure = PURE_FILLERS | PURE_FILLERS_HI
        target_contextual = CONTEXTUAL_FILLERS | CONTEXTUAL_FILLERS_HI
    elif language == "te":
        target_pure = PURE_FILLERS | PURE_FILLERS_TE
        target_contextual = CONTEXTUAL_FILLERS | CONTEXTUAL_FILLERS_TE
    else:
        target_pure = PURE_FILLERS
        target_contextual = CONTEXTUAL_FILLERS

    # 1. Pure hesitation markers
    for filler in target_pure:
        pattern = re.compile(r"\b" + re.escape(filler) + r"\b", re.IGNORECASE)
        for match in pattern.finditer(text):
            details.setdefault(filler.lower(), []).append(
                _extract_context_snippet(text, match.start(), match.end())
            )

    # 1b. Non-Latin script hesitation particles (Devanagari & Telugu)
    script_particles = []
    if language == "hi":
        script_particles = ["उम", "अह", "हं", "अरे", "यानी"]
    elif language == "te":
        script_particles = ["ఆహ్", "ఉమ్", "హాం", "కదా", "ఏంటంటే"]

    for particle in script_particles:
        for match in re.finditer(re.escape(particle), text):
            details.setdefault(particle, []).append(
                _extract_context_snippet(text, match.start(), match.end())
            )

    # 2. 'like' - distinguish preposition/comparison vs verbal filler
    # Preceding triggers that indicate functional/grammatical use:
    # "feel like", "look like", "such as", "tools like", "something like", "would like", "i like"
    functional_like_pre = re.compile(
        r"(?:feel|feels|felt|look|looks|looked|sound|sounds|sounded|seem|seems|seemed|something|more|such|tools|languages|frameworks|libraries|technologies|databases|companies|things|people|i|we|they|would|'d|do\s+you)\s+like\b",
        re.IGNORECASE,
    )
    functional_matches = {m.end() - 4 for m in functional_like_pre.finditer(text)}

    for match in re.finditer(r"\blike\b", text, re.IGNORECASE):
        # If it was preceded by functional marker, it's not a filler
        if match.start() in functional_matches:
            continue

        # Check local context: hesitations around like
        # E.g. ", like,", "was like", "and like", "it's like so", "like um", "like uh"
        start_idx = match.start()
        surrounding = lower_text[max(0, start_idx - 15) : min(len(lower_text), match.end() + 15)]

        is_filler = False
        if re.search(r"(?:was|were|and|just|so|\,)\s+like\b", surrounding):
            is_filler = True
        elif re.search(r"\blike\s+(?:um|uh|you\s+know|\,)", surrounding):
            is_filler = True
        elif start_idx == 0 or lower_text[:start_idx].strip().endswith((",", ".", "-", "?")):
            is_filler = True

        if is_filler:
            details.setdefault("like", []).append(
                _extract_context_snippet(text, match.start(), match.end())
            )

    # 3. 'actually' - distinguish factual contrast vs filler
    # Functional: "did actually", "was actually", "is actually", "actually works", "actually solved"
    # Filler: Overused sentence starters or repeated occurrences
    actually_matches = list(re.finditer(r"\bactually\b", text, re.IGNORECASE))
    if len(actually_matches) > 1:
        # If used multiple times in an answer, later occurrences or consecutive ones are fillers
        for idx, match in enumerate(actually_matches):
            if idx > 0:
                details.setdefault("actually", []).append(
                    _extract_context_snippet(text, match.start(), match.end())
                )
    elif len(actually_matches) == 1:
        match = actually_matches[0]
        # If opening a clause with no prior contrast: ", actually," or starting "Actually, ..."
        surrounding = lower_text[max(0, match.start() - 10) : min(len(lower_text), match.end() + 10)]
        if re.search(r"^\s*actually\s*\,", surrounding) or re.search(r"\,\s*actually\s*\,", surrounding):
            details.setdefault("actually", []).append(
                _extract_context_snippet(text, match.start(), match.end())
            )

    # 4. 'matlab' - Hindi / Hinglish filler vs meaning definition
    # Functional: "iska matlab", "uska matlab", "kya matlab", "matlab yeh ki"
    # Filler: Mid-sentence hesitation particle ("We deployed, matlab, yesterday")
    for match in re.finditer(r"\bmatlab\b|मतलब", text, re.IGNORECASE):
        start = match.start()
        before = lower_text[max(0, start - 15) : start]
        after = lower_text[match.end() : min(len(lower_text), match.end() + 15)]

        is_functional = any(trig in before for trig in ["iska", "uska", "kya", "mera", "tera", "इसका", "उसका", "क्या", "मेरा", "तेरा"]) or any(
            trig in after for trig in ["yeh", "ye", "kya", "hota", "hai"]
        )
        if not is_functional:
            details.setdefault("matlab", []).append(
                _extract_context_snippet(text, match.start(), match.end())
            )

    # 5. 'you know' - factual inquiry vs verbal crutch
    for match in re.finditer(r"\byou\s+know\b", text, re.IGNORECASE):
        start = match.start()
        before = lower_text[max(0, start - 15) : start]
        after = lower_text[match.end() : min(len(lower_text), match.end() + 15)]

        # Functional: "do you know", "as you know", "if you know", "you know what"
        is_functional = any(trig in before for trig in ["do", "did", "as", "if", "don't"]) or any(
            trig in after for trig in ["what", "how", "that", "about", "why", "where"]
        )
        if not is_functional:
            details.setdefault("you know", []).append(
                _extract_context_snippet(text, match.start(), match.end())
            )

    # 6. 'basically' - technical simplification vs verbal crutch
    basically_matches = list(re.finditer(r"\bbasically\b", text, re.IGNORECASE))
    if len(basically_matches) > 1:
        for idx, match in enumerate(basically_matches):
            if idx > 0:
                details.setdefault("basically", []).append(
                    _extract_context_snippet(text, match.start(), match.end())
                )
    elif len(basically_matches) == 1:
        match = basically_matches[0]
        surrounding = lower_text[max(0, match.start() - 10) : min(len(lower_text), match.end() + 10)]
        if re.search(r"^\s*basically\s*\,", surrounding) or re.search(r"\,\s*basically\s*\,", surrounding):
            details.setdefault("basically", []).append(
                _extract_context_snippet(text, match.start(), match.end())
            )

    # 7. 'i mean' - clarification vs hesitation
    for match in re.finditer(r"\bi\s+mean\b", text, re.IGNORECASE):
        start = match.start()
        before = lower_text[max(0, start - 15) : start]
        is_functional = any(trig in before for trig in ["what", "by", "didn't", "don't"])
        if not is_functional:
            details.setdefault("i mean", []).append(
                _extract_context_snippet(text, match.start(), match.end())
            )

    # Compile result details
    total_count = sum(len(snippets) for snippets in details.values())
    detail_list: list[FillerWordDetail] = []
    for word, snippets in sorted(details.items(), key=lambda x: -len(x[1])):
        detail_list.append(
            FillerWordDetail(
                word=word,
                count=len(snippets),
                context_examples=snippets[:3],
                is_filler=True,
                explanation=f"Detected {len(snippets)} occurrence(s) functioning as conversational hesitation.",
            )
        )

    return total_count, detail_list


def analyze_speech(
    transcript: str,
    duration_seconds: float = 0.0,
    segments: list[dict] | None = None,
    pauses_seconds: float | None = None,
    language: str = "en",
) -> SpeakingMetrics:
    """Compute speaking rate (WPM), pause durations, silence %, and filler metrics."""
    words = re.findall(r"\b[\w+#.-]+\b", transcript)
    word_count = len(words)

    # Fallback duration if unmeasured: assume standard ~130 WPM
    effective_duration = duration_seconds
    is_estimated_duration = False
    if effective_duration <= 0.5:
        if word_count > 0:
            effective_duration = round((word_count / 130.0) * 60.0, 1)
            is_estimated_duration = True
        else:
            effective_duration = 0.0

    # Calculate Speaking Rate (WPM)
    if effective_duration > 1.0 and word_count > 0:
        wpm = round((word_count / effective_duration) * 60.0, 1)
    else:
        wpm = 0.0

    # Rate categorization
    if wpm <= 0:
        rate_category = "unmeasured"
    elif wpm < 110:
        rate_category = "slow"
    elif wpm <= 165:
        rate_category = "optimal"
    else:
        rate_category = "fast"

    # Pause duration calculation
    total_pause = 0.0
    if pauses_seconds is not None and pauses_seconds >= 0:
        total_pause = round(pauses_seconds, 2)
    elif segments and len(segments) > 1:
        # Sum gaps between consecutive Whisper segments
        for i in range(len(segments) - 1):
            curr_end = segments[i].get("end", 0.0)
            next_start = segments[i + 1].get("start", 0.0)
            gap = next_start - curr_end
            if gap >= 0.35:  # Significant pause threshold (> 350ms)
                total_pause += gap
        total_pause = round(total_pause, 2)
    elif effective_duration > 0 and word_count > 0:
        # Natural speech pause estimation from punctuation markers (~0.4s comma, ~0.7s period)
        comma_count = transcript.count(",")
        period_count = len(re.findall(r"[.!?]", transcript))
        total_pause = round(min(effective_duration * 0.4, comma_count * 0.35 + period_count * 0.65), 2)

    # Silence percentage
    if effective_duration > 0:
        silence_pct = min(95.0, round((total_pause / effective_duration) * 100.0, 1))
    else:
        silence_pct = 0.0

    # Filler words
    filler_count, filler_details = detect_filler_words(transcript, language=language)

    # Filler frequency per minute
    if effective_duration > 5.0:
        filler_fpm = round((filler_count / effective_duration) * 60.0, 1)
    else:
        filler_fpm = float(filler_count)

    # Construct pacing feedback
    feedback_parts: list[str] = []
    if rate_category == "optimal":
        feedback_parts.append(f"Good conversational pacing at {wpm} WPM (target: 120-160 WPM).")
    elif rate_category == "slow":
        feedback_parts.append(f"Speaking rate was {wpm} WPM, which is deliberate or slow; aim for ~130-150 WPM.")
    elif rate_category == "fast":
        feedback_parts.append(f"Speaking rate was {wpm} WPM; try slowing down slightly to help the interviewer follow your thought process.")

    if silence_pct > 35.0:
        feedback_parts.append(f"Approximate silence was {silence_pct}%; frequent long pauses may indicate hesitation.")
    elif silence_pct < 5.0 and word_count > 30:
        feedback_parts.append("Very few pauses detected; remember to pause between key ideas to let points resonate.")

    if filler_count == 0:
        feedback_parts.append("No common filler words detected in your response.")
    elif filler_count <= 2:
        feedback_parts.append(f"Minimal filler usage ({filler_count} detected) — clean presentation.")
    else:
        feedback_parts.append(f"{filler_count} filler words detected ({filler_fpm} per minute); focus on brief pauses instead of filler sounds.")

    pacing_feedback = " ".join(feedback_parts)

    return SpeakingMetrics(
        duration_seconds=round(effective_duration, 1),
        word_count=word_count,
        speaking_rate_wpm=wpm,
        speaking_rate_category=rate_category,
        total_pause_duration_seconds=total_pause,
        silence_percentage=silence_pct,
        filler_word_count=filler_count,
        filler_word_frequency_per_minute=filler_fpm,
        filler_words=filler_details,
        limitations=LIMITATIONS,
        overall_pacing_feedback=pacing_feedback,
    )

