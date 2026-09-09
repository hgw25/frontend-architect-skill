#!/usr/bin/env python3
"""Validate the distributable Skill, repository metadata, and eval fixtures."""

from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path
from typing import Any

try:
    import yaml
except ModuleNotFoundError:
    print(
        "Missing development dependency PyYAML. "
        "Run: python3 -m pip install -r requirements-dev.txt",
        file=sys.stderr,
    )
    raise SystemExit(2)


ROOT = Path(__file__).resolve().parent.parent
SKILL_NAME = "frontend-architect"
MAX_SKILL_NAME_LENGTH = 64

REQUIRED_FILES = (
    ".github/workflows/validate.yml",
    "VERSION",
    "CHANGELOG.md",
    "SKILL.md",
    "README.md",
    "CONTRIBUTING.md",
    "requirements-dev.txt",
    "agents/openai.yaml",
    "references/architecture-and-code.md",
    "references/async-and-lifecycles.md",
    "references/module-boundaries.md",
    "references/programming-paradigms.md",
    "references/frontend-infrastructure.md",
    "references/runtime-and-delivery.md",
    "references/rendering-and-performance.md",
    "references/rendering-web.md",
    "references/rendering-app.md",
    "references/rendering-mini-program.md",
    "references/security-and-trust.md",
    "references/interface-and-motion.md",
    "references/verification-and-review.md",
    "evals/cases.md",
    "evals/cases.yaml",
    "evals/rubric.md",
    "scripts/validate_skill.py",
    "scripts/run_behavior_evals.py",
    "scripts/test_run_behavior_evals.py",
    "scripts/score_behavior_evals.py",
    "scripts/test_score_behavior_evals.py",
    "scripts/test_validate_skill.py",
)

ALLOWED_SKILL_KEYS = {
    "name",
    "description",
    "license",
    "allowed-tools",
    "metadata",
}
ALLOWED_AGENT_KEYS = {"interface", "dependencies", "policy"}
ALLOWED_INTERFACE_KEYS = {
    "display_name",
    "short_description",
    "icon_small",
    "icon_large",
    "brand_color",
    "default_prompt",
}
EVAL_DIMENSIONS = {
    "requirements_context",
    "solution_complexity",
    "module_boundaries",
    "paradigm_choice",
    "runtime_delivery",
    "rendering_performance",
    "security_trust",
    "implementation_integrity",
    "infrastructure_design",
    "developer_experience",
    "compatibility_evolution",
    "operability",
    "correctness_boundary",
    "user_experience",
    "verification_evidence",
    "communication_quality",
}
REQUIRED_CASE_KEYS = {
    "id",
    "title",
    "prompt",
    "artifact",
    "applicable_dimensions",
    "must_observe",
    "fail_if",
}
OPTIONAL_CASE_KEYS = {"fixture", "protected_paths", "validation_commands"}

MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
UNFINISHED_MARKER = re.compile(r"\b(?:TODO|PLACEHOLDER)\b|\[TODO:", re.IGNORECASE)
FRONTMATTER = re.compile(r"\A---\n(?P<body>.*?)\n---(?:\n|\Z)", re.DOTALL)
KEBAB_CASE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SEMANTIC_VERSION = re.compile(r"^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$")
CHANGELOG_RELEASE = re.compile(
    r"^## \[(?P<version>\d+\.\d+\.\d+)\] - (?P<date>\d{4}-\d{2}-\d{2})$",
    re.MULTILINE,
)
IGNORED_TREE_NAMES = {
    ".git",
    "dist",
    "node_modules",
    "playwright-report",
    "test-results",
}


def is_generated_path(path: Path) -> bool:
    return bool(IGNORED_TREE_NAMES.intersection(path.relative_to(ROOT).parts))


def add_error(errors: list[str], message: str) -> None:
    errors.append(message)


def load_yaml(path: Path, errors: list[str]) -> Any:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as error:
        add_error(errors, f"Invalid YAML in {path.relative_to(ROOT)}: {error}")
        return None


def validate_required_files(errors: list[str]) -> None:
    for relative_path in REQUIRED_FILES:
        if not (ROOT / relative_path).is_file():
            add_error(errors, f"Missing required file: {relative_path}")


