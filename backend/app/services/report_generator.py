"""Interview performance report generation, explainable scoring, and progress tracking."""
from __future__ import annotations

from datetime import datetime
from collections import Counter
from app.models import InterviewSession, Question, Answer
from app.schemas.reports import (
    InterviewReport,
    ProgressAnalytics,
    ReportQuestionDetail,
    ScoreTrendPoint,
    ScoringBreakdown,
    ScoringComponent,
    SpeakingSummary,
    SpeakingTrends,
    VisualSummary,
)
from app.schemas.evaluation import EvaluationDimension
from app.schemas.speaking_analysis import SpeakingMetrics


def _compute_speaking_score(avg_wpm: float, avg_silence: float, filler_fpm: float) -> int:
    """Calculate normalized communication score (0-100) from delivery metrics."""
    score = 100.0
    # WPM penalty (target: 120-160 WPM)
    if avg_wpm < 110:
        score -= min(30.0, (110 - avg_wpm) * 0.6)
    elif avg_wpm > 170:
        score -= min(25.0, (avg_wpm - 170) * 0.5)

    # Silence % penalty (target: 10-30%)
    if avg_silence > 35.0:
        score -= min(25.0, (avg_silence - 35.0) * 0.8)

    # Filler words per minute penalty (target: <= 2.0 / min)
    if filler_fpm > 2.0:
        score -= min(25.0, (filler_fpm - 2.0) * 4.0)

    return max(35, min(100, round(score)))


