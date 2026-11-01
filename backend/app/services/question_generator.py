"""Question generator service.

Supports dynamic AI-powered question generation when an LLM provider is configured,
with a robust, deterministic, transparent template-based fallback.
"""
from __future__ import annotations

import logging
from typing import Literal

from app.schemas.questions import (
    DifficultyLevel,
    ExperienceLevel,
    InterviewQuestion,
    InterviewType,
    QuestionCategory,
    QuestionGenerationRequest,
)
from app.services.llm_client import LLMError, get_configured_llm_client

logger = logging.getLogger(__name__)
HI_TRANSLATIONS = {
    "How would you manage state in a complex": "एक जटिल {role} एप्लिकेशन में आप स्टेट मैनेजमेंट कैसे करेंगे, और लोकल तथा शेयर्ड स्टेट के बीच चयन कैसे करेंगे?",
    "How do you improve web performance": "आप वेब प्रदर्शन को कैसे बेहतर बनाते हैं और एक {role} एप्लिकेशन में धीमी गति वाले पेज की जांच कैसे करते हैं?",
    "How would you make a UI accessible": "आप विभिन्न ब्राउज़रों में यूआई को सुलभ (accessible), उत्तरदायी (responsive) और विश्वसनीय कैसे बनाएंगे?",
    "How would you design a reliable REST API": "एक {role} सिस्टम के लिए एक विश्वसनीय REST API आप कैसे डिज़ाइन करेंगे?",
    "Explain how you would handle database migrations": "उच्च-उपयोगिता वाले डेटाबेस में बिना डाउनटाइम के स्कीमा माइग्रेशन को आप कैसे संभालते हैं?",
    "How would you secure sensitive user data": "आप संवेदनशील उपयोगकर्ता डेटा को ट्रांजिट और रेस्ट में कैसे सुरक्षित रखेंगे?",
    "How would you troubleshoot a slow SQL query": "उत्पादन डेटाबेस में एक धीमी SQL क्वेरी का आप निवारण कैसे करेंगे?",
    "Why are you interested in the": "आप {role} भूमिका में रुचि क्यों रखते हैं, और आप टीम में क्या प्रमुख ताकतें लाएंगे?",
    "Describe a time you received critical feedback": "उस समय का वर्णन करें जब आपको आलोचनात्मक प्रतिक्रिया मिली थी। आपने उसके बाद क्या बदलाव किया?",
    "Tell me about a disagreement in a team": "एक टीम में असहमति और आपने व्यावहारिक समाधान की दिशा में कैसे काम किया, इसके बारे में बताएं।",
    "What is one technical skill you are actively improving": "वह कौन सा तकनीकी कौशल है जिसे आप सक्रिय रूप से सुधार रहे हैं, और आप प्रगति को कैसे मापते हैं?",
    "Choose one project you are proud of": "एक ऐसी परियोजना चुनें जिस पर आपको गर्व है। समस्या, वास्तुकला, आपका योगदान और आपने सफलता कैसे मापी, इसकी व्याख्या करें।",
}