def validate_release_metadata(errors: list[str]) -> None:
    version_path = ROOT / "VERSION"
    changelog_path = ROOT / "CHANGELOG.md"
    readme_path = ROOT / "README.md"
    if not version_path.is_file() or not changelog_path.is_file() or not readme_path.is_file():
        return

    version = version_path.read_text(encoding="utf-8").strip()
    if not SEMANTIC_VERSION.fullmatch(version):
        add_error(errors, "VERSION must contain one semantic version such as 0.2.0")
        return

    changelog = changelog_path.read_text(encoding="utf-8")
    releases = list(CHANGELOG_RELEASE.finditer(changelog))
    if not releases:
        add_error(errors, "CHANGELOG.md must contain a dated release heading")
    else:
        latest = releases[0]
        if latest.group("version") != version:
            add_error(
                errors,
                "The first CHANGELOG.md release must match VERSION "
                f"({version})",
            )
        try:
            date.fromisoformat(latest.group("date"))
        except ValueError:
            add_error(errors, "The latest CHANGELOG.md release date is invalid")

    readme = readme_path.read_text(encoding="utf-8")
    expected_ref = f"--ref v{version}"
    if expected_ref not in readme:
        add_error(errors, f"README.md install command must contain {expected_ref!r}")
    if "--repo hgw25/frontend-architect-skill" not in readme:
        add_error(errors, "README.md install command must use the canonical GitHub repository")
    if "heguangwei/frontend-architect-skill" in readme or "OWNER/frontend-architect-skill" in readme:
        add_error(errors, "README.md contains a stale GitHub repository owner")


def validate_frontmatter(errors: list[str]) -> None:
    skill_path = ROOT / "SKILL.md"
    if not skill_path.is_file():
        return

    content = skill_path.read_text(encoding="utf-8")
    match = FRONTMATTER.match(content)
    if match is None:
        add_error(errors, "SKILL.md must start with YAML frontmatter")
        return

    try:
        frontmatter = yaml.safe_load(match.group("body"))
    except yaml.YAMLError as error:
        add_error(errors, f"Invalid YAML in SKILL.md frontmatter: {error}")
        return

    if not isinstance(frontmatter, dict):
        add_error(errors, "SKILL.md frontmatter must be a mapping")
        return

    unexpected = set(frontmatter) - ALLOWED_SKILL_KEYS
    if unexpected:
        add_error(
            errors,
            "Unsupported SKILL.md frontmatter keys: " + ", ".join(sorted(unexpected)),
        )

    name = frontmatter.get("name")
    if name != SKILL_NAME:
        add_error(errors, f"SKILL.md name must be {SKILL_NAME!r}")
    elif not KEBAB_CASE.fullmatch(name) or len(name) > MAX_SKILL_NAME_LENGTH:
        add_error(errors, "SKILL.md name must be valid hyphen-case and at most 64 chars")

    description = frontmatter.get("description")
    if not isinstance(description, str) or not description.strip():
        add_error(errors, "SKILL.md description must be a non-empty string")
    elif len(description) > 1024 or "<" in description or ">" in description:
        add_error(errors, "SKILL.md description violates length or character limits")


def validate_markdown(errors: list[str]) -> None:
    for markdown_path in ROOT.rglob("*.md"):
        if markdown_path.is_relative_to(ROOT / "evals/results") or is_generated_path(
            markdown_path
        ):
            continue
        content = markdown_path.read_text(encoding="utf-8")
        relative_path = markdown_path.relative_to(ROOT)

        if UNFINISHED_MARKER.search(content):
            add_error(errors, f"Unfinished marker in {relative_path}")

        for target in MARKDOWN_LINK.findall(content):
            clean_target = target.strip().strip("<>")
            if clean_target.startswith(("http://", "https://", "mailto:", "#")):
                continue

            file_target = clean_target.split("#", 1)[0]
            if not file_target:
                continue
            if file_target.startswith("/"):
                add_error(errors, f"Non-portable absolute link in {relative_path}: {target}")
                continue

            resolved_target = (markdown_path.parent / file_target).resolve()
            if not resolved_target.is_relative_to(ROOT):
                add_error(errors, f"Local link escapes the repository in {relative_path}: {target}")
            elif not resolved_target.exists():
                add_error(errors, f"Broken local link in {relative_path}: {target}")