def generate_interview_report(session: InterviewSession) -> InterviewReport:
    """Generate an explainable, multi-dimensional report for an interview session."""
    questions = sorted(session.questions, key=lambda q: q.position)
    question_count = len(questions)

    attempted_count = 0
    content_scores: list[int] = []
    dimension_accum: dict[str, list[int]] = {
        "relevance": [],
        "technical_correctness": [],
        "completeness": [],
        "clarity": [],
        "use_of_examples": [],
        "structure": [],
    }
    all_strengths: list[str] = []
    all_improvements: list[str] = []
    all_missing_concepts: list[str] = []
    question_details: list[ReportQuestionDetail] = []

    speaking_metrics_list: list[SpeakingMetrics] = []
    visual_metrics_list: list[dict] = []

    for q in questions:
        ans: Answer | None = q.answers[0] if q.answers else None
        has_text = bool(ans and ans.transcript and ans.transcript.strip())
        feedback: dict = ans.evaluation_feedback or {} if ans else {}

        if has_text:
            attempted_count += 1
            if ans.evaluation_score is not None:
                content_scores.append(ans.evaluation_score)

        # Extract speaking metrics if recorded
        sp_data = feedback.get("speaking_metrics")
        parsed_sp = SpeakingMetrics(**sp_data) if sp_data else None
        if parsed_sp and parsed_sp.word_count > 0:
            speaking_metrics_list.append(parsed_sp)

        # Extract visual metrics if recorded
        vis_data = feedback.get("visual_metrics")
        if vis_data:
            visual_metrics_list.append(vis_data)

        # Extract dimensions
        def _get_dim(name: str) -> EvaluationDimension | None:
            raw = feedback.get(name)
            if isinstance(raw, dict) and "score" in raw:
                score_val = int(raw["score"])
                dimension_accum[name].append(score_val)
                return EvaluationDimension(score=score_val, feedback=str(raw.get("feedback", "")))
            return None

        rel_dim = _get_dim("relevance")
        tech_dim = _get_dim("technical_correctness")
        comp_dim = _get_dim("completeness")
        clar_dim = _get_dim("clarity")
        ex_dim = _get_dim("use_of_examples")
        struct_dim = _get_dim("structure")

        q_strengths = feedback.get("strengths") or []
        q_improvements = feedback.get("improvements") or []
        q_missing = feedback.get("missing_concepts") or []
        q_suggestion = feedback.get("better_answer_suggestion")

        all_strengths.extend(q_strengths)
        all_improvements.extend(q_improvements)
        all_missing_concepts.extend(q_missing)

        question_details.append(
            ReportQuestionDetail(
                question_id=str(q.id),
                position=q.position,
                category=q.category or "technical",
                question_text=q.text,
                rationale=q.rationale,
                answer_text=ans.transcript if ans and ans.transcript else "",
                is_answered=has_text,
                overall_score=ans.evaluation_score if ans else None,
                relevance=rel_dim,
                technical_correctness=tech_dim,
                completeness=comp_dim,
                clarity=clar_dim,
                use_of_examples=ex_dim,
                structure=struct_dim,
                strengths=q_strengths,
                improvements=q_improvements,
                missing_concepts=q_missing,
                better_answer_suggestion=q_suggestion,
                speaking_metrics=parsed_sp,
            )
        )

    # 1. Speaking Summary
    if speaking_metrics_list:
        avg_wpm = round(sum(m.speaking_rate_wpm for m in speaking_metrics_list) / len(speaking_metrics_list), 1)
        avg_silence = round(sum(m.silence_percentage for m in speaking_metrics_list) / len(speaking_metrics_list), 1)
        total_fillers = sum(m.filler_word_count for m in speaking_metrics_list)
        total_dur = sum(m.duration_seconds for m in speaking_metrics_list)
        avg_fpm = round((total_fillers / max(1.0, total_dur)) * 60.0, 1)

        pacing_cat = "optimal" if 110 <= avg_wpm <= 165 else ("slow" if avg_wpm < 110 else "fast")
        speaking_score = _compute_speaking_score(avg_wpm, avg_silence, avg_fpm)
        speaking_feedback = (
            f"Average pace of {avg_wpm} WPM with {avg_silence}% pause ratio. "
            f"{total_fillers} total filler word(s) detected across audio answers."
        )
        speaking_summary = SpeakingSummary(
            measured=True,
            average_wpm=avg_wpm,
            average_silence_percentage=avg_silence,
            total_filler_count=total_fillers,
            filler_frequency_per_minute=avg_fpm,
            pacing_category=pacing_cat,
            feedback=speaking_feedback,
            limitations=[
                "Speaking rate (WPM) measures average delivery speed; conversational baseline is 120-160 WPM.",
                "Silence percentage is estimated from inter-segment pauses and silence threshold energy.",
            ],
        )
    else:
        speaking_score = None
        speaking_summary = SpeakingSummary(
            measured=False,
            feedback="Audio recording was not utilized for this session; speaking pacing metrics unavailable.",
            limitations=["No audio data captured; score is based on written answer quality."],
        )

    # 2. Visual Summary
    if visual_metrics_list:
        avg_center = round(sum(v.get("center_pct", 85) for v in visual_metrics_list) / len(visual_metrics_list), 1)
        avg_posture = round(sum(v.get("posture_pct", 85) for v in visual_metrics_list) / len(visual_metrics_list), 1)
        visual_score = round((avg_center + avg_posture) / 2)
        visual_summary = VisualSummary(
            measured=True,
            face_centering_score=avg_center,
            posture_alignment_score=avg_posture,
            feedback=f"Face was centered {avg_center}% of frames; upright posture maintained {avg_posture}% of frames.",
            limitations=["Visual presentation scores are estimates based on camera frame-by-frame landmarks."],
        )
    else:
        visual_score = None
        visual_summary = VisualSummary(
            measured=False,
            feedback="Camera visual analysis was off or not enabled during this session.",
            limitations=["Visual presentation was not recorded."],
        )

    # 3. Documented Dynamic Composite Scoring
    is_completed = session.status == "completed" and attempted_count > 0
    content_avg = round(sum(content_scores) / len(content_scores)) if content_scores else None

    components: list[ScoringComponent] = []

    # Component 1: Answer Content Quality
    components.append(
        ScoringComponent(
            name="Answer Quality & Technical Depth",
            score=content_avg,
            weight=0.70 if speaking_score is not None else 1.00,
            status="measured" if content_avg is not None else "incomplete",
            explanation="Evaluates 6 dimensions: relevance, technical correctness, completeness, clarity, examples, and structure.",
        )
    )

    # Component 2: Speech & Delivery
    components.append(
        ScoringComponent(
            name="Communication & Speaking Delivery",
            score=speaking_score,
            weight=0.30 if speaking_score is not None else 0.0,
            status="measured" if speaking_score is not None else "unmeasured",
            explanation="Pacing (WPM), silence ratio, and filler word control from microphone audio. Unavailable if not recorded.",
        )
    )

    # Component 3: Visual Presentation
    components.append(
        ScoringComponent(
            name="Visual Presentation & Framing",
            score=visual_score,
            weight=0.15 if visual_score is not None else 0.0,
            status="measured" if visual_score is not None else "unmeasured",
            explanation="Face centering and upright sitting posture from camera feed. Unavailable if camera is disabled.",
        )
    )

    if not is_completed:
        overall_score = None
        method_name = "Session Incomplete / In Progress"
        method_doc = (
            "This interview session is marked as in-progress or interrupted. "
            "Scores are not fabricated for unattempted questions; the session can be resumed anytime."
        )
    else:
        # Calculate dynamic composite based strictly on available evidence
        if content_avg is not None and speaking_score is not None and visual_score is not None:
            overall_score = round(content_avg * 0.60 + speaking_score * 0.25 + visual_score * 0.15)
            method_name = "Multi-Modal Composite (60% Content + 25% Speech + 15% Visual)"
            method_doc = "Weighted composite combining answer technical depth (60%), speech pacing (25%), and visual presentation (15%)."
        elif content_avg is not None and speaking_score is not None:
            overall_score = round(content_avg * 0.70 + speaking_score * 0.30)
            method_name = "Content & Speech Composite (70% Content + 30% Speech)"
            method_doc = "Weighted composite combining technical answer quality (70%) and spoken delivery pacing (30%). Visual metrics were not recorded."
        elif content_avg is not None:
            overall_score = content_avg
            method_name = "Answer Content & Structure (100% Content)"
            method_doc = "Evaluated entirely from candidate's written responses across 6 core technical dimensions. Audio and camera were not recorded."
        else:
            overall_score = None
            method_name = "Awaiting Evaluation"
            method_doc = "Answers have not yet been evaluated."

    scoring_breakdown = ScoringBreakdown(
        overall_score=overall_score,
        scoring_method=method_name,
        method_documentation=method_doc,
        components=components,
        is_incomplete=not is_completed,
    )

    # Extract distinct recommendations
    dedup_strengths = list(dict.fromkeys(all_strengths))[:4]
    dedup_improvements = list(dict.fromkeys(all_improvements))[:4]
    dedup_missing = list(dict.fromkeys(all_missing_concepts))[:4]

    recommendations: list[str] = []
    if dedup_improvements:
        recommendations.append(f"Focus on: {dedup_improvements[0]}")
    if dedup_missing:
        recommendations.append(f"Incorporate key domain concepts such as: {', '.join(dedup_missing[:2])}")
    if speaking_summary.measured and speaking_summary.pacing_category != "optimal":
        recommendations.append(f"Adjust speaking pace toward 130-150 WPM (currently {speaking_summary.average_wpm} WPM).")
    if not recommendations:
        recommendations.append("Continue regular mock interviews and focus on citing concrete metrics and project trade-offs.")

    # Repeated difficulty areas
    difficulties: list[str] = []
    for dim_name, scores in dimension_accum.items():
        if scores and (sum(scores) / len(scores)) < 68:
            label = dim_name.replace("_", " ").title()
            difficulties.append(f"{label} (average score {round(sum(scores)/len(scores))}/100)")

    return InterviewReport(
        session_id=str(session.id),
        target_role=session.target_role,
        experience_level=session.experience_level or "mid",
        interview_type=session.interview_type or "mixed",
        difficulty=session.difficulty or "medium",
        status="completed" if is_completed else "in_progress",
        created_at=session.created_at,
        completed_at=session.completed_at,
        question_count=question_count,
        attempted_count=attempted_count,
        scoring=scoring_breakdown,
        speaking=speaking_summary,
        visual=visual_summary,
        strengths=dedup_strengths or ["Answer submitted for review."],
        areas_for_improvement=dedup_improvements or ["Continue refining structured communication."],
        actionable_recommendations=recommendations,
        repeated_difficulty_areas=difficulties,
        questions=question_details,
    )


