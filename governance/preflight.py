#!/usr/bin/env python3
"""Risk-scaled governance preflight for this repository.

Generated/adapted from human-ai-governance v0.3.0.

The repository runs this gate explicitly at Tier 3. Strict side-effect scanning
remains opt-in at the script level and is enabled by the project npm command.
"""

from __future__ import annotations

import argparse
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

SKILL_VERSION = "0.3.0"
SKILL_MARKER_RE = re.compile(
    r"Generated/adapted from human-ai-governance v(?P<version>\d+\.\d+\.\d+)"
)

CHANGELOG = "CHANGELOG.md"
AI_AGENT_LOG = "governance/AI_AGENT_LOG.md"
ARCHITECTURE_CANDIDATES = ("ARCHITECTURE.md", "PROJECT_MAP.md")
PLAN_DOC_PREFIXES = ("plan_docs/", "docs/plans/")

TIMESTAMP_HEADING_RE = re.compile(
    r"^## (?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?: [A-Z]{2,5})?)\s*$",
    re.MULTILINE,
)

SECRET_ASSIGNMENT_RE = re.compile(
    r"(?i)\b([a-z0-9_-]*(?:api[_-]?(?:key|secret)|secret[_-]?key|"
    r"access[_-]?token|refresh[_-]?token|auth[_-]?token|private[_-]?key|"
    r"client[_-]?secret|password|transaction[_-]?password))\b"
    r"[^\S\r\n]*[:=][^\S\r\n]*[\"']?([^\"'\s#\r\n]+)"
)
SECRET_TOKEN_PATTERNS = (
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{30,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
)
SECRET_PLACEHOLDERS = {
    "",
    "changeme",
    "configured",
    "example",
    "missing",
    "placeholder",
    "redacted",
    "todo",
    "your_api_key",
    "your_api_key_here",
    "your_secret",
    "your_secret_here",
    "your_token",
    "your_token_here",
    "<api_key>",
    "<secret>",
    "<token>",
}

IGNORED_SUFFIXES = {
    ".db",
    ".gif",
    ".jpeg",
    ".jpg",
    ".pdf",
    ".png",
    ".pyc",
    ".pyo",
    ".sqlite",
    ".webp",
}

STRUCTURE_SENSITIVE_EXACT = {
    "AGENTS.md",
    "README.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "pyproject.toml",
    "requirements.txt",
    "tsconfig.json",
    "uv.lock",
}
STRUCTURE_SENSITIVE_PREFIXES = (
    "app/",
    "components/",
    "docs/",
    "governance/",
    "lib/",
    "pages/",
    "plan_docs/",
    "server/",
    "src/",
    "tests/",
)

RISKY_SIDE_EFFECT_PATTERNS = (
    re.compile(r"\b(send|deliver)_(email|message|sms)\b", re.IGNORECASE),
    re.compile(r"\b(charge|refund|payment|invoice|payout)\b", re.IGNORECASE),
    re.compile(r"\b(place|submit|cancel|modify)_order\b", re.IGNORECASE),
    re.compile(r"\b(transfer|withdraw|deposit)\b", re.IGNORECASE),
    re.compile(r"\b(drop\s+table|truncate\s+table|delete\s+from)\b", re.IGNORECASE),
)

EXECUTABLE_SIDE_EFFECT_SUFFIXES = {
    ".cjs",
    ".js",
    ".jsx",
    ".mjs",
    ".py",
    ".sh",
    ".sql",
    ".ts",
    ".tsx",
}


@dataclass(frozen=True, slots=True)
class StatusEntry:
    status: str
    path: str


@dataclass(frozen=True, slots=True)
class LatestEntry:
    timestamp: str
    body: str


def run_git(root: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=root,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def resolve_repo_root(start: Path) -> Path:
    result = run_git(start, ["rev-parse", "--show-toplevel"])
    if result.returncode == 0 and result.stdout.strip():
        return Path(result.stdout.strip())
    return start.resolve()


def strip_git_quotes(path: str) -> str:
    if len(path) >= 2 and path[0] == path[-1] == '"':
        return path[1:-1]
    return path


def parse_status(output: str) -> list[StatusEntry]:
    entries: list[StatusEntry] = []
    for line in output.splitlines():
        if not line:
            continue
        status = line[:2].strip()
        payload = line[3:]
        if " -> " in payload:
            payload = payload.split(" -> ", 1)[1]
        path = strip_git_quotes(payload.strip())
        if path:
            entries.append(StatusEntry(status=status, path=path))
    return entries


def git_changed_paths(root: Path) -> tuple[list[StatusEntry], set[str]]:
    status = run_git(root, ["status", "--porcelain=v1", "--untracked-files=all"])
    if status.returncode != 0:
        return [], set()

    entries = parse_status(status.stdout)
    paths = {entry.path for entry in entries}
    for args in (["diff", "--name-only"], ["diff", "--cached", "--name-only"]):
        result = run_git(root, args)
        if result.returncode == 0:
            paths.update(line.strip() for line in result.stdout.splitlines() if line.strip())
    return entries, paths


def read_text(root: Path, relative_path: str) -> str:
    path = root / relative_path
    if not path.exists() or path.is_dir():
        return ""
    return path.read_text(encoding="utf-8")


def read_changed_text(root: Path, relative_path: str) -> str | None:
    path = root / relative_path
    if not path.exists() or path.is_dir():
        return None
    if path.suffix.lower() in IGNORED_SUFFIXES:
        return None
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return None


def read_added_text(root: Path, relative_path: str) -> str | None:
    """Return added lines for tracked files and full text for untracked files."""
    status = run_git(root, ["status", "--porcelain=v1", "--", relative_path])
    if status.returncode == 0 and any(
        line.startswith("??") for line in status.stdout.splitlines()
    ):
        return read_changed_text(root, relative_path)

    added_lines: list[str] = []
    for args in (
        ["diff", "--unified=0", "--", relative_path],
        ["diff", "--cached", "--unified=0", "--", relative_path],
    ):
        result = run_git(root, args)
        if result.returncode != 0:
            continue
        added_lines.extend(
            line[1:]
            for line in result.stdout.splitlines()
            if line.startswith("+") and not line.startswith("+++")
        )
    return "\n".join(added_lines)


def latest_entry(text: str) -> LatestEntry | None:
    matches = list(TIMESTAMP_HEADING_RE.finditer(text))
    if not matches:
        return None
    first = matches[0]
    second_start = matches[1].start() if len(matches) > 1 else len(text)
    return LatestEntry(first.group("timestamp"), text[first.end() : second_start])


def validate_changelog(text: str) -> list[str]:
    entry = latest_entry(text)
    if entry is None:
        return [f"{CHANGELOG} needs a latest minute-level timestamp heading"]
    issues: list[str] = []
    if "Reason:" not in entry.body:
        issues.append(f"latest {CHANGELOG} entry lacks Reason:")
    if not entry.body.strip().startswith("-"):
        issues.append(f"latest {CHANGELOG} entry should contain at least one bullet")
    return issues


def validate_ai_log(text: str) -> list[str]:
    entry = latest_entry(text)
    if entry is None:
        return [f"{AI_AGENT_LOG} needs a latest minute-level timestamp heading"]
    required = (
        "Task:",
        "Plan agreed:",
        "Changed files:",
        "Reason:",
        "Validation:",
        "Safety notes:",
    )
    issues = [
        f"latest {AI_AGENT_LOG} entry lacks {field}"
        for field in required
        if field not in entry.body
    ]
    if "Pending:" in entry.body:
        issues.append(f"latest {AI_AGENT_LOG} entry still contains Pending validation")
    return issues


def is_material_path(path: str) -> bool:
    return path not in {CHANGELOG, AI_AGENT_LOG}


def architecture_changed(paths: set[str]) -> bool:
    return any(path in paths for path in ARCHITECTURE_CANDIDATES)


def architecture_exists(root: Path) -> bool:
    return any((root / path).exists() for path in ARCHITECTURE_CANDIDATES)


def has_structure_sensitive_change(paths: set[str]) -> bool:
    for path in paths:
        if path in ARCHITECTURE_CANDIDATES:
            continue
        if path in STRUCTURE_SENSITIVE_EXACT:
            return True
        if any(path.startswith(prefix) for prefix in STRUCTURE_SENSITIVE_PREFIXES):
            return True
    return False


def is_plan_doc(path: str) -> bool:
    return path.endswith(".md") and any(path.startswith(prefix) for prefix in PLAN_DOC_PREFIXES)


def validate_plan_parent_markers(root: Path, paths: set[str]) -> list[str]:
    issues: list[str] = []
    for path in sorted(p for p in paths if is_plan_doc(p)):
        head = "\n".join(read_text(root, path).splitlines()[:80])
        has_source = any(marker in head for marker in ("Source plan:", "来源计划", "Parent plan:"))
        has_derived = any(marker in head for marker in ("Derived from:", "衍生自", "Document nature:", "文档性质"))
        if not has_source or not has_derived:
            issues.append(
                f"{path} should declare Source plan and Derived from / document nature near the top"
            )
    return issues


def is_forbidden_env_path(path: str) -> bool:
    name = Path(path).name
    return name.startswith(".env") and name != ".env.example"


def normalized_secret_value(value: str) -> str:
    return value.strip().strip("\"'").strip()


def is_placeholder_secret(value: str) -> bool:
    normalized = normalized_secret_value(value).lower()
    if normalized in SECRET_PLACEHOLDERS:
        return True
    if normalized.startswith(("test-", "test_")):
        return True
    if re.match(r"^(?:[a-z_$][\w$]*\.)*[a-z_$][\w$]*\(", normalized):
        return True
    if normalized.startswith("{") and normalized.endswith("}"):
        return True
    if normalized.startswith("${") and normalized.endswith("}"):
        return True
    if normalized.startswith("<") and normalized.endswith(">"):
        return True
    return False


def scan_for_secrets(root: Path, paths: set[str]) -> list[str]:
    issues: list[str] = []
    for path in sorted(paths):
        if is_forbidden_env_path(path):
            issues.append(f"{path} must not be committed or tracked")
            continue
        text = read_changed_text(root, path)
        if text is None:
            continue
        for pattern in SECRET_TOKEN_PATTERNS:
            if pattern.search(text):
                issues.append(f"{path} contains a token/private-key pattern")
                break
        for match in SECRET_ASSIGNMENT_RE.finditer(text):
            key_name = match.group(1)
            value = normalized_secret_value(match.group(2))
            if not is_placeholder_secret(value) and len(value) >= 8:
                issues.append(f"{path} may contain a real secret assignment for {key_name}")
                break
    return issues


def scan_risky_side_effects(root: Path, paths: set[str]) -> list[str]:
    issues: list[str] = []
    for path in sorted(paths):
        file_path = Path(path)
        if file_path.suffix.lower() not in EXECUTABLE_SIDE_EFFECT_SUFFIXES:
            continue
        if path == "governance/preflight.py" or ".test." in file_path.name:
            continue
        text = read_added_text(root, path)
        if text is None:
            continue
        for pattern in RISKY_SIDE_EFFECT_PATTERNS:
            match = pattern.search(text)
            if match:
                issues.append(f"{path} contains side-effect term needing review: {match.group(0)}")
                break
    return issues


def marker_versions(root: Path) -> set[str]:
    versions: set[str] = set()
    for path in ("AGENTS.md", AI_AGENT_LOG, "README.md"):
        text = read_text(root, path)
        for match in SKILL_MARKER_RE.finditer(text):
            versions.add(match.group("version"))
    return versions


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--tier", type=int, choices=(1, 2, 3, 4, 5), required=True)
    parser.add_argument("--strict-side-effects", action="store_true")
    parser.add_argument("--require-skill-marker", action="store_true")
    args = parser.parse_args(argv)

    root = resolve_repo_root(args.repo_root)
    _entries, paths = git_changed_paths(root)

    print(f"human-ai-governance preflight v{SKILL_VERSION}")
    print(f"repo_root: {root}")
    print(f"tier: {args.tier}")

    issues: list[str] = []
    if args.require_skill_marker:
        versions = marker_versions(root)
        if SKILL_VERSION not in versions:
            issues.append(
                f"expected Generated/adapted from human-ai-governance v{SKILL_VERSION} marker"
            )

    if not paths:
        if issues:
            print("FAIL: governance preflight found issues:")
            for issue in issues:
                print(f"- {issue}")
            return 1
        print("PASS: no working tree changes detected.")
        return 0

    print("changed paths:")
    for path in sorted(paths):
        print(f"- {path}")

    material_paths = {path for path in paths if is_material_path(path)}

    if args.tier >= 2 and material_paths and (root / CHANGELOG).exists():
        if CHANGELOG not in paths:
            issues.append(f"material changes detected, but {CHANGELOG} was not updated")
        else:
            issues.extend(validate_changelog(read_text(root, CHANGELOG)))

    if args.tier >= 3 and material_paths:
        if (root / AI_AGENT_LOG).exists():
            if AI_AGENT_LOG not in paths:
                issues.append(f"material changes detected, but {AI_AGENT_LOG} was not updated")
            else:
                issues.extend(validate_ai_log(read_text(root, AI_AGENT_LOG)))
        else:
            issues.append(f"Tier {args.tier} expects {AI_AGENT_LOG} or equivalent")

        if has_structure_sensitive_change(material_paths) and not architecture_changed(paths):
            if architecture_exists(root):
                issues.append(
                    "structure-sensitive changes detected, but no architecture/project map doc was updated"
                )
            else:
                issues.append(
                    "structure-sensitive changes detected, but no architecture/project map doc exists"
                )

        issues.extend(validate_plan_parent_markers(root, paths))

    issues.extend(scan_for_secrets(root, paths))

    if args.strict_side_effects:
        issues.extend(scan_risky_side_effects(root, material_paths))

    if issues:
        print("FAIL: governance preflight found issues:")
        for issue in issues:
            print(f"- {issue}")
        return 1

    print("PASS: governance preflight checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