def validate_agent_metadata(errors: list[str]) -> None:
    metadata_path = ROOT / "agents/openai.yaml"
    if not metadata_path.is_file():
        return

    metadata = load_yaml(metadata_path, errors)
    if not isinstance(metadata, dict):
        add_error(errors, "agents/openai.yaml must contain a mapping")
        return

    unexpected = set(metadata) - ALLOWED_AGENT_KEYS
    if unexpected:
        add_error(errors, "Unsupported agents/openai.yaml keys: " + ", ".join(sorted(unexpected)))

    interface = metadata.get("interface")
    if not isinstance(interface, dict):
        add_error(errors, "agents/openai.yaml must define an interface mapping")
        return

    unexpected_interface = set(interface) - ALLOWED_INTERFACE_KEYS
    if unexpected_interface:
        add_error(
            errors,
            "Unsupported interface keys: " + ", ".join(sorted(unexpected_interface)),
        )

    for key in ("display_name", "short_description", "default_prompt"):
        if not isinstance(interface.get(key), str) or not interface[key].strip():
            add_error(errors, f"interface.{key} must be a non-empty string")

    short_description = interface.get("short_description", "")
    if isinstance(short_description, str) and not 25 <= len(short_description) <= 64:
        add_error(errors, "interface.short_description must contain 25-64 characters")

    default_prompt = interface.get("default_prompt", "")
    if isinstance(default_prompt, str) and f"${SKILL_NAME}" not in default_prompt:
        add_error(errors, f"interface.default_prompt must mention ${SKILL_NAME}")

    for icon_key in ("icon_small", "icon_large"):
        icon_path = interface.get(icon_key)
        if isinstance(icon_path, str):
            resolved_icon = (ROOT / icon_path).resolve()
            if not resolved_icon.is_relative_to(ROOT) or not resolved_icon.is_file():
                add_error(errors, f"interface.{icon_key} does not resolve to a local asset")

    policy = metadata.get("policy")
    if policy is not None:
        if not isinstance(policy, dict):
            add_error(errors, "agents/openai.yaml policy must be a mapping")
        elif "allow_implicit_invocation" in policy and not isinstance(
            policy["allow_implicit_invocation"], bool
        ):
            add_error(errors, "policy.allow_implicit_invocation must be a boolean")


def validate_string_list(
    case_id: str,
    key: str,
    value: Any,
    errors: list[str],
) -> None:
    if not isinstance(value, list) or not value:
        add_error(errors, f"Eval case {case_id!r} must define a non-empty {key} list")
    elif any(not isinstance(item, str) or not item.strip() for item in value):
        add_error(errors, f"Eval case {case_id!r} contains an invalid {key} item")


