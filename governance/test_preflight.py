from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from governance import preflight


PREFLIGHT_SCRIPT = Path(preflight.__file__).resolve()


class TemporaryGitRepository:
    """Small committed repository used to exercise preflight against real Git state."""

    def __init__(
        self,
        *,
        marker_version: str = "0.7.1",
        source_text: str = "export const baseline = true;\n",
    ) -> None:
        self._temporary_directory = tempfile.TemporaryDirectory(
            prefix="governance-preflight-"
        )
        self.root = Path(self._temporary_directory.name)
        self._git("init", "--quiet")
        self._git("config", "user.email", "preflight@example.invalid")
        self._git("config", "user.name", "Governance Preflight Test")
        self._git("config", "commit.gpgsign", "false")

        self.write(
            "AGENTS.md",
            (
                "# Test governance\n\n"
                f"<!-- Generated/adapted from human-ai-governance v{marker_version} -->\n"
            ),
        )
        self.write("ARCHITECTURE.md", "# Architecture\n\nBaseline topology.\n")
        self.write(
            "CHANGELOG.md",
            "## 2026-07-25 09:00 AEST\n\n- Baseline.\n- Reason: Test fixture.\n",
        )
        self.write(
            "governance/AI_AGENT_LOG.md",
            (
                "## 2026-07-25 09:00 AEST\n\n"
                "- Task: Create baseline fixture.\n"
                "- Plan agreed: Yes.\n"
                "- Changed files: Fixture files.\n"
                "- Reason: Test setup.\n"
                "- Validation: Initial commit created.\n"
                "- Safety notes: Local temporary repository only.\n"
            ),
        )
        self.write("README.md", "# Fixture\n")
        self.write("package-lock.json", '{"lockfileVersion": 3}\n')
        self.write("src/existing.ts", source_text)
        self.write("tests/existing.test.ts", "export const fixture = true;\n")
        self.write(
            "db/migrations/0001_initial.sql",
            "create table example_fixture (id integer primary key);\n",
        )
        self._git("add", ".")
        self._git("commit", "--quiet", "-m", "test baseline")

    def cleanup(self) -> None:
        self._temporary_directory.cleanup()

    def write(self, relative_path: str, text: str) -> None:
        path = self.root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def append(self, relative_path: str, text: str) -> None:
        path = self.root / relative_path
        path.write_text(path.read_text(encoding="utf-8") + text, encoding="utf-8")

    def remove(self, relative_path: str) -> None:
        (self.root / relative_path).unlink()

    def stage(self, relative_path: str) -> None:
        self._git("add", "--", relative_path)

    def move(self, source: str, target: str) -> None:
        (self.root / target).parent.mkdir(parents=True, exist_ok=True)
        self._git("mv", "--", source, target)

    def commit_all(self, message: str) -> None:
        self._git("add", "--all")
        self._git("commit", "--quiet", "-m", message)

    def status(self) -> str:
        return self._git("status", "--short", "--untracked-files=all").stdout

    def _git(self, *args: str) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(
            ["git", *args],
            cwd=self.root,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if result.returncode != 0:
            self.cleanup()
            raise AssertionError(
                f"git {' '.join(args)} failed ({result.returncode}): {result.stderr}"
            )
        return result


class PreflightV071ContractTests(unittest.TestCase):
    maxDiff = None

    def make_repository(
        self,
        *,
        marker_version: str = "0.7.1",
        source_text: str = "export const baseline = true;\n",
    ) -> TemporaryGitRepository:
        repository = TemporaryGitRepository(
            marker_version=marker_version,
            source_text=source_text,
        )
        self.addCleanup(repository.cleanup)
        return repository

    def run_preflight(
        self,
        repository: TemporaryGitRepository,
        *,
        strict_side_effects: bool = False,
        reviewed_side_effect_paths: tuple[str, ...] = (),
    ) -> subprocess.CompletedProcess[str]:
        command = [
            sys.executable,
            str(PREFLIGHT_SCRIPT),
            "--repo-root",
            str(repository.root),
            "--tier",
            "3",
            "--require-skill-marker",
        ]
        if strict_side_effects:
            command.append("--strict-side-effects")
        for path in reviewed_side_effect_paths:
            command.extend(("--reviewed-side-effect-path", path))
        return subprocess.run(
            command,
            cwd=repository.root,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

    def record_material_change(
        self, repository: TemporaryGitRepository, changed_path: str
    ) -> None:
        repository.write(
            "CHANGELOG.md",
            (
                "## 2026-07-26 10:15 AEST\n\n"
                f"- Covered `{changed_path}` in the test fixture.\n"
                "- Reason: Verify the v0.7.1 preflight contract.\n"
            ),
        )
        repository.write(
            "governance/AI_AGENT_LOG.md",
            (
                "## 2026-07-26 10:15 AEST\n\n"
                "- Task: Exercise a material-change fixture.\n"
                "- Plan agreed: Yes; bounded local test.\n"
                f"- Changed files: {changed_path} and governance records.\n"
                "- Reason: Verify the v0.7.1 preflight contract.\n"
                "- Validation: The current unittest owns the assertion.\n"
                "- Safety notes: Temporary local Git repository; no remote access.\n"
            ),
        )

    @staticmethod
    def combined_output(result: subprocess.CompletedProcess[str]) -> str:
        return result.stdout + result.stderr

    @staticmethod
    def inspect_repository(
        repository: TemporaryGitRepository,
    ) -> tuple[
        preflight.ChangeSet,
        dict[str, tuple[preflight.SnapshotText, ...]],
    ]:
        changes = preflight.git_changed_paths(repository.root)
        snapshots = preflight.build_snapshot_map(repository.root, changes)
        return changes, snapshots

    def test_stale_marker_fails_even_when_worktree_is_clean(self) -> None:
        repository = self.make_repository(marker_version="0.3.0")

        self.assertEqual("", repository.status())
        result = self.run_preflight(repository)
        output = self.combined_output(result)

        self.assertEqual(1, result.returncode, output)
        self.assertIn("FAIL:", output)
        self.assertIn("v0.7.1", output)

    def test_non_repository_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory(prefix="governance-not-repository-") as temp:
            root = Path(temp)
            result = subprocess.run(
                [
                    sys.executable,
                    str(PREFLIGHT_SCRIPT),
                    "--repo-root",
                    str(root),
                    "--tier",
                    "1",
                ],
                cwd=root,
                check=False,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

        output = self.combined_output(result)
        self.assertEqual(1, result.returncode, output)
        self.assertIn("could not inspect repository state", output)
        self.assertNotIn("no staged, unstaged, or untracked changes", output)

    def test_root_master_plan_is_exempt_from_parent_markers(self) -> None:
        repository = self.make_repository()
        path = "plan_docs/PLAN_V1_MASTER.md"
        repository.write(path, "# V1 master plan\n\nCanonical root plan.\n")
        self.record_material_change(repository, path)

        changes, snapshots = self.inspect_repository(repository)

        self.assertEqual(
            [],
            preflight.validate_plan_parent_markers(set(changes.paths), snapshots),
        )
        result = self.run_preflight(repository)
        self.assertEqual(0, result.returncode, self.combined_output(result))

    def test_child_plan_without_parent_markers_fails(self) -> None:
        repository = self.make_repository()
        path = "plan_docs/PLAN_V2_STAGE99_EXAMPLE.md"
        repository.write(path, "# Child plan\n\nNo lineage metadata.\n")
        self.record_material_change(repository, path)

        changes, snapshots = self.inspect_repository(repository)
        issues = preflight.validate_plan_parent_markers(
            set(changes.paths),
            snapshots,
        )
        self.assertEqual(1, len(issues))
        self.assertIn(path, issues[0])
        result = self.run_preflight(repository)
        output = self.combined_output(result)

        self.assertEqual(1, result.returncode, output)
        self.assertIn(path, output)
        self.assertIn("Source plan", output)

    def test_non_material_paths_still_receive_secret_scanning(self) -> None:
        secret_assignment = "".join(
            ("api_", "key", ' = "', "synthetic_fixture_value", '"\n')
        )
        paths = (
            "README.md",
            "tests/existing.test.ts",
            "package-lock.json",
        )

        for path in paths:
            with self.subTest(path=path):
                repository = self.make_repository()
                repository.append(path, secret_assignment)

                self.assertFalse(preflight.is_material_path(path))
                result = self.run_preflight(repository)
                output = self.combined_output(result)

                self.assertEqual(1, result.returncode, output)
                self.assertIn(path, output)
                self.assertIn("secret assignment", output)
                self.assertIn("working tree", output)
                self.assertNotIn("material changes detected", output)

    def test_secret_scan_names_worktree_snapshot_when_index_is_safe(self) -> None:
        repository = self.make_repository()
        path = "docs/worktree-secret.md"
        repository.write(path, "safe fixture\n")
        repository.stage(path)
        secret_value = "".join(("working_", "fixture_", "value"))
        repository.write(
            path,
            "".join(("api_", "key", ' = "', secret_value, '"\n')),
        )

        result = self.run_preflight(repository)
        output = self.combined_output(result)

        self.assertEqual(1, result.returncode, output)
        self.assertIn(path, output)
        self.assertIn("working tree", output)
        self.assertNotIn(secret_value, output)

    def test_secret_scan_preserves_unicode_and_trailing_space_paths(self) -> None:
        cases = (
            ("docs/秘密.md", "docs/秘密.md"),
            ("docs/trailing.md ", '"docs/trailing.md "'),
        )
        for path, expected_display in cases:
            with self.subTest(path=path):
                repository = self.make_repository()
                secret_value = "".join(("path_", "fixture_", "value"))
                repository.write(
                    path,
                    "".join(("api_", "key", ' = "', secret_value, '"\n')),
                )

                result = self.run_preflight(repository)
                output = self.combined_output(result)

                self.assertEqual(1, result.returncode, output)
                self.assertIn(expected_display, output)
                self.assertIn("secret assignment", output)
                self.assertNotIn(secret_value, output)

    def test_staged_child_plan_cannot_hide_behind_valid_worktree(self) -> None:
        repository = self.make_repository()
        path = "plan_docs/PLAN_V2_STAGE99_STAGED.md"
        repository.write(path, "# Staged child plan without lineage\n")
        repository.stage(path)
        repository.write(
            path,
            (
                "# Working child plan\n\n"
                "Source plan: `plan_docs/PLAN_V2_MASTER.md`\n\n"
                "Derived from: the accepted master plan\n"
            ),
        )
        self.record_material_change(repository, path)

        result = self.run_preflight(repository)
        output = self.combined_output(result)

        self.assertEqual(1, result.returncode, output)
        self.assertIn(path, output)
        self.assertIn("staged index", output)

    def test_staged_marker_cannot_hide_behind_current_worktree(self) -> None:
        repository = self.make_repository()
        repository.write(
            "AGENTS.md",
            "<!-- Generated/adapted from human-ai-governance v0.5.0 -->\n",
        )
        repository.stage("AGENTS.md")
        repository.write(
            "AGENTS.md",
            "<!-- Generated/adapted from human-ai-governance v0.7.1 -->\n",
        )
        self.record_material_change(repository, "AGENTS.md")

        result = self.run_preflight(repository)
        output = self.combined_output(result)

        self.assertEqual(1, result.returncode, output)
        self.assertIn("skill marker is stale in AGENTS.md in staged index", output)

    def test_staged_invalid_changelog_cannot_hide_behind_valid_worktree(self) -> None:
        repository = self.make_repository()
        path = "src/existing.ts"
        repository.append(path, "export const material = true;\n")
        repository.write("CHANGELOG.md", "# Invalid staged changelog\n")
        repository.stage("CHANGELOG.md")
        self.record_material_change(repository, path)

        result = self.run_preflight(repository)
        output = self.combined_output(result)

        self.assertEqual(1, result.returncode, output)
        self.assertIn("CHANGELOG.md needs a latest minute-level timestamp", output)
        self.assertIn("staged index", output)

    def test_staged_env_deletion_has_no_retained_secret_snapshot(self) -> None:
        repository = self.make_repository()
        path = ".env"
        repository.write(path, "placeholder=true\n")
        repository.commit_all("add legacy environment fixture")
        repository.remove(path)
        repository.stage(path)

        result = self.run_preflight(repository)
        self.assertEqual(0, result.returncode, self.combined_output(result))

    def test_secret_scan_checks_staged_index_when_worktree_differs(self) -> None:
        secret_assignment = "".join(
            ("api_", "key", ' = "', "staged_fixture_value", '"\n')
        )
        cases = (
            ("MM", "README.md", "# Safe working tree\n"),
            ("AD", "docs/staged-secret.md", None),
        )

        for expected_status, path, working_text in cases:
            with self.subTest(status=expected_status):
                repository = self.make_repository()
                repository.write(path, secret_assignment)
                repository.stage(path)
                if working_text is None:
                    repository.remove(path)
                else:
                    repository.write(path, working_text)

                self.assertIn(expected_status, repository.status())
                result = self.run_preflight(repository)
                output = self.combined_output(result)

                self.assertEqual(1, result.returncode, output)
                self.assertIn(path, output)
                self.assertIn("secret assignment", output)
                self.assertIn("staged index", output)

    def test_runtime_modification_is_material_but_not_topology(self) -> None:
        repository = self.make_repository()
        path = "src/existing.ts"
        repository.append(path, "export const modified = true;\n")
        self.record_material_change(repository, path)
        changes = preflight.git_changed_paths(repository.root)

        self.assertTrue(preflight.is_material_path(path))
        self.assertFalse(
            preflight.has_structure_sensitive_change(list(changes.entries))
        )
        result = self.run_preflight(repository)
        self.assertEqual(0, result.returncode, self.combined_output(result))

    def test_runtime_add_and_delete_require_architecture_sync(self) -> None:
        for operation in ("add", "delete"):
            with self.subTest(operation=operation):
                repository = self.make_repository()
                if operation == "add":
                    path = "src/new_module.ts"
                    repository.write(path, "export const added = true;\n")
                else:
                    path = "src/existing.ts"
                    repository.remove(path)
                self.record_material_change(repository, path)
                changes = preflight.git_changed_paths(repository.root)

                self.assertTrue(
                    preflight.has_structure_sensitive_change(list(changes.entries))
                )
                result = self.run_preflight(repository)
                output = self.combined_output(result)

                self.assertEqual(1, result.returncode, output)
                self.assertIn("architecture/project map", output)

    def test_runtime_rename_preserves_source_path_for_topology(self) -> None:
        repository = self.make_repository()
        source = "src/existing.ts"
        target = "docs/existing.ts"
        repository.move(source, target)
        self.record_material_change(repository, source)
        changes = preflight.git_changed_paths(repository.root)

        self.assertIn(target, changes.paths)
        self.assertIn(
            source,
            {entry.original_path for entry in changes.entries},
        )
        self.assertIn(
            source,
            preflight.material_changed_paths(
                list(changes.entries),
                set(changes.paths),
            ),
        )
        self.assertTrue(
            preflight.has_structure_sensitive_change(list(changes.entries))
        )
        result = self.run_preflight(repository)
        output = self.combined_output(result)

        self.assertEqual(1, result.returncode, output)
        self.assertIn("architecture/project map", output)

    def test_migration_modification_is_always_structural(self) -> None:
        repository = self.make_repository()
        path = "db/migrations/0001_initial.sql"
        repository.append(path, "-- material migration adjustment\n")
        self.record_material_change(repository, path)
        changes = preflight.git_changed_paths(repository.root)

        self.assertTrue(preflight.is_material_path(path))
        self.assertTrue(
            preflight.has_structure_sensitive_change(list(changes.entries))
        )
        result = self.run_preflight(repository)
        output = self.combined_output(result)

        self.assertEqual(1, result.returncode, output)
        self.assertIn("architecture/project map", output)

    def test_deleted_child_plan_does_not_require_live_parent_markers(self) -> None:
        repository = self.make_repository()
        path = "plan_docs/PLAN_V2_STAGE99_DELETED.md"
        repository.write(path, "# Historical child plan without current lineage markers.\n")
        repository.commit_all("add historical child plan")
        repository.remove(path)
        self.record_material_change(repository, path)

        changes, snapshots = self.inspect_repository(repository)

        self.assertEqual(
            [],
            preflight.validate_plan_parent_markers(set(changes.paths), snapshots),
        )
        result = self.run_preflight(repository)
        self.assertEqual(0, result.returncode, self.combined_output(result))

    def test_strict_side_effect_scan_blocks_new_risky_line(self) -> None:
        repository = self.make_repository()
        path = "src/existing.ts"
        risky_call = "".join(("send_", "email", "('learner@example.invalid');\n"))
        repository.append(path, risky_call)
        self.record_material_change(repository, path)

        non_strict_result = self.run_preflight(repository)
        self.assertEqual(
            0,
            non_strict_result.returncode,
            self.combined_output(non_strict_result),
        )

        strict_result = self.run_preflight(repository, strict_side_effects=True)
        output = self.combined_output(strict_result)
        self.assertEqual(1, strict_result.returncode, output)
        self.assertIn(path, output)
        self.assertIn("side-effect term needing review", output)

    def test_strict_side_effect_scan_ignores_unchanged_legacy_line(self) -> None:
        legacy_call = "".join(("send_", "email", "('legacy@example.invalid');\n"))
        repository = self.make_repository(source_text=legacy_call)
        path = "src/existing.ts"
        repository.append(path, "export const safeChange = true;\n")
        self.record_material_change(repository, path)

        result = self.run_preflight(repository, strict_side_effects=True)
        self.assertEqual(0, result.returncode, self.combined_output(result))

    def test_strict_side_effect_scan_checks_staged_added_line(self) -> None:
        repository = self.make_repository()
        path = "src/existing.ts"
        risky_call = "".join(("send_", "email", "('staged@example.invalid');\n"))
        repository.append(path, risky_call)
        repository.stage(path)
        repository.write(
            path,
            "export const baseline = true;\nexport const workingTreeSafe = true;\n",
        )
        self.record_material_change(repository, path)

        result = self.run_preflight(repository, strict_side_effects=True)
        output = self.combined_output(result)

        self.assertEqual(1, result.returncode, output)
        self.assertIn("side-effect term needing review", output)
        self.assertIn("staged index", output)

    def test_reviewed_side_effect_path_is_warning_not_runtime_authorization(self) -> None:
        repository = self.make_repository()
        path = "src/existing.ts"
        risky_call = "".join(("send_", "email", "('reviewed@example.invalid');\n"))
        repository.append(path, risky_call)
        self.record_material_change(repository, path)

        result = self.run_preflight(
            repository,
            strict_side_effects=True,
            reviewed_side_effect_paths=(path,),
        )
        output = self.combined_output(result)

        self.assertEqual(0, result.returncode, output)
        self.assertIn("current diff acknowledged", output)
        self.assertIn("runtime authorization still applies", output)

    def test_risk_reducing_cancel_order_name_is_not_blocked(self) -> None:
        repository = self.make_repository()
        path = "src/existing.ts"
        repository.append(
            path,
            "export function cancel_order() { return 'fixture'; }\n",
        )
        self.record_material_change(repository, path)

        result = self.run_preflight(repository, strict_side_effects=True)
        self.assertEqual(0, result.returncode, self.combined_output(result))


if __name__ == "__main__":
    unittest.main()
