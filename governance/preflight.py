#!/usr/bin/env python3
"""Risk-scaled governance preflight for this repository.

Generated/adapted from human-ai-governance v0.7.1.

The repository runs this gate explicitly at Tier 3. Strict side-effect scanning
remains opt-in at the script level and is enabled by the project npm command.
Git inspection fails closed, while the project-tuned materiality, topology,
secret, and added-line side-effect boundaries remain authoritative.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

SKILL_VERSION = "0.7.1"
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
    re.compile(r"\b(place|submit|modify)_order\b", re.IGNORECASE),
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
    index_status: str
    worktree_status: str
    path: str
    original_path: str | None = None

    @property
    def status(self) -> str:
        return f"{self.index_status}{self.worktree_status}".strip()

    @property
    def index_changed(self) -> bool:
        return self.index_status not in {" ", "?", "!"}

    @property
    def worktree_changed(self) -> bool:
        return (
            self.index_status == self.worktree_status == "?"
            or self.worktree_status not in {" ", "?", "!"}
        )


@dataclass(frozen=True, slots=True)
class ChangeSet:
    entries: tuple[StatusEntry, ...]
    paths: frozenset[str]
    index_paths: frozenset[str]
    worktree_paths: frozenset[str]


@dataclass(frozen=True, slots=True)
class SnapshotText:
    path: str
    snapshot: str
    text: str


@dataclass(frozen=True, slots=True)
class LatestEntry:
    timestamp: str
    body: str


@dataclass(frozen=True, slots=True)
class RiskFinding:
    path: str
    term: str
    snapshot: str


class GitInspectionError(RuntimeError):
    """Raised when repository state or a required Git snapshot cannot be inspected."""


def run_git(root: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            ["git", "-c", "core.quotepath=false", *args],
            cwd=root,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except OSError as exc:
        raise GitInspectionError(f"cannot run Git in {root}: {exc}") from exc


def run_git_bytes(root: Path, args: list[str]) -> subprocess.CompletedProcess[bytes]:
    try:
        return subprocess.run(
            ["git", "-c", "core.quotepath=false", *args],
            cwd=root,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except OSError as exc:
        raise GitInspectionError(f"cannot run Git in {root}: {exc}") from exc


def git_failure(action: str, stderr: str | bytes) -> GitInspectionError:
    if isinstance(stderr, bytes):
        detail = stderr.decode("utf-8", errors="replace")
    else:
        detail = stderr
    first_line = next(
        (line.strip() for line in detail.splitlines() if line.strip()),
        "unknown error",
    )
    return GitInspectionError(f"{action} failed: {first_line}")


def resolve_repo_root(start: Path) -> Path:
    result = run_git(start, ["rev-parse", "--show-toplevel"])
    if result.returncode != 0:
        raise git_failure("git rev-parse --show-toplevel", result.stderr)
    resolved = result.stdout.rstrip("\r\n")
    if not resolved:
        raise GitInspectionError("git rev-parse --show-toplevel returned an empty path")
    return Path(resolved)


def parse_status(output: str) -> list[StatusEntry]:
    entries: list[StatusEntry] = []
    records = output.split("\0")
    index = 0
    while index < len(records):
        record = records[index]
        index += 1
        if not record:
            continue
        if len(record) < 4 or record[2] != " ":
            raise GitInspectionError("git status returned an invalid porcelain-v1 record")
        index_status, worktree_status = record[0], record[1]
        path = record[3:]
        original_path: str | None = None
        if index_status in {"R", "C"} or worktree_status in {"R", "C"}:
            if index >= len(records) or not records[index]:
                raise GitInspectionError("git status returned an incomplete rename/copy record")
            original_path = records[index]
            index += 1
        entries.append(
            StatusEntry(
                index_status=index_status,
                worktree_status=worktree_status,
                path=path,
                original_path=original_path,
            )
        )
    return entries


def git_changed_paths(root: Path) -> ChangeSet:
    status = run_git_bytes(
        root,
        ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    )
    if status.returncode != 0:
        raise git_failure("git status --porcelain=v1", status.stderr)

    output = status.stdout.decode(sys.getfilesystemencoding(), errors="surrogateescape")
    entries = parse_status(output)
    paths = frozenset(entry.path for entry in entries)
    index_paths = frozenset(
        entry.path
        for entry in entries
        if entry.index_changed and entry.index_status != "D"
    )
    worktree_paths = frozenset(
        entry.path
        for entry in entries
        if entry.worktree_changed and entry.worktree_status != "D"
    )
    return ChangeSet(tuple(entries), paths, index_paths, worktree_paths)


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
    if Path(relative_path).suffix.lower() in IGNORED_SUFFIXES:
        return None
    result = run_git_bytes(root, ["show", f":{relative_path}"])
    if result.returncode != 0:
        raise git_failure(
            f"read staged content for {display_path(relative_path)}",
            result.stderr,
        )
    try:
        return result.stdout.decode("utf-8")
    except UnicodeDecodeError:
        return None


def build_snapshot_map(
    root: Path,
    changes: ChangeSet,
) -> dict[str, tuple[SnapshotText, ...]]:
    snapshots: dict[str, tuple[SnapshotText, ...]] = {}
    for path in sorted(changes.paths):
        items: list[SnapshotText] = []
        if path in changes.index_paths:
            index_text = read_index_text(root, path)
            if index_text is not None:
                items.append(SnapshotText(path, "staged index", index_text))
        if path in changes.worktree_paths:
            worktree_text = read_changed_text(root, path)
            if worktree_text is not None:
                items.append(SnapshotText(path, "working tree", worktree_text))
        snapshots[path] = tuple(items)
    return snapshots


def display_path(path: str) -> str:
    has_surrogate = any(0xD800 <= ord(character) <= 0xDFFF for character in path)
    if (
        path != path.strip()
        or any(character in path for character in "\0\n\r\t")
        or has_surrogate
    ):
        return json.dumps(path, ensure_ascii=True)
    return path


def snapshot_note(snapshot: SnapshotText) -> str:
    return f" in {snapshot.snapshot}"


def read_diff_added_text(
    root: Path,
    relative_path: str,
    *,
    staged: bool,
) -> str:
    args = ["diff"]
    if staged:
        args.append("--cached")
    args.extend(
        ["--unified=0", "--no-ext-diff", "--no-textconv", "--", relative_path]
    )
    result = run_git_bytes(root, args)
    if result.returncode != 0:
        snapshot = "staged index" if staged else "working tree"
        raise git_failure(
            f"read added lines for {display_path(relative_path)} in {snapshot}",
            result.stderr,
        )
    added_lines = [
        line[1:]
        for line in result.stdout.splitlines()
        if line.startswith(b"+") and not line.startswith(b"+++")
    ]
    return b"\n".join(added_lines).decode("utf-8", errors="replace")


def build_added_line_snapshot_map(
    root: Path,
    changes: ChangeSet,
    snapshots: dict[str, tuple[SnapshotText, ...]],
) -> dict[str, tuple[SnapshotText, ...]]:
    """Return added-line evidence without re-scanning unchanged legacy code."""
    entries_by_path = {entry.path: entry for entry in changes.entries}
    added_snapshots: dict[str, tuple[SnapshotText, ...]] = {}
    for path in sorted(changes.paths):
        if not is_material_path(path) or not is_risky_side_effect_path(path):
            added_snapshots[path] = ()
            continue
        items: list[SnapshotText] = []
        if path in changes.index_paths:
            items.append(
                SnapshotText(
                    path,
                    "staged index",
                    read_diff_added_text(root, path, staged=True),
                )
            )
        if path in changes.worktree_paths:
            entry = entries_by_path[path]
            if entry.index_status == entry.worktree_status == "?":
                worktree_snapshot = next(
                    (
                        snapshot
                        for snapshot in snapshots.get(path, ())
                        if snapshot.snapshot == "working tree"
                    ),
                    None,
                )
                if worktree_snapshot is not None:
                    items.append(worktree_snapshot)
            else:
                items.append(
                    SnapshotText(
                        path,
                        "working tree",
                        read_diff_added_text(root, path, staged=False),
                    )
                )
        added_snapshots[path] = tuple(items)
    return added_snapshots


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


def is_risky_side_effect_path(path: str) -> bool:
    return (
        any(path.startswith(prefix) for prefix in RISK_SCAN_PREFIXES)
        and Path(path).suffix.lower() in EXECUTABLE_SIDE_EFFECT_SUFFIXES
        and path != "governance/preflight.py"
        and not is_test_path(path)
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
        relevant_paths = [entry.path]
        if entry.original_path is not None:
            relevant_paths.append(entry.original_path)
        relevant_paths = [path for path in relevant_paths if not is_test_path(path)]
        if any(
            path.startswith(prefix)
            for path in relevant_paths
            for prefix in STRUCTURE_ALWAYS_PREFIXES
        ):
            return True
        if is_topology_status(entry.status) and any(
            path.startswith(prefix)
            for path in relevant_paths
            for prefix in STRUCTURE_TOPOLOGY_PREFIXES
        ):
            return True
    return False


def material_changed_paths(entries: list[StatusEntry], paths: set[str]) -> set[str]:
    material_paths = {path for path in paths if is_material_path(path)}
    material_paths.update(
        entry.original_path
        for entry in entries
        if entry.original_path is not None and is_material_path(entry.original_path)
    )
    return material_paths


def is_plan_doc(path: str) -> bool:
    return path.endswith(".md") and any(path.startswith(prefix) for prefix in PLAN_DOC_PREFIXES)


def is_root_plan_doc(path: str, text: str) -> bool:
    if any(pattern.search(path) for pattern in ROOT_PLAN_NAME_PATTERNS):
        return True
    head = "\n".join(text.splitlines()[:80])
    return bool(ROOT_PLAN_CONTENT_RE.search(head))


def validate_plan_parent_markers(
    paths: set[str],
    snapshots: dict[str, tuple[SnapshotText, ...]],
) -> list[str]:
    issues: list[str] = []
    for path in sorted(p for p in paths if is_plan_doc(p)):
        for snapshot in snapshots.get(path, ()):
            if is_root_plan_doc(path, snapshot.text):
                continue
            head = "\n".join(snapshot.text.splitlines()[:80])
            has_source = any(
                marker in head
                for marker in ("Source plan:", "来源计划", "Parent plan:")
            )
            has_derived = any(
                marker in head
                for marker in (
                    "Derived from:",
                    "衍生自",
                    "Document nature:",
                    "文档性质",
                )
            )
            if not has_source or not has_derived:
                issues.append(
                    f"{display_path(path)} should declare Source plan and Derived from / "
                    f"document nature near the top{snapshot_note(snapshot)}"
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


def scan_for_secrets(
    snapshots: dict[str, tuple[SnapshotText, ...]],
) -> list[str]:
    issues: list[str] = []
    for path in sorted(snapshots):
        for snapshot in snapshots[path]:
            if is_forbidden_env_path(path):
                issues.append(
                    f"{display_path(path)} must not be committed or tracked"
                    f"{snapshot_note(snapshot)}"
                )
                continue
            if any(pattern.search(snapshot.text) for pattern in SECRET_TOKEN_PATTERNS):
                issues.append(
                    f"{display_path(path)} contains a token/private-key pattern"
                    f"{snapshot_note(snapshot)}"
                )
                continue
            for match in SECRET_ASSIGNMENT_RE.finditer(snapshot.text):
                key_name = match.group(1)
                value = normalized_secret_value(match.group(2))
                if not is_placeholder_secret(value) and len(value) >= 8:
                    issues.append(
                        f"{display_path(path)} may contain a real secret assignment for "
                        f"{key_name}{snapshot_note(snapshot)}"
                    )
                    break
    return issues


def scan_risky_side_effects(
    snapshots: dict[str, tuple[SnapshotText, ...]],
    paths: set[str],
) -> list[RiskFinding]:
    findings: list[RiskFinding] = []
    for path in sorted(paths):
        if not is_risky_side_effect_path(path):
            continue
        for snapshot in snapshots.get(path, ()):
            for pattern in RISKY_SIDE_EFFECT_PATTERNS:
                match = pattern.search(snapshot.text)
                if match:
                    findings.append(
                        RiskFinding(
                            path=path,
                            term=match.group(0),
                            snapshot=snapshot.snapshot,
                        )
                    )
                    break
    return findings


def instruction_size_warnings(
    snapshots: dict[str, tuple[SnapshotText, ...]],
) -> list[str]:
    warnings: list[str] = []
    for relative_path in AGENTS_CANDIDATES:
        for snapshot in snapshots.get(relative_path, ()):
            size = len(snapshot.text.encode("utf-8"))
            if size > AGENTS_COMMON_LIMIT_BYTES:
                warnings.append(
                    f"{relative_path} is {size} bytes{snapshot_note(snapshot)}; it exceeds the "
                    "common 32 KiB project-doc budget, so move history or transient status to "
                    "canonical linked docs"
                )
            elif size > AGENTS_ADVISORY_BYTES:
                warnings.append(
                    f"{relative_path} is {size} bytes{snapshot_note(snapshot)}; review it before "
                    "it approaches the common 32 KiB project-doc budget"
                )
    return warnings


def marker_versions(
    root: Path,
    snapshots: dict[str, tuple[SnapshotText, ...]],
    changed_paths: set[str],
) -> set[str]:
    versions: set[str] = set()
    candidate_paths = ("AGENTS.md", AI_AGENT_LOG, "README.md")
    for path in candidate_paths:
        texts = (
            [snapshot.text for snapshot in snapshots.get(path, ())]
            if path in changed_paths
            else [read_text(root, path)]
        )
        for text in texts:
            for match in SKILL_MARKER_RE.finditer(text):
                versions.add(match.group("version"))
    return versions


def changed_marker_issues(
    snapshots: dict[str, tuple[SnapshotText, ...]],
) -> list[str]:
    issues: list[str] = []
    candidate_paths = {
        "AGENTS.md",
        "AGENTS.override.md",
        AI_AGENT_LOG,
        "README.md",
    }
    for path in sorted(candidate_paths.intersection(snapshots)):
        for snapshot in snapshots[path]:
            versions = {
                match.group("version")
                for match in SKILL_MARKER_RE.finditer(snapshot.text)
            }
            if versions and SKILL_VERSION not in versions:
                found = ", ".join(sorted(versions))
                issues.append(
                    f"skill marker is stale in {display_path(path)}"
                    f"{snapshot_note(snapshot)}: found {found}; expected {SKILL_VERSION}"
                )
    return issues


def validate_snapshot_documents(
    path: str,
    snapshots: dict[str, tuple[SnapshotText, ...]],
    validator: Callable[[str], list[str]],
) -> list[str]:
    issues: list[str] = []
    items = snapshots.get(path, ())
    if not items:
        return [f"{display_path(path)} changed but has no readable retained snapshot"]
    for snapshot in items:
        for issue in validator(snapshot.text):
            issues.append(f"{issue}{snapshot_note(snapshot)}")
    return issues


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
    parser.add_argument(
        "--reviewed-side-effect-path",
        action="append",
        default=[],
        metavar="PATH",
        help=(
            "acknowledge strict-scan findings in this changed path after reviewing the current "
            "diff; repeat for multiple paths and do not treat this as runtime authorization"
        ),
    )
    parser.add_argument("--require-skill-marker", action="store_true")
    args = parser.parse_args(argv)

    print(f"human-ai-governance preflight v{SKILL_VERSION}")
    print(f"tier: {args.tier}")

    try:
        root = resolve_repo_root(args.repo_root)
        changes = git_changed_paths(root)
        snapshots = build_snapshot_map(root, changes)
        added_line_snapshots = (
            build_added_line_snapshot_map(root, changes, snapshots)
            if args.strict_side_effects
            else {}
        )
    except GitInspectionError as exc:
        print(f"repo_root: {args.repo_root.resolve()}")
        print("FAIL: governance preflight could not inspect repository state:")
        print(f"- {exc}")
        return 1

    print(f"repo_root: {root}")
    entries = list(changes.entries)
    paths = set(changes.paths)

    marker_issues: list[str] = []
    warnings = instruction_size_warnings(snapshots)
    if args.require_skill_marker:
        versions = marker_versions(root, snapshots, paths)
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
        else:
            marker_issues.extend(changed_marker_issues(snapshots))

    if not paths:
        print_warnings(warnings)
        if marker_issues:
            print("FAIL: governance preflight found issues:")
            for issue in marker_issues:
                print(f"- {issue}")
            return 1
        print("PASS: no staged, unstaged, or untracked changes detected.")
        return 0

    print("changed paths:")
    for path in sorted(paths):
        print(f"- {display_path(path)}")

    material_paths = material_changed_paths(entries, paths)
    issues: list[str] = list(marker_issues)

    if args.tier >= 2 and material_paths:
        if (root / CHANGELOG).exists():
            if CHANGELOG not in paths:
                issues.append(f"material changes detected, but {CHANGELOG} was not updated")
            else:
                issues.extend(
                    validate_snapshot_documents(
                        CHANGELOG,
                        snapshots,
                        validate_changelog,
                    )
                )

    if args.tier >= 3:
        issues.extend(validate_plan_parent_markers(paths, snapshots))

        if material_paths:
            if (root / AI_AGENT_LOG).exists():
                if AI_AGENT_LOG not in paths:
                    issues.append(f"material changes detected, but {AI_AGENT_LOG} was not updated")
                else:
                    issues.extend(
                        validate_snapshot_documents(
                            AI_AGENT_LOG,
                            snapshots,
                            validate_ai_log,
                        )
                    )
            else:
                issues.append(
                    f"Tier {args.tier} expects {AI_AGENT_LOG} or a project-specific equivalent"
                )

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

    issues.extend(scan_for_secrets(snapshots))

    if args.strict_side_effects:
        reviewed_paths = {
            path[2:] if path.startswith("./") else path
            for path in args.reviewed_side_effect_path
        }
        for finding in scan_risky_side_effects(
            added_line_snapshots,
            material_paths,
        ):
            message = (
                f"{display_path(finding.path)} contains side-effect term needing review: "
                f"{finding.term} in {finding.snapshot}"
            )
            if finding.path in reviewed_paths:
                warnings.append(
                    f"{message}; current diff acknowledged, but runtime authorization still applies"
                )
            else:
                issues.append(message)

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