def compute_progress_analytics(sessions: list[InterviewSession]) -> ProgressAnalytics:
    """Compute longitudinal progress, trends, and focus areas across authentic user sessions."""
    total_sessions = len(sessions)
    completed = [s for s in sessions if s.status == "completed"]
    in_progress = [s for s in sessions if s.status != "completed"]

    # Sort chronological
    completed_sorted = sorted(completed, key=lambda s: s.created_at)

    if not completed:
        return ProgressAnalytics(
            total_sessions=total_sessions,
            completed_sessions=0,
            in_progress_sessions=len(in_progress),
            overall_average_score=None,
            has_sufficient_data=False,
            data_summary_note="No completed interview sessions yet. Complete your first practice interview to begin tracking performance.",
            score_trend=[],
            dimension_averages={},
            speaking_trends=SpeakingTrends(measured_sessions_count=0),
            strongest_areas=[],
            areas_requiring_practice=[],
            repeated_difficulty_tags=[],
        )

    # Compile scores and dimensions across real completed sessions
    reports = [generate_interview_report(s) for s in completed_sorted]

    score_points: list[ScoreTrendPoint] = []
    dim_totals: dict[str, list[int]] = {
        "Relevance": [],
        "Technical Correctness": [],
        "Completeness": [],
        "Clarity": [],
        "Use of Examples": [],
        "Structure": [],
    }
    wpm_list: list[float] = []
    filler_rate_list: list[float] = []
    silence_list: list[float] = []
    difficulty_counter: Counter[str] = Counter()

    for r in reports:
        if r.scoring.overall_score is not None:
            date_str = r.created_at.strftime("%b %d")
            score_points.append(
                ScoreTrendPoint(
                    session_id=r.session_id,
                    date=date_str,
                    target_role=r.target_role,
                    score=r.scoring.overall_score,
                    question_count=r.question_count,
                )
            )

        # Collect dimension scores from questions
        for q in r.questions:
            if q.relevance:
                dim_totals["Relevance"].append(q.relevance.score)
            if q.technical_correctness:
                dim_totals["Technical Correctness"].append(q.technical_correctness.score)
            if q.completeness:
                dim_totals["Completeness"].append(q.completeness.score)
            if q.clarity:
                dim_totals["Clarity"].append(q.clarity.score)
            if q.use_of_examples:
                dim_totals["Use of Examples"].append(q.use_of_examples.score)
            if q.structure:
                dim_totals["Structure"].append(q.structure.score)

        if r.speaking.measured and r.speaking.average_wpm:
            wpm_list.append(r.speaking.average_wpm)
            if r.speaking.filler_frequency_per_minute is not None:
                filler_rate_list.append(r.speaking.filler_frequency_per_minute)
            if r.speaking.average_silence_percentage is not None:
                silence_list.append(r.speaking.average_silence_percentage)

        for diff in r.repeated_difficulty_areas:
            tag = diff.split(" (")[0]
            difficulty_counter[tag] += 1

    overall_avg = round(sum(p.score for p in score_points) / len(score_points)) if score_points else None

    # Calculate dimension averages
    dim_averages: dict[str, int] = {}
    for dim_name, scores in dim_totals.items():
        if scores:
            dim_averages[dim_name] = round(sum(scores) / len(scores))

    # Rank strongest and practice areas
    sorted_dims = sorted(dim_averages.items(), key=lambda x: x[1], reverse=True)
    strongest = [f"{name} ({score}%)" for name, score in sorted_dims[:2] if score >= 70]
    weakest = [f"{name} ({score}%)" for name, score in sorted_dims[-2:] if score < 75]

    has_trend_data = len(completed_sorted) >= 2
    summary_note = (
        f"Tracking progress across {len(completed_sorted)} completed interview session(s)."
        if has_trend_data
        else "One interview completed. Complete a second interview to see multi-session progress trends."
    )

    speaking_trends = SpeakingTrends(
        measured_sessions_count=len(wpm_list),
        wpm_trend=wpm_list,
        filler_rate_trend=filler_rate_list,
        silence_trend=silence_list,
    )

    return ProgressAnalytics(
        total_sessions=total_sessions,
        completed_sessions=len(completed),
        in_progress_sessions=len(in_progress),
        overall_average_score=overall_avg,
        has_sufficient_data=has_trend_data,
        data_summary_note=summary_note,
        score_trend=score_points,
        dimension_averages=dim_averages,
        speaking_trends=speaking_trends,
        strongest_areas=strongest,
        areas_requiring_practice=weakest,
        repeated_difficulty_tags=[tag for tag, _ in difficulty_counter.most_common(3)],
    )

