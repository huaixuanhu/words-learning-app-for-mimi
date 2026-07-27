#!/usr/bin/env python3
"""Risk-scaled governance preflight for this repository.

Generated/adapted from human-ai-governance v0.4.0.

The repository runs this gate explicitly at Tier 3. Strict side-effect scanning
remains opt-in at the script level and is enabled by the project npm command.
"""

from __future__ import annotations

import argparse
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

SKILL_VERSION = "0.4.0"
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

# Project-tuned materiality. Ordinary documentation, contract-preserving tests,
# and lockfile-only churn stay non-material, while secret scanning still covers
# every changed readable file.
MATERIAL_EXACT = {
    ".gitignore",
    "AGENTS.md",
    "eslint.config.mjs",
    "next.config.ts",
    "package.json",
    "postcss.config.mjs",
    "pyproject.toml",
    "requirements.txt",
    "tsconfig.json",
    "vercel.json",
    "vitest.config.ts",
}
MATERIAL_PREFIXES = (
    ".github/workflows/",
    "db/migrations/",
    "governance/",
    "plan_docs/",
    "scripts/",
    "src/",
)

# Architecture synchronization is mechanical only for module/tool topology and
# migrations. Semantic responsibility changes remain a review-time judgment.
STRUCTURE_TOPOLOGY_PREFIXES = (
    "scripts/",
    "src/",
)
STRUCTURE_ALWAYS_PREFIXES = (
    "db/migrations/",
)

ROOT_PLAN_NAME_PATTERNS = (
    re.compile(r"(?:^|/)PLAN\.md$", re.IGNORECASE),
    re.compile(r"(?:^|/)MASTER_PLAN\.md$", re.IGNORECASE),
    re.compile(r"(?:^|/)PLAN_[^/]*_MASTER\.md$", re.IGNORECASE),
)
ROOT_PLAN_CONTENT_RE = re.compile(
    r"(?im)^(?:plan role|document nature|文档性质)\s*[:：].*(?:root plan|master plan|主计划)"
)

AGENTS_CANDIDATES = ("AGENTS.md", "AGENTS.override.md")
AGENTS_ADVISORY_BYTES = 24 * 1024
AGENTS_COMMON_LIMIT_BYTES = 32 * 1024

