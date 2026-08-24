#!/usr/bin/env python3

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import validate_skill


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
            "python install-skill-from-github.py "
            f"--repo {repository} --ref v{readme_ref}\n",
            encoding="utf-8",
        )

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
        self.assertTrue(any("--ref v0.2.0" in error for error in errors))
        self.assertTrue(any("canonical GitHub repository" in error for error in errors))
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


if __name__ == "__main__":
    unittest.main()