TE_TRANSLATIONS = {
    "How would you manage state in a complex": "ఒక కాంప్లెక్స్ {role} అప్లికేషన్‌లో మీరు స్టేట్ మేనేజ్‌మెంట్‌ను ఎలా నిర్వహిస్తారు, మరియు లోకల్ వర్సెస్ షేర్డ్ స్టేట్‌ను ఎలా ఎంచుకుంటారు?",
    "How do you improve web performance": "మీరు వెబ్ పనితీరును ఎలా మెరుగుపరుస్తారు మరియు నెమ్మదిగా ఉన్న పేజీని ఎలా పరిశోధిస్తారు?",
    "How would you make a UI accessible": "వివిధ బ్రౌజర్లలో UI ని యాక్సెస్ చేయగల, రెస్పాన్సివ్ మరియు నమ్మదగినదిగా ఎలా రూపొందిస్తారు?",
    "How would you design a reliable REST API": "ఒక {role} సిస్టమ్ కోసం నమ్మదగిన REST API ని మీరు ఎలా డిజైన్ చేస్తారు?",
    "Explain how you would handle database migrations": "డౌన్‌టైమ్ లేకుండా డేటాబేస్ స్కీమా మైగ్రేషన్‌లను మీరు ఎలా నిర్వహిస్తారు?",
    "How would you secure sensitive user data": "ట్రాన్సిట్ మరియు రెస్ట్‌లో సున్నితమైన వినియోగదారు డేటాను మీరు ఎలా సురక్షితం చేస్తారు?",
    "How would you troubleshoot a slow SQL query": "ఉత్పత్తి డేటాబేస్‌లో నెమ్మదిగా నడుస్తున్న SQL ప్రశ్నను మీరు ఎలా డీబగ్ చేస్తారు?",
    "Why are you interested in the": "మీరు {role} పాత్రలో ఎందుకు ఆసక్తి చూపుతున్నారు, మరియు మీ బలాలు ఏమిటి?",
    "Describe a time you received critical feedback": "మీకు విమర్శనాత్మక ఫీడ్‌బ్యాక్ వచ్చిన సందర్భాన్ని వివరించండి. ఆ తర్వాత మీరు ఏమి మార్చుకున్నారు?",
    "Tell me about a disagreement in a team": "జట్టులో భిన్నాభిప్రాయం ఏర్పడినప్పుడు మీరు ఆచరణాత్మక పరిష్కారం కోసం ఎలా పనిచేశారో చెప్పండి.",
    "What is one technical skill you are actively improving": "మీరు చురుకుగా మెరుగుపరుచుకుంటున్న ఒక సాంకేతిక నైపుణ్యం ఏమిటి, మరియు పురోగతిని ఎలా కొలుస్తారు?",
    "Choose one project you are proud of": "మీకు గర్వకారణమైన ఒక ప్రాజెక్ట్‌ను ఎంచుకోండి. సమస్య, ఆర్కిటెక్చర్, మీ సహకారం మరియు విజయాన్ని ఎలా కొలిచారో వివరించండి.",
}



def _role_family(target_role: str) -> str:
    role = target_role.casefold()
    if any(term in role for term in ("full stack", "fullstack", "full-stack")):
        return "fullstack"
    if any(term in role for term in ("frontend", "front-end", "ui", "react", "vue", "web developer")):
        return "frontend"
    if any(term in role for term in ("backend", "back-end", "api", "server", "distributed")):
        return "backend"
    if any(term in role for term in ("machine learning", "ml engineer", "ai engineer", "deep learning")):
        return "ml"
    if any(term in role for term in ("data scientist", "data analyst", "analytics", "business analyst")):
        return "data"
    if any(term in role for term in ("devops", "site reliability", "sre", "cloud engineer", "infrastructure", "platform")):
        return "devops"
    return "general"


