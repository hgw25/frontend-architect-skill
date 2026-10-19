#!/usr/bin/env python3

from __future__ import annotations

import tempfile
import unittest
import copy
from pathlib import Path
from unittest.mock import patch

import validate_skill
import yaml


class ReviewCaseSchemaTests(unittest.TestCase):
    def test_unknown_required_profile_is_a_schema_error(self):
        document = yaml.safe_load((validate_skill.ROOT/'evals/cases.yaml').read_text())
        document['cases'][0]['acceptance_profiles'] = ['missing-profile']
        with patch.object(validate_skill, 'load_yaml', return_value=document):
            errors = []
            validate_skill.validate_evals(errors)
        self.assertTrue(any('Unknown acceptance profile' in error for error in errors), errors)

    def test_review_snapshots_allow_optional_commands_but_require_valid_structure(self):
        source = yaml.safe_load((validate_skill.ROOT / 'evals/cases.yaml').read_text())
        review = next(case for case in source['cases'] if case.get('task_type') == 'review')
        for change, expected in [
            ({'validation_commands': None}, None),
            ({'fixture': None}, 'requires a fixture'),
            ({'fixture': review['fixture'] + '/after'}, 'requires before/ and after/ snapshots'),
            ({'task_type': 'unknown'}, 'unsupported task_type'),
        ]:
            with self.subTest(change=change):
                document = copy.deepcopy(source)
                case = next(case for case in document['cases'] if case['id'] == review['id'])
                case.update(change)
                if change.get('validation_commands', '') is None:
                    case.pop('validation_commands')
                with patch.object(validate_skill, 'load_yaml', return_value=document):
                    errors = []
                    validate_skill.validate_evals(errors)
                if expected:
                    self.assertTrue(any(expected in error for error in errors), errors)
                else:
                    self.assertEqual(errors, [])


class SnapshotDiscoveryTests(unittest.TestCase):
    def test_eval_snapshot_cannot_be_discovered_as_a_skill(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            snapshot = root / "evals/results/example/guidance/SKILL.md"
            snapshot.parent.mkdir(parents=True)
            snapshot.write_text("---\nname: frontend-architect\n---\n")
            with patch.object(validate_skill, "ROOT", root):
                errors = []
                validate_skill.validate_markdown(errors)
                self.assertTrue(any("Discoverable eval skill snapshot" in e for e in errors))
                snapshot.rename(snapshot.with_name("SKILL.snapshot.md"))
                errors = []
                validate_skill.validate_markdown(errors)
                self.assertEqual(errors, [])


class SectionRoutingTests(unittest.TestCase):
    def test_routes_resolve_local_and_cross_file_sections(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "SKILL.md").write_text(
                "# Entry\n[local](#entry)\n[operation](reference.md#inputs-results--effects)\n"
                "[repeat](reference.md#examples-1)\n"
            )
            (root / "reference.md").write_text(
                "# Reference\n## Inputs, results & effects\n## Examples\n## Examples\n"
            )
            with patch.object(validate_skill, "ROOT", root):
                errors = []
                validate_skill.validate_markdown(errors)
            self.assertEqual(errors, [])

    def test_heading_rename_breaks_route_and_example_heading_is_not_a_section(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "SKILL.md").write_text(
                "# Entry\n[old](reference.md#readable-operation)\n"
                "[example](reference.md#only-in-example)\n"
            )
            reference = root / "reference.md"
            reference.write_text("# Reference\n## Readable operation\n```md\n## Only in example\n```\n")
            with patch.object(validate_skill, "ROOT", root):
                errors = []
                validate_skill.validate_markdown(errors)
                self.assertEqual(len(errors), 1, errors)
                self.assertIn("#only-in-example", errors[0])
                reference.write_text(reference.read_text().replace("## Readable operation", "## Clear operation"))
                errors = []
                validate_skill.validate_markdown(errors)
            self.assertEqual(len(errors), 2, errors)
            self.assertTrue(any("#readable-operation" in error for error in errors))


class ReleaseMetadataTests(unittest.TestCase):
    def write_release_files(
        self,
        root: Path,
        *,
        version: str = "0.2.0",
        changelog_version: str = "0.2.0",
        readme_ref: str = "0.2.0",
        repository: str = "hgw25/frontend-architect-skill",
    ) -> None:
        (root / "VERSION").write_text(version + "\n", encoding="utf-8")
        (root / "CHANGELOG.md").write_text(
            f"# Changelog\n\n## [{changelog_version}] - 2026-08-24\n",
            encoding="utf-8",
        )
        (root / "README.md").write_text(
            f"[v{readme_ref}](https://github.com/{repository}/releases/tag/v{readme_ref})\n"
            "[Maintenance](skills/frontend-architect-update/SKILL.md)\n",
            encoding="utf-8",
        )
        companion = root / "skills/frontend-architect-update"
        companion.mkdir(parents=True, exist_ok=True)
        (companion / "VERSION").write_text(version + "\n")

    def validate(self, root: Path) -> list[str]:
        errors: list[str] = []
        with patch.object(validate_skill, "ROOT", root):
            validate_skill.validate_release_metadata(errors)
        return errors

    def test_accepts_matching_version_changelog_and_install_reference(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self.write_release_files(root)

            errors = self.validate(root)

        self.assertEqual(errors, [])

    def test_rejects_mismatched_release_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self.write_release_files(
                root,
                changelog_version="0.1.0",
                readme_ref="0.1.0",
                repository="heguangwei/frontend-architect-skill",
            )

            errors = self.validate(root)

        self.assertTrue(any("CHANGELOG.md" in error for error in errors))
        self.assertTrue(any("release link must match VERSION" in error for error in errors))
        self.assertTrue(any("stale GitHub repository owner" in error for error in errors))

    def test_rejects_non_semantic_version(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self.write_release_files(root, version="v0.2")

            errors = self.validate(root)

        self.assertEqual(
            errors,
            ["VERSION must contain one semantic version such as 0.2.0"],
        )

    def test_second_raw_install_workflow_and_companion_version_drift_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.write_release_files(root)
            with (root/'README.md').open('a') as stream:
                stream.write('python installer.py --path . --ref v0.2.0\n')
            (root/'skills/frontend-architect-update/VERSION').write_text('0.1.0\n')
            errors = self.validate(root)
        self.assertTrue(any('second raw root-install' in error for error in errors), errors)
        self.assertTrue(any('Companion VERSION' in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
