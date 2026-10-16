"""Repeat ready executable pairs, then aggregate unchanged artifacts for scoring."""
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from datetime import datetime, timezone
from pathlib import Path
import json
import shutil
import sys
import time
import run_suite as first

ROOT = first.RESULTS / "repeats-executable"
CASES = ["accessible-dialog-primitive", "vite-feature-flags-plugin",
         "optimistic-profile-update", "vue-search-url-i18n",
         "field-eligibility-executable", "search-request-lifecycle-executable"]


def main_completed():
    completed = set()
    for path in first.RESULTS.glob("*/shard-*/manifest.json"):
        try:
            records = json.loads(path.read_text())["cases"]
        except json.JSONDecodeError:
            # The existing capture writer updates its manifest in place.
            continue
        for record in records:
            if record["generation"]["exit_code"] == 0:
                completed.add((path.parent.parent.name, record["id"]))
    return completed


def capture(condition, case):
    folder = ROOT / "captures" / condition / case
    folder.mkdir(parents=True, exist_ok=False)
    command = [sys.executable, str(first.STAGE / condition / "scripts/run_behavior_evals.py"),
               "--case", case, "--mode", "candidate", "--model", first.PLAN["model"],
               "--reasoning-effort", first.PLAN["reasoning_effort"], "--timeout-seconds", "1800",
               "--results-dir", str(folder)]
    code = first.execute(command, folder / "capture.log")
    record = json.loads((folder / "manifest.json").read_text())["cases"][0]
    item = {"condition": condition, "case": case, "exit_code": code,
            "generation_exit": record["generation"]["exit_code"]}
    print(json.dumps({"phase": "repeat-capture", **item}), flush=True)
    return item


def aggregate(condition):
    folder = ROOT / condition / "shard-1"
    folder.mkdir(parents=True, exist_ok=False)
    manifests = [ROOT / "captures" / condition / case / "manifest.json" for case in CASES]
    merged = json.loads(manifests[0].read_text())
    merged["cases"] = []
    for case, path in zip(CASES, manifests):
        manifest = json.loads(path.read_text())
        for key in ("model", "reasoning_effort", "codex_version", "platform"):
            assert manifest[key] == merged[key], (case, key)
        assert [(r["id"], r["mode"]) for r in manifest["cases"]] == [(case, "candidate")]
        merged["cases"].extend(manifest["cases"])
        shutil.copytree(path.parent / case, folder / case)
    merged["completed_at"] = datetime.now(timezone.utc).isoformat()
    merged["source_capture_manifests"] = [str(path.relative_to(ROOT)) for path in manifests]
    (folder / "manifest.json").write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n")
    return folder


def score(condition):
    folder = aggregate(condition)
    command = [sys.executable, str(first.STAGE / condition / "scripts/score_behavior_evals.py"),
               "--results-dir", str(folder), "--mode", "candidate", "--batch-size", "4",
               "--model", first.PLAN["model"], "--reasoning-effort", first.PLAN["reasoning_effort"],
               "--timeout-seconds", "900"]
    code = first.execute(command, folder / "scoring.log")
    print(json.dumps({"phase": "repeat-scored", "condition": condition, "exit_code": code}), flush=True)
    return condition, code


if __name__ == "__main__":
    ROOT.mkdir(exist_ok=True)
    if (ROOT / "captures").exists():
        raise SystemExit("Repeat captures already exist; preserve them and resume explicitly")
    (ROOT / "plan.json").write_text(json.dumps({
        "purpose": "Paired independent repeats of all six executable cases; preserve the main comparison",
        "model": first.PLAN["model"], "reasoning_effort": first.PLAN["reasoning_effort"],
        "cases": CASES, "generation_timeout_seconds": 1800, "max_parallel_captures": 4,
        "inputs": "same frozen guidance, cases, fixtures, task contract and CLI isolation",
        "start_rule": "A case starts repeating only after both main conditions have completed capture",
        "environment": "Existing shared dependency cache is retained; paired conditions can run concurrently",
        "aggregation": "Scoring folders copy unchanged evidence from captures; copies are not additional samples",
    }, indent=2) + "\n")
    pending = [(v, c) for c in CASES for v in ("previous", "candidate")]
    outcomes = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        active = {}
        while pending or active:
            completed = main_completed()
            for item in list(pending):
                condition, case = item
                if len(active) == 4:
                    break
                if all((v, case) in completed for v in ("previous", "candidate")):
                    active[pool.submit(capture, condition, case)] = item
                    pending.remove(item)
            if not active:
                if (first.RESULTS / "execution/outcomes.json").exists() and not list(
                    (first.RESULTS / "execution").glob("resume-shard-*-running")
                ):
                    raise SystemExit("Main captures incomplete; retain available repeats")
                time.sleep(15)
                continue
            done, _ = wait(active, timeout=15, return_when=FIRST_COMPLETED)
            for future in done:
                outcomes.append(future.result())
                del active[future]
    with ThreadPoolExecutor(max_workers=2) as pool:
        scores = dict(pool.map(score, ("previous", "candidate")))
    (ROOT / "outcomes.json").write_text(json.dumps({"captures": outcomes, "scores": scores}, indent=2) + "\n")
    raise SystemExit(0 if all(r["generation_exit"] == 0 for r in outcomes) and
                     all(code == 0 for code in scores.values()) else 1)
