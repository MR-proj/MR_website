from pathlib import Path
import hashlib
import shutil
from datetime import datetime

ROOT = Path.cwd()
ACADEMIC = ROOT / "academic.qmd"
STYLES = ROOT / "styles.css"
QUARTO = ROOT / "_quarto.yml"

EXPECTED = {
    "_quarto.yml": "1c62fef79fd8622aca14bce08e40a360f369bb136b35f4c6208cb22e21c8a7fa",
    "academic.qmd": "e0e8f0f880b0d45628c1c8286a7fe784eb74759fe6938736fa3bfd399e8a18c2",
    "styles.css": "00319e6f02a75fc0864738c09110e5b3a062ee6c748ff0eb91731b23b519f7d7",
}

EXPECTED_FINAL_ACADEMIC = "0f71fbc99812f9beaed5092a26149d74c7eb23933e80c9597988b6a1ccddb64c"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_lf(path: Path, text: str) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 occurrence, found {count}. "
            "No approximate replacement is allowed."
        )
    print(f"patched: {label}")
    return text.replace(old, new, 1)


for path in (QUARTO, ACADEMIC, STYLES):
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")

for relative, expected_hash in EXPECTED.items():
    path = ROOT / relative
    actual_hash = sha256(path)
    if actual_hash != expected_hash:
        raise SystemExit(
            f"Baseline mismatch for {relative}.\n"
            f"Expected: {expected_hash}\n"
            f"Actual:   {actual_hash}\n"
            "Stop: this patch is only for the verified current baseline."
        )

timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_dir = ROOT.parent / f"{ROOT.name}_BACKUP_BEFORE_ACADEMIC_STRUCTURE_{timestamp}"
backup_dir.mkdir(parents=True, exist_ok=False)
shutil.copy2(ACADEMIC, backup_dir / "academic.qmd")

original = read_text(ACADEMIC)
patched = original

patched = replace_once(
    patched,
    '''```{=html}\n<section class="site-shell academic-shell">\n  <header class="page-hero academic-hero">\n    <p class="page-eyebrow">Academic</p>\n    <h1>Economic Methodologist and Innovation Economist</h1>\n  </header>\n\n  <section class="main-card academic-about-card">\n    <p>I study how economic and social models are constructed, evaluated and used. My research focuses on economic methodology, agent-based modelling and the epistemology of simulation, with applications to innovation dynamics, knowledge diffusion and model selection.</p>\n    <p>I combine philosophical and methodological analysis with computational modelling. I am particularly interested in how assumptions, purposes and modelling choices shape what a model can credibly explain and how it can be used.</p>\n    <p class="academic-about-card__contact"><a class="action-link" href="mailto:massimo.rusconi@uninsubria.it">massimo.rusconi@uninsubria.it</a></p>\n  </section>\n\n  <section class="section-band section-band--soft academic-primary-band">\n    <div class="content-stack">\n```\n''',
    '''::: {.site-shell .academic-shell}\n\n```{=html}\n<header class="page-hero academic-hero">\n  <p class="page-eyebrow">Academic</p>\n  <h1>Economic Methodologist and Innovation Economist</h1>\n</header>\n\n<section class="main-card academic-about-card">\n  <p>I study how economic and social models are constructed, evaluated and used. My research focuses on economic methodology, agent-based modelling and the epistemology of simulation, with applications to innovation dynamics, knowledge diffusion and model selection.</p>\n  <p>I combine philosophical and methodological analysis with computational modelling. I am particularly interested in how assumptions, purposes and modelling choices shape what a model can credibly explain and how it can be used.</p>\n  <p class="academic-about-card__contact"><a class="action-link" href="mailto:massimo.rusconi@uninsubria.it">massimo.rusconi@uninsubria.it</a></p>\n</section>\n```\n\n::: {.section-band .section-band--soft .academic-primary-band}\n::: {.content-stack}\n''',
    "open site shell and primary band with fenced divs",
)

patched = replace_once(
    patched,
    '''```{=html}\n    </div>\n  </section>\n\n  <div class="content-stack">\n```\n''',
    ''':::\n:::\n\n::: {.content-stack .academic-secondary-stack}\n''',
    "close primary band and open secondary stack",
)

patched = replace_once(
    patched,
    '''```{=html}\n  </div>\n\n  <section class="section-band section-band--soft">\n    <div class="content-stack">\n```\n''',
    ''':::\n\n::: {.section-band .section-band--soft .academic-activities-band}\n::: {.content-stack}\n''',
    "close secondary stack and open activities band",
)

patched = replace_once(
    patched,
    '''```{=html}\n    </div>\n  </section>\n</section>\n```\n''',
    ''':::\n:::\n\n:::\n''',
    "close activities band and site shell",
)

# Guardrails: content and inner components must remain untouched.
required_counts = {
    "## Research Interests": 1,
    "## Academic Appointments": 1,
    "## Education": 1,
    "## Publications": 1,
    "## Ongoing Research": 1,
    "## Teaching": 1,
    "## Grants and Awards": 1,
    "## Academic Activities": 1,
    '<div class="theme-grid" aria-label="Research interests">': 1,
    '<div class="timeline-list" aria-label="Current academic positions and affiliations">': 1,
    '<div class="timeline-list" aria-label="Previous academic positions and affiliations">': 1,
    '<div class="timeline-list" aria-label="Education">': 1,
    '<div class="publication-grid" aria-label="Published and accepted peer-reviewed journal articles">': 1,
    '<div class="teaching-grid" aria-label="Teaching roles">': 1,
    '<div class="event-grid event-grid--compact" aria-label="Grants and awards">': 1,
    '<div class="event-stack" aria-label="Conference presentations">': 1,
    '<div class="event-stack" aria-label="Summer schools and workshops">': 1,
    '::: {.site-shell .academic-shell}': 1,
    '::: {.section-band .section-band--soft .academic-primary-band}': 1,
    '::: {.content-stack .academic-secondary-stack}': 1,
    '::: {.section-band .section-band--soft .academic-activities-band}': 1,
}

for needle, expected_count in required_counts.items():
    actual_count = patched.count(needle)
    if actual_count != expected_count:
        raise RuntimeError(
            f"Postcondition failed for {needle!r}: "
            f"expected {expected_count}, found {actual_count}."
        )

for forbidden in (
    '<section class="site-shell academic-shell">',
    '<div class="content-stack">\n```\n\n## Publications',
    '```{=html}\n    </div>\n  </section>\n</section>\n```',
):
    if forbidden in patched:
        raise RuntimeError(f"Obsolete raw wrapper remains: {forbidden!r}")

write_lf(ACADEMIC, patched)

actual_final = sha256(ACADEMIC)
if actual_final != EXPECTED_FINAL_ACADEMIC:
    shutil.copy2(backup_dir / "academic.qmd", ACADEMIC)
    raise SystemExit(
        "Unexpected final academic.qmd hash; rollback completed.\n"
        f"Expected: {EXPECTED_FINAL_ACADEMIC}\n"
        f"Actual:   {actual_final}\n"
        f"Backup:   {backup_dir}"
    )

if sha256(STYLES) != EXPECTED["styles.css"] or sha256(QUARTO) != EXPECTED["_quarto.yml"]:
    shutil.copy2(backup_dir / "academic.qmd", ACADEMIC)
    raise SystemExit(
        "An immutable file changed unexpectedly; rollback completed.\n"
        f"Backup: {backup_dir}"
    )

print("Academic structure patch passed all source checks.")
print(f"Backup: {backup_dir}")
print(f"academic.qmd before: {EXPECTED['academic.qmd']}")
print(f"academic.qmd after:  {actual_final}")