def validate_evals(errors: list[str]) -> None:
    cases_path = ROOT / "evals/cases.yaml"
    if not cases_path.is_file():
        return

    document = load_yaml(cases_path, errors)
    if not isinstance(document, dict):
        add_error(errors, "evals/cases.yaml must contain a mapping")
        return
    if document.get("version") != 1:
        add_error(errors, "evals/cases.yaml version must be 1")

    cases = document.get("cases")
    if not isinstance(cases, list) or not cases:
        add_error(errors, "evals/cases.yaml must contain at least one case")
        return

    seen_ids: set[str] = set()
    framework_fixtures: set[str] = set()
    has_browser_fixture = False
    for index, case in enumerate(cases, start=1):
        if not isinstance(case, dict):
            add_error(errors, f"Eval case #{index} must be a mapping")
            continue

        missing = REQUIRED_CASE_KEYS - set(case)
        if missing:
            add_error(errors, f"Eval case #{index} is missing: {', '.join(sorted(missing))}")

        unexpected = set(case) - REQUIRED_CASE_KEYS - OPTIONAL_CASE_KEYS
        if unexpected:
            add_error(
                errors,
                f"Eval case #{index} has unsupported keys: {', '.join(sorted(unexpected))}",
            )

        case_id = case.get("id")
        if not isinstance(case_id, str) or not KEBAB_CASE.fullmatch(case_id):
            add_error(errors, f"Eval case #{index} has an invalid id")
            case_id = f"case-{index}"
        elif case_id in seen_ids:
            add_error(errors, f"Duplicate eval case id: {case_id}")
        else:
            seen_ids.add(case_id)

        for key in ("title", "prompt", "artifact"):
            if not isinstance(case.get(key), str):
                add_error(errors, f"Eval case {case_id!r} field {key} must be a string")
        if isinstance(case.get("prompt"), str) and not case["prompt"].strip():
            add_error(errors, f"Eval case {case_id!r} prompt must not be empty")

        dimensions = case.get("applicable_dimensions")
        validate_string_list(case_id, "applicable_dimensions", dimensions, errors)
        if isinstance(dimensions, list):
            unknown = {item for item in dimensions if isinstance(item, str)} - EVAL_DIMENSIONS
            if unknown:
                add_error(
                    errors,
                    f"Eval case {case_id!r} has unknown dimensions: "
                    + ", ".join(sorted(unknown)),
                )
            if len(dimensions) != len(set(dimensions)):
                add_error(errors, f"Eval case {case_id!r} repeats an applicable dimension")

        validate_string_list(case_id, "must_observe", case.get("must_observe"), errors)
        validate_string_list(case_id, "fail_if", case.get("fail_if"), errors)

        fixture = case.get("fixture")
        protected_paths = case.get("protected_paths")
        validation_commands = case.get("validation_commands")
        requires_implementation = (
            isinstance(dimensions, list) and "implementation_integrity" in dimensions
        )
        if requires_implementation and fixture is None:
            add_error(
                errors,
                f"Eval case {case_id!r} scores implementation_integrity without a fixture",
            )
        if fixture is not None:
            if not isinstance(fixture, str) or not fixture.strip():
                add_error(errors, f"Eval case {case_id!r} fixture must be a non-empty string")
            else:
                fixture_path = (ROOT / fixture).resolve()
                if not fixture_path.is_relative_to(ROOT) or not fixture_path.is_dir():
                    add_error(errors, f"Eval case {case_id!r} fixture must resolve to a directory")
                elif not any(path.is_file() for path in fixture_path.rglob("*")):
                    add_error(errors, f"Eval case {case_id!r} fixture must not be empty")
                elif (fixture_path / "package.json").is_file():
                    package_text = (fixture_path / "package.json").read_text(encoding="utf-8")
                    if '"react"' in package_text:
                        framework_fixtures.add("react")
                    if '"vue"' in package_text:
                        framework_fixtures.add("vue")
                    if '"@playwright/test"' in package_text:
                        has_browser_fixture = True
                    if not (fixture_path / "package-lock.json").is_file():
                        add_error(
                            errors,
                            f"Node fixture for eval case {case_id!r} must include package-lock.json",
                        )
                    if not isinstance(validation_commands, list) or "npm ci" not in validation_commands:
                        add_error(
                            errors,
                            f"Node fixture for eval case {case_id!r} must install with npm ci",
                        )
            validate_string_list(
                case_id,
                "validation_commands",
                validation_commands,
                errors,
            )
            if protected_paths is not None:
                validate_string_list(case_id, "protected_paths", protected_paths, errors)
                if isinstance(protected_paths, list):
                    for protected_path in protected_paths:
                        if not isinstance(protected_path, str):
                            continue
                        relative_path = Path(protected_path)
                        if relative_path.is_absolute() or ".." in relative_path.parts:
                            add_error(
                                errors,
                                f"Eval case {case_id!r} has unsafe protected path: {protected_path}",
                            )
                        elif isinstance(fixture, str) and not (
                            ROOT / fixture / relative_path
                        ).is_file():
                            add_error(
                                errors,
                                f"Eval case {case_id!r} protected path is not a fixture file: "
                                f"{protected_path}",
                            )
        elif validation_commands is not None:
            add_error(errors, f"Eval case {case_id!r} defines commands without a fixture")
        elif protected_paths is not None:
            add_error(errors, f"Eval case {case_id!r} protects paths without a fixture")

    if not {"react", "vue"}.issubset(framework_fixtures):
        add_error(errors, "Executable eval fixtures must cover both React and Vue")
    if not has_browser_fixture:
        add_error(errors, "At least one executable eval fixture must use a real browser")


def validate_python_syntax(errors: list[str]) -> None:
    for script_path in (ROOT / "scripts").glob("*.py"):
        try:
            compile(
                script_path.read_text(encoding="utf-8"),
                str(script_path.relative_to(ROOT)),
                "exec",
            )
        except SyntaxError as error:
            add_error(errors, f"Invalid Python in {script_path.relative_to(ROOT)}: {error}")


def main() -> int:
    errors: list[str] = []

    validate_required_files(errors)
    validate_release_metadata(errors)
    validate_frontmatter(errors)
    validate_markdown(errors)
    validate_agent_metadata(errors)
    validate_evals(errors)
    validate_python_syntax(errors)

    if errors:
        print("Skill validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    markdown_count = sum(
        1
        for path in ROOT.rglob("*.md")
        if not path.is_relative_to(ROOT / "evals/results") and not is_generated_path(path)
    )
    eval_document = load_yaml(ROOT / "evals/cases.yaml", [])
    eval_count = len(eval_document["cases"])
    print(
        f"Skill validation passed "
        f"({markdown_count} Markdown files, {eval_count} eval cases)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
