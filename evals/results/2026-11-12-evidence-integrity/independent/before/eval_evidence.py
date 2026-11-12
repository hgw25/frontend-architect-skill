"""Preserve project inputs and delivered code independently of model narration."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any


LOCK_FILES = {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", "Cargo.lock", "uv.lock"}


def project_snapshot(workspace: Path) -> dict[str, Any]:
    """Use the project's tracked/new file set; ignored build/dependency trees stay out."""
    listed = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=workspace, check=True, capture_output=True,
    ).stdout.decode().split("\0")
    files = {}
    for relative in sorted(set(filter(None, listed))):
        path = workspace / relative
        if path.is_symlink():
            raise ValueError(f"Snapshot requires an explicit symlink contract: {relative}")
        if not path.is_file():
            continue  # A deleted tracked file is absent from the final snapshot.
        content = path.read_bytes()
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = None
        files[relative] = {
            "sha256": hashlib.sha256(content).hexdigest(), "size": len(content),
            "text": text,
        }
    return {"version": 1, "files": files}


def save_snapshot(path: Path, snapshot: dict[str, Any]) -> str:
    path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def snapshot_errors(path: Path, digest: str | None, expected_files: dict | None = None) -> list[str]:
    if not digest or not path.is_file():
        return [f"Missing frozen project snapshot: {path.name}; rerun capture"]
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        return [f"Frozen project snapshot changed: {path.name}; rerun capture"]
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if data["version"] != 1 or not isinstance(data["files"], dict):
            raise ValueError("Unsupported snapshot")
        for name, entry in data["files"].items():
            relative = Path(name)
            if relative.is_absolute() or ".." in relative.parts:
                raise ValueError("Invalid snapshot path")
            if entry["text"] is not None:
                content = entry["text"].encode("utf-8")
                if len(content) != entry["size"] or hashlib.sha256(content).hexdigest() != entry["sha256"]:
                    raise ValueError("Snapshot content differs from its identity")
        if expected_files is not None and {
            name: entry["sha256"] for name, entry in data["files"].items()
        } != expected_files:
            raise ValueError("Original project differs from frozen fixture")
    except (ValueError, KeyError, TypeError) as error:
        return [f"Invalid project snapshot {path.name}: {error}"]
    return []


def project_context(case_dir: Path) -> str:
    """Supply authoritative inputs and full final callers, never inferred from read logs."""
    parts = []
    original_files = {}
    for filename, label in (("project-input.json", "ORIGINAL PROJECT INPUT"),
                            ("project-final.json", "DELIVERED PROJECT")):
        path = case_dir / filename
        if not path.is_file():
            continue  # capture validity rejects missing snapshots for fixture tasks.
        snapshot = json.loads(path.read_text(encoding="utf-8"))
        parts.append(f"\n{label} (frozen {filename}):\n")
        for name, entry in snapshot["files"].items():
            parts.append(f"\nFILE {name} SHA256 {entry['sha256']}\n")
            if filename == "project-final.json" and entry == original_files.get(name):
                parts.append("[Unchanged; full definition remains in ORIGINAL PROJECT INPUT above.]\n")
            elif Path(name).name in LOCK_FILES:
                parts.append("[Lockfile body retained in raw snapshot; omitted here. Use manifest versions; do not infer uninspected resolutions.]\n")
            elif entry["text"] is None:
                parts.append(f"[Binary content: {entry['size']} bytes; requires a separate runtime/visual check.]\n")
            else:
                parts.append(entry["text"] + "\n")
        if filename == "project-input.json":
            original_files = snapshot["files"]
    return "".join(parts)


def resolve_acceptance(case: dict[str, Any], profiles: dict[str, list[str]]) -> list[str]:
    criteria = [criterion for name in case.get("acceptance_profiles", []) for criterion in profiles[name]]
    return list(dict.fromkeys([*criteria, *case.get("acceptance_criteria", [])]))