# Strict scanning stays limited to executable runtime/operational paths. The
# npm command enables it because this repository contains guarded remote and
# Production-capable scripts.
RISK_SCAN_PREFIXES = (
    "db/migrations/",
    "scripts/",
    "src/",
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
            source, target = payload.split(" -> ", 1)
            for path in (strip_git_quotes(source.strip()), strip_git_quotes(target.strip())):
                if path:
                    entries.append(StatusEntry(status=status, path=path))
            continue
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


def read_index_text(root: Path, relative_path: str) -> str | None:
    """Return the prospective committed content for a path when it exists in the index."""
    if Path(relative_path).suffix.lower() in IGNORED_SUFFIXES:
        return None
    result = subprocess.run(
        ["git", "show", f":{relative_path}"],
        cwd=root,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        return None
    try:
        return result.stdout.decode("utf-8")
    except UnicodeDecodeError:
        return None


def read_changed_text_variants(root: Path, relative_path: str) -> list[str]:
    """Return distinct working-tree and staged-index text for secret scanning."""
    texts: list[str] = []
    for text in (
        read_changed_text(root, relative_path),
        read_index_text(root, relative_path),
    ):
        if text is not None and text not in texts:
            texts.append(text)
    return texts


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


def is_test_path(path: str) -> bool:
    file_name = Path(path).name
    parts = path.split("/")
    return (
        "tests" in parts
        or "__tests__" in parts
        or file_name.startswith("test_")
        or ".test." in file_name
        or ".spec." in file_name
    )


def is_material_path(path: str) -> bool:
    if path in {CHANGELOG, AI_AGENT_LOG, *ARCHITECTURE_CANDIDATES}:
        return False
    if is_test_path(path):
        return False
    if path in MATERIAL_EXACT:
        return True
    return any(path.startswith(prefix) for prefix in MATERIAL_PREFIXES)


def architecture_changed(paths: set[str]) -> bool:
    return any(path in paths for path in ARCHITECTURE_CANDIDATES)


def architecture_exists(root: Path) -> bool:
    return any((root / path).exists() for path in ARCHITECTURE_CANDIDATES)


def is_topology_status(status: str) -> bool:
    return status == "??" or any(flag in status for flag in ("A", "D", "R", "C"))


def has_structure_sensitive_change(entries: list[StatusEntry]) -> bool:
    for entry in entries:
        if is_test_path(entry.path):
            continue
        if any(entry.path.startswith(prefix) for prefix in STRUCTURE_ALWAYS_PREFIXES):
            return True
        if is_topology_status(entry.status) and any(
            entry.path.startswith(prefix) for prefix in STRUCTURE_TOPOLOGY_PREFIXES
        ):
            return True
    return False


def is_plan_doc(path: str) -> bool:
    return path.endswith(".md") and any(path.startswith(prefix) for prefix in PLAN_DOC_PREFIXES)


def is_root_plan_doc(root: Path, path: str) -> bool:
    if any(pattern.search(path) for pattern in ROOT_PLAN_NAME_PATTERNS):
        return True
    head = "\n".join(read_text(root, path).splitlines()[:80])
    return bool(ROOT_PLAN_CONTENT_RE.search(head))


def validate_plan_parent_markers(root: Path, paths: set[str]) -> list[str]:
    issues: list[str] = []
    for path in sorted(p for p in paths if is_plan_doc(p)):
        if not (root / path).is_file():
            continue
        if is_root_plan_doc(root, path):
            continue
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
            if (root / path).exists() or read_index_text(root, path) is not None:
                issues.append(f"{path} must not be committed or tracked")
            continue
        for text in read_changed_text_variants(root, path):
            if any(pattern.search(text) for pattern in SECRET_TOKEN_PATTERNS):
                issues.append(f"{path} contains a token/private-key pattern")
                break
            secret_assignment = next(
                (
                    match.group(1)
                    for match in SECRET_ASSIGNMENT_RE.finditer(text)
                    if not is_placeholder_secret(match.group(2)) and len(
                        normalized_secret_value(match.group(2))
                    )
                    >= 8
                ),
                None,
            )
            if secret_assignment is not None:
                issues.append(
                    f"{path} may contain a real secret assignment for {secret_assignment}"
                )
                break
    return issues


def scan_risky_side_effects(root: Path, paths: set[str]) -> list[str]:
    issues: list[str] = []
    for path in sorted(paths):
        if not any(path.startswith(prefix) for prefix in RISK_SCAN_PREFIXES):
            continue
        file_path = Path(path)
        if file_path.suffix.lower() not in EXECUTABLE_SIDE_EFFECT_SUFFIXES:
            continue
        if path == "governance/preflight.py" or is_test_path(path):
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


def instruction_size_warnings(root: Path, changed_paths: set[str]) -> list[str]:
    warnings: list[str] = []
    for relative_path in AGENTS_CANDIDATES:
        if relative_path not in changed_paths:
            continue
        path = root / relative_path
        if not path.exists() or not path.is_file():
            continue
        size = path.stat().st_size
        if size > AGENTS_COMMON_LIMIT_BYTES:
            warnings.append(
                f"{relative_path} is {size} bytes; it exceeds the common 32 KiB project-doc "
                "budget, so move history or transient status to canonical linked docs"
            )
        elif size > AGENTS_ADVISORY_BYTES:
            warnings.append(
                f"{relative_path} is {size} bytes; review it before it approaches the common "
                "32 KiB project-doc budget"
            )
    return warnings


def marker_versions(root: Path) -> set[str]:
    versions: set[str] = set()
    for path in ("AGENTS.md", AI_AGENT_LOG, "README.md"):
        text = read_text(root, path)
        for match in SKILL_MARKER_RE.finditer(text):
            versions.add(match.group("version"))
    return versions


def print_warnings(warnings: list[str]) -> None:
    if not warnings:
        return
    print("WARN: governance preflight advisories:")
    for warning in warnings:
        print(f"- {warning}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--tier", type=int, choices=(1, 2, 3, 4, 5), required=True)
    parser.add_argument("--strict-side-effects", action="store_true")
    parser.add_argument("--require-skill-marker", action="store_true")
    args = parser.parse_args(argv)

    root = resolve_repo_root(args.repo_root)
    entries, paths = git_changed_paths(root)

    print(f"human-ai-governance preflight v{SKILL_VERSION}")
    print(f"repo_root: {root}")
    print(f"tier: {args.tier}")

    marker_issues: list[str] = []
    warnings = instruction_size_warnings(root, paths)
    if args.require_skill_marker:
        versions = marker_versions(root)
        if not versions:
            marker_issues.append(
                "no Generated/adapted from human-ai-governance vX.Y.Z marker found; "
                f"expected v{SKILL_VERSION}"
            )
        elif SKILL_VERSION not in versions:
            found = ", ".join(sorted(versions))
            marker_issues.append(
                f"skill marker is stale: found {found}; expected {SKILL_VERSION}"
            )

    if not paths:
        print_warnings(warnings)
        if marker_issues:
            print("FAIL: governance preflight found issues:")
            for issue in marker_issues:
                print(f"- {issue}")
            return 1
        print("PASS: no working tree changes detected.")
        return 0

    print("changed paths:")
    for path in sorted(paths):
        print(f"- {path}")

    material_paths = {path for path in paths if is_material_path(path)}
    issues: list[str] = list(marker_issues)

    if args.tier >= 2 and material_paths and (root / CHANGELOG).exists():
        if CHANGELOG not in paths:
            issues.append(f"material changes detected, but {CHANGELOG} was not updated")
        else:
            issues.extend(validate_changelog(read_text(root, CHANGELOG)))

    if args.tier >= 3:
        issues.extend(validate_plan_parent_markers(root, paths))

        if material_paths:
            if (root / AI_AGENT_LOG).exists():
                if AI_AGENT_LOG not in paths:
                    issues.append(f"material changes detected, but {AI_AGENT_LOG} was not updated")
                else:
                    issues.extend(validate_ai_log(read_text(root, AI_AGENT_LOG)))
            else:
                issues.append(f"Tier {args.tier} expects {AI_AGENT_LOG} or equivalent")

            if has_structure_sensitive_change(entries) and not architecture_changed(paths):
                if architecture_exists(root):
                    issues.append(
                        "module-topology or migration changes detected, but no "
                        "architecture/project map doc was updated"
                    )
                else:
                    issues.append(
                        "module-topology or migration changes detected, but no "
                        "architecture/project map doc exists"
                    )

    issues.extend(scan_for_secrets(root, paths))

    if args.strict_side_effects:
        issues.extend(scan_risky_side_effects(root, material_paths))

    print_warnings(warnings)
    if issues:
        print("FAIL: governance preflight found issues:")
        for issue in issues:
            print(f"- {issue}")
        return 1

    print("PASS: governance preflight checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
