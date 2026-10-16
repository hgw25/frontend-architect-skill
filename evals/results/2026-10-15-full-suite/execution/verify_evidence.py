"""Recheck saved evidence with the repository's validators; do not rescore it."""
from pathlib import Path
import hashlib
import json
import sys

RESULTS = Path(__file__).resolve().parent.parent
REPO = RESULTS.parents[2]
sys.path.insert(0, str(REPO / "scripts"))
import run_behavior_evals as runner
import score_behavior_evals as scorer

cases = {case["id"]: case for case in runner.load_cases(None)}
records = []
for manifest_path in sorted(RESULTS.glob("*/shard-*/manifest.json")):
    version = manifest_path.parent.parent.name
    source = RESULTS / "frozen-inputs" / version
    expected = {str(path.relative_to(source)) for path in (source / "references").glob("*.md")}
    expected |= {"SKILL.md", "CONTRIBUTING.md"}
    for record in json.loads(manifest_path.read_text())["cases"]:
        folder = manifest_path.parent / record["id"] / record["mode"]
        errors = scorer.captured_evidence_errors(record, cases[record["id"]], folder)
        guide = Path(record["workspace"]) / ".frontend-architect"
        for name in sorted(expected):
            original = source / ("SKILL.snapshot.md" if name == "SKILL.md" else name)
            actual = guide / name
            if not actual.is_file() or original.read_bytes() != actual.read_bytes():
                errors.append("Guidance differs from frozen input: " + name)
        extras = [str(path.relative_to(guide)) for path in guide.rglob("*")
                  if path.is_file() and str(path.relative_to(guide)) not in expected]
        if extras:
            errors.append("Unexpected guidance files: " + repr(extras))
        records.append({"condition": version, "id": record["id"], "errors": errors,
                        "validation_exit_codes": [v["exit_code"] for v in record["validations"]]})

hash_errors = []
hashes = json.loads((RESULTS / "input-hashes.json").read_text())
for relative, digest in hashes.items():
    path = RESULTS / "frozen-inputs" / relative
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        hash_errors.append(relative)

set_errors = []
score_errors = []
for version in ("previous", "candidate"):
    ids = [row["id"] for row in records if row["condition"] == version]
    if sorted(ids) != sorted(cases):
        set_errors.append(version + ": capture IDs are incomplete or duplicated")
    scores = [score for path in (RESULTS / version).glob("shard-*/blind-scores/scores.json")
              for score in json.loads(path.read_text())["conditions"]["candidate"]]
    if sorted(score["id"] for score in scores) != sorted(cases):
        set_errors.append(version + ": score IDs are incomplete or duplicated")
    score_errors.extend({"condition": version, "id": score["id"], "verdict": score["verdict"]}
                        for score in scores if score["verdict"] == "invalid")

current_errors = []
candidate = RESULTS / "frozen-inputs/candidate"
names = {"SKILL.md", "CONTRIBUTING.md"} | {
    str(path.relative_to(candidate)) for path in (candidate / "references").glob("*.md")}
for name in sorted(names):
    frozen = candidate / ("SKILL.snapshot.md" if name == "SKILL.md" else name)
    if (REPO / name).read_bytes() != frozen.read_bytes():
        current_errors.append(name)

result = {"captured": len(records), "expected": len(cases) * 2,
          "input_hash_errors": hash_errors, "set_errors": set_errors,
          "invalid_scores": score_errors, "current_guidance_errors": current_errors, "records": records}
(RESULTS / "evidence-verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
issues = [r for r in records if r["errors"]]
print(json.dumps({"captured": len(records), "expected": len(cases) * 2,
                  "input_hash_errors": hash_errors, "set_errors": set_errors,
                  "invalid_scores": score_errors, "current_guidance_errors": current_errors,
                  "record_errors": issues}, ensure_ascii=False))
raise SystemExit(bool(hash_errors or set_errors or score_errors or current_errors or issues))