def _build_template_candidates(
    role: str,
    family: str,
    level: ExperienceLevel,
    difficulty: DifficultyLevel,
    interview_type: InterviewType,
    skills: list[str],
    projects: list[str],
    experiences: list[str],
) -> list[tuple[QuestionCategory, str, str]]:
    """Build a rich, categorized pool of candidate questions tailored to role, level, and difficulty."""
    candidates: list[tuple[QuestionCategory, str, str]] = []

    # 1. Technical & Role-Specific Questions
    if interview_type in ("technical", "mixed"):
        technical_templates: dict[str, list[tuple[str, str]]] = {
            "frontend": [
                (
                    "How would you manage state in a complex {role} application, and how would you choose between local and shared state?",
                    "Evaluates architectural clarity and state management discipline.",
                ),
                (
                    "How do you improve web performance and investigate a slow page in a {role} application?",
                    "Checks practical performance profiling and frontend optimization skills.",
                ),
                (
                    "How would you make a UI accessible, responsive, and reliable across browsers?",
                    "Tests accessibility standards, component design, and responsive principles.",
                ),
                (
                    "How would you test a reusable component and prevent regressions in a large frontend codebase?",
                    "Checks component testing, regression prevention, and reliability.",
                ),
                (
                    "When would you choose server-side rendering over client-side rendering, and what trade-offs matter?",
                    "Examines rendering patterns, SEO considerations, and caching strategies.",
                ),
            ],
            "backend": [
                (
                    "How would you design a reliable REST API for a feature in a {role} system?",
                    "Checks API design, idempotency, and contract design principles.",
                ),
                (
                    "How would you investigate a slow database-backed endpoint and decide which indexes or caching to add?",
                    "Tests debugging, query analysis, indexing strategy, and database internals.",
                ),
                (
                    "How would you handle authentication, authorization, validation, and rate limiting in a production API?",
                    "Evaluates security fundamentals and auth architectures.",
                ),
                (
                    "How would you make a background job safe to retry when a request or worker fails?",
                    "Checks message queues, retry strategies, dead-letter queues, and at-least-once delivery handling.",
                ),
                (
                    "How would you design pagination and error responses for a public API used by multiple clients?",
                    "Tests operational maturity and backward-compatible schema migration strategies.",
                ),
            ],
            "fullstack": [
                (
                    "How would you design a reliable REST API and connect it efficiently to a modern frontend application?",
                    "Evaluates full-stack integration, schema sharing, and contract testing.",
                ),
                (
                    "Walk me through how you architect optimistic UI updates while handling network errors and race conditions cleanly.",
                    "Checks frontend-backend synchronization and UX error resilience.",
                ),
                (
                    "How do you decide where business logic belongs—on the client, server, or database layer—and what security implications guide that decision?",
                    "Tests architectural judgment and security posture across the entire stack.",
                ),
                (
                    "How do you set up CI/CD, preview environments, and integration testing across a full-stack codebase?",
                    "Checks developer workflow and end-to-end testing practices.",
                ),
                (
                    "How would you design authentication and secure cookie handling across a full-stack system?",
                    "Checks end-to-end authentication and token security.",
                ),
            ],
            "ml": [
                (
                    "How would you build a reproducible ML pipeline for a {role} use case, from data validation to evaluation?",
                    "Evaluates ML engineering workflow, reproducibility, and versioning.",
                ),
                (
                    "How would you detect data leakage and choose metrics for an imbalanced prediction problem?",
                    "Checks core machine learning rigorousness and metric selection.",
                ),
                (
                    "How would you monitor model drift and decide when a model needs retraining?",
                    "Tests post-deployment monitoring and model retraining strategies.",
                ),
                (
                    "How would you compare a simple baseline against a more complex model before shipping it?",
                    "Checks validation methodology and baseline benchmarking.",
                ),
                (
                    "How would you explain a model's limitations to a non-technical stakeholder?",
                    "Tests communication and responsible AI practices.",
                ),
            ],
            "data": [
                (
                    "How would you validate data quality before creating a report for a {role} stakeholder?",
                    "Checks data validation, anomaly detection, and data governance.",
                ),
                (
                    "Explain how you would use SQL to find a trend and check whether it is statistically meaningful.",
                    "Tests query complexity, analytical depth, and data transformations.",
                ),
                (
                    "How would you choose metrics and visualizations for a dashboard used by a {role} team?",
                    "Tests data presentation, KPI selection, and dashboard clarity.",
                ),
                (
                    "How would you investigate a sudden change in a key business metric and rule out tracking errors?",
                    "Tests investigative methodology and metric instrumentation.",
                ),
                (
                    "How would you communicate an analysis when the data is incomplete or ambiguous?",
                    "Evaluates technical communication and handling ambiguity.",
                ),
            ],
            "devops": [
                (
                    "How would you design a CI/CD pipeline with safe rollbacks for a {role} service?",
                    "Tests deployment safety, progressive delivery, and rollback automation.",
                ),
                (
                    "A service's latency suddenly increases after deployment. How would you diagnose it?",
                    "Evaluates incident command, distributed tracing, and root cause diagnosis.",
                ),
                (
                    "How would you manage secrets, monitoring, and least-privilege access in a cloud environment?",
                    "Checks cloud security hygiene and compliance automation.",
                ),
                (
                    "How would you define useful service-level indicators and alerts without creating alert fatigue?",
                    "Tests reliability engineering and alerting philosophy.",
                ),
                (
                    "How would you reduce deployment risk for a service with strict availability requirements?",
                    "Tests deployment risk mitigation and high-availability patterns.",
                ),
            ],
            "general": [
                (
                    "What core technical concepts are most important for a {role}, and how have you applied them?",
                    "Evaluates computer science fundamentals and foundational knowledge.",
                ),
                (
                    "How would you debug a production issue in a system you did not build?",
                    "Tests systematic problem-solving and observability skills.",
                ),
                (
                    "How would you balance code quality, delivery speed, testing, and maintainability in a {role} project?",
                    "Checks engineering maturity, code quality standards, and prioritization.",
                ),
                (
                    "How do you decide what to log, and how would you use logs to narrow down an intermittent bug?",
                    "Tests logging strategy and debugging acumen.",
                ),
                (
                    "How would you review a teammate's code when you disagree with the chosen approach?",
                    "Checks code review standards, constructive collaboration, and mentorship.",
                ),
            ],
        }

        # Select role family templates
        pool = technical_templates.get(family, technical_templates["general"])
        for text_template, rationale in pool:
            candidates.append(("technical", text_template.format(role=role), rationale))

        # Core CS / Problem Solving based on difficulty & level
        if difficulty == "hard" or level == "senior":
            candidates.append((
                "technical",
                f"How would you design a distributed rate limiter or caching tier to handle high traffic with low latency for a {role} system?",
                "Assesses high-scale system design, concurrency primitives, and partitioning trade-offs.",
            ))
            candidates.append((
                "technical",
                "Describe a situation where a memory leak or CPU spike occurred. What profiling tools did you use to isolate the root cause?",
                "Tests deep systems profiling and runtime performance debugging.",
            ))
        elif difficulty == "easy" or level == "entry":
            candidates.append((
                "technical",
                "Explain the time and space complexity (Big-O) of hash tables vs. balanced binary search trees, and when you would choose each in a project.",
                "Tests foundational data structures and complexity analysis.",
            ))
            candidates.append((
                "technical",
                "What is the difference between synchronous and asynchronous execution, and how does the event loop or threading model handle concurrent operations?",
                "Tests understanding of concurrency and runtime execution models.",
            ))
        else:
            candidates.append((
                "technical",
                "Walk through how you design database indices for complex multi-column filter queries, and explain when an index might degrade performance.",
                "Tests database indexing fundamentals and performance trade-offs.",
            ))

        # Skill-specific questions from parsed resume
        for skill in skills[:3]:
            candidates.append((
                "technical",
                f"Your resume lists {skill}. Explain a challenging problem where you used it, the trade-offs you considered, and how you verified the result.",
                f"Connects the listed skill ({skill}) to practical evidence.",
            ))

        # Project-specific questions from parsed resume
        if projects:
            for proj in projects[:2]:
                candidates.append((
                    "project",
                    f"Walk me through the architecture of '{proj}', your personal contribution, and one important design decision.",
                    "Checks project ownership, architecture, and decision-making.",
                ))
                candidates.append((
                    "project",
                    f"What was the hardest bug or limitation in '{proj}', how did you investigate it, and what would you improve now?",
                    "Checks debugging, reflection, and ability to explain impact.",
                ))
        # Always provide fallback project questions so there are plenty of options
        candidates.extend([
            (
                "project",
                "Choose one project you are proud of. Explain the problem, architecture, your contribution, and how you measured success.",
                "Checks end-to-end project ownership.",
            ),
            (
                "project",
                "If your project had to support ten times more users, what would you change first and why?",
                "Checks scalability thinking and prioritization.",
            ),
            (
                "project",
                "What alternatives did you consider for a major project decision, and why did you choose your final approach?",
                "Checks trade-off analysis.",
            ),
        ])

        # Experience-specific questions
        if experiences:
            candidates.append((
                "experience",
                f"Your resume mentions '{experiences[0]}'. What was your responsibility, how did you collaborate, and what measurable outcome did you deliver?",
                "Asks for evidence of contribution and impact from the resume.",
            ))
        candidates.extend([
            (
                "experience",
                "Tell me about a time you had to learn an unfamiliar tool or concept quickly to complete a task.",
                "Checks learning agility and execution.",
            ),
            (
                "experience",
                "Describe a task that did not go as planned. How did you communicate the issue and recover?",
                "Checks accountability and problem-solving.",
            ),
            (
                "experience",
                "Tell me about a time you improved a process, even in a small way.",
                "Checks initiative and impact.",
            ),
        ])

    # 2. Behavioral & HR Questions
    if interview_type in ("hr", "mixed"):
        candidates.extend([
            (
                "hr",
                f"Why are you interested in the {role} role, and what strengths would you bring to the team?",
                "Checks motivation and role alignment.",
            ),
            (
                "hr",
                "Describe a time you received critical feedback. What did you change afterward?",
                "Checks self-awareness and response to feedback.",
            ),
            (
                "hr",
                "Tell me about a disagreement in a team and how you worked toward a practical resolution.",
                "Checks communication and collaboration.",
            ),
            (
                "hr",
                "What is one technical skill you are actively improving, and how are you measuring progress?",
                "Checks growth mindset and concrete planning.",
            ),
            (
                "hr",
                "How do you prioritize competing deadlines when unexpected urgent requests arise?",
                "Tests time management, prioritization under pressure, and composure.",
            ),
        ])
        if level == "senior":
            candidates.append((
                "hr",
                "Describe a time you mentored a junior engineer or guided a team through a significant architectural migration.",
                "Checks technical leadership, mentorship, and team elevation.",
            ))

    return candidates


