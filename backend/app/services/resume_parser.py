import io
import re

from docx import Document
from pypdf import PdfReader

ALLOWED_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_RESUME_BYTES = 5 * 1024 * 1024

# Keep this starter list transparent and easy to extend. It is not an ATS score.
KNOWN_SKILLS = [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "SQL", "PostgreSQL",
    "MongoDB", "React", "Next.js", "Node.js", "FastAPI", "Django", "Flask",
    "Machine Learning", "Deep Learning", "NLP", "TensorFlow", "PyTorch",
    "scikit-learn", "Docker", "Kubernetes", "AWS", "Azure", "Git",
    "HTML", "CSS", "Redis", "Linux", "Data Structures", "Algorithms",
]


class ResumeParseError(ValueError):
    """Raised when a resume cannot be safely parsed."""


def extract_text(filename: str, content_type: str, content: bytes) -> str:
    """Extract text from a PDF or DOCX in memory; never persist uploaded bytes."""
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if suffix not in ALLOWED_TYPES or content_type != ALLOWED_TYPES[suffix]:
        raise ResumeParseError("Only valid PDF and DOCX files are supported.")
    if not content:
        raise ResumeParseError("The uploaded file is empty.")
    if len(content) > MAX_RESUME_BYTES:
        raise ResumeParseError("Resume exceeds the 5 MB upload limit.")

    try:
        if suffix == ".pdf":
            reader = PdfReader(io.BytesIO(content), strict=True)
            if reader.is_encrypted:
                raise ResumeParseError("Password-protected PDFs are not supported.")
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            document = Document(io.BytesIO(content))
            text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    except ResumeParseError:
        raise
    except Exception as exc:
        raise ResumeParseError("The file could not be read as a valid PDF or DOCX.") from exc

    text = re.sub(r"[\t\r]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        raise ResumeParseError("No readable text was found. Scanned PDFs need OCR, which is not enabled yet.")
    return text


def _section_lines(text: str, headings: tuple[str, ...]) -> list[str]:
    lines = [line.strip(" •\t-") for line in text.splitlines() if line.strip()]
    selected: list[str] = []
    active = False
    stop_headings = ("skills", "education", "experience", "employment", "projects", "certifications", "summary", "objective")
    for line in lines:
        normalized = line.lower().strip(" :")
        if any(normalized == heading for heading in stop_headings):
            active = any(normalized == heading for heading in headings)
            continue
        if active and len(line) > 2:
            selected.append(line[:240])
            if len(selected) == 8:
                break
    return selected


def build_profile(text: str) -> dict:
    """Return a heuristic profile; findings are mentions, not verified facts."""
    lower = text.lower()
    skills = [skill for skill in KNOWN_SKILLS if re.search(r"(?<![\w+#.])" + re.escape(skill.lower()) + r"(?![\w+#.])", lower)]
    return {
        "skills": skills,
        "education_mentions": _section_lines(text, ("education",)),
        "experience_mentions": _section_lines(text, ("experience", "employment")),
        "project_mentions": _section_lines(text, ("projects",)),
        "character_count": len(text),
    }