def generate_template_questions(payload: QuestionGenerationRequest) -> list[InterviewQuestion]:
    """Generate high-quality, explainable, deterministic questions without requiring an LLM."""
    role = payload.target_role.strip()
    family = _role_family(role)

    candidates = _build_template_candidates(
        role=role,
        family=family,
        level=payload.experience_level,
        difficulty=payload.difficulty,
        interview_type=payload.interview_type,
        skills=payload.skills,
        projects=payload.project_mentions,
        experiences=payload.experience_mentions,
    )

    # Deduplicate while preserving order
    unique: list[tuple[QuestionCategory, str, str]] = []
    seen: set[str] = set()
    for cat, text, rationale in candidates:
        key = text.casefold()
        if key not in seen:
            unique.append((cat, text, rationale))
            seen.add(key)

    # Group by category for balanced selection
    target_categories: tuple[QuestionCategory, ...]
    if payload.interview_type == "technical":
        target_categories = ("technical", "project", "experience")
    elif payload.interview_type == "hr":
        target_categories = ("hr",)
    else:
        target_categories = ("technical", "project", "experience", "hr")

    grouped: dict[QuestionCategory, list[tuple[QuestionCategory, str, str]]] = {
        cat: [item for item in unique if item[0] == cat]
        for cat in target_categories
    }

    selected: list[tuple[QuestionCategory, str, str]] = []
    while len(selected) < payload.question_count and any(grouped.values()):
        for cat in target_categories:
            if grouped.get(cat) and len(selected) < payload.question_count:
                selected.append(grouped[cat].pop(0))

    # If still need more, fill from any remaining unique questions
    if len(selected) < payload.question_count:
        for item in unique:
            if item not in selected:
                selected.append(item)
                if len(selected) == payload.question_count:
                    break

    # Deterministic translation mapping for non-English practice requests
    lang = getattr(payload, "language", "en")
    def _translate_if_needed(text: str) -> str:
        if lang == "hi":
            for prefix, hi_template in HI_TRANSLATIONS.items():
                if prefix.lower() in text.lower():
                    return hi_template.format(role=role)
        elif lang == "te":
            for prefix, te_template in TE_TRANSLATIONS.items():
                if prefix.lower() in text.lower():
                    return te_template.format(role=role)
        return text

    return [
        InterviewQuestion(
            id=f"q{idx:02d}",
            category=category,
            text=_translate_if_needed(text),
            rationale=rationale,
        )
        for idx, (category, text, rationale) in enumerate(selected[: payload.question_count], start=1)
    ]


def generate_questions_with_metadata(
    payload: QuestionGenerationRequest,
) -> tuple[list[InterviewQuestion], Literal["ai_generated", "rule_based_baseline"], str | None]:
    """Generate interview questions using an LLM if available, otherwise template fallback."""
    llm_client = get_configured_llm_client()

    if llm_client is not None:
        try:
            logger.info("Generating interview questions via LLM provider...")
            questions, model_name = llm_client.generate_questions(
                target_role=payload.target_role.strip(),
                experience_level=payload.experience_level,
                interview_type=payload.interview_type,
                difficulty=payload.difficulty,
                question_count=payload.question_count,
                skills=payload.skills,
                project_mentions=payload.project_mentions,
                experience_mentions=payload.experience_mentions,
                resume_text=payload.resume_text,
                language=getattr(payload, "language", "en"),
            )
            return questions, "ai_generated", model_name
        except LLMError as exc:
            logger.warning(
                "LLM question generation failed (%s). Falling back to rule-based generator.",
                exc,
            )
        except Exception as exc:
            logger.warning(
                "Unexpected error during LLM generation (%s). Falling back to rule-based generator.",
                exc,
            )

    # Deterministic fallback
    questions = generate_template_questions(payload)
    return questions, "rule_based_baseline", None


def generate_questions(payload: QuestionGenerationRequest) -> list[InterviewQuestion]:
    """Compatibility function returning only the list of questions."""
    questions, _, _ = generate_questions_with_metadata(payload)
    return questions
