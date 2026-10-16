"""Repeat executable cases after the first captures, preserving the first run."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import sys
import time
import run_suite as first

ROOT = first.RESULTS / "repeats-executable"
PAIRS = [
    ["optimistic-profile-update", "vite-feature-flags-plugin"],
    ["vue-search-url-i18n", "field-eligibility-executable"],
    ["accessible-dialog-primitive", "search-request-lifecycle-executable"],
]


def repeat(index, ids):
    result = {"shard": index, "captures": [], "scores": {}}
    for case in ids:
        for condition in ("previous", "candidate"):
            folder = ROOT / condition / ("shard-" + str(index))
            folder.mkdir(parents=True, exist_ok=True)
            command = [sys.executable, str(first.STAGE / condition / "scripts/run_behavior_evals.py"),
                       "--case", case, "--mode", "candidate", "--append",
                       "--model", first.PLAN["model"], "--reasoning-effort", first.PLAN["reasoning_effort"],
                       "--timeout-seconds", "1800", "--results-dir", str(folder)]
            code = first.execute(command, folder / (case + ".capture.log"))
            records = json.loads((folder / "manifest.json").read_text())["cases"]
            record = next(r for r in records if r["id"] == case)
            item = {"condition": condition, "case": case, "exit_code": code,
                    "generation_exit": record["generation"]["exit_code"]}
            result["captures"].append(item)
            print(json.dumps({"phase": "repeat-capture", **item}), flush=True)
            if item["generation_exit"]:
                return {**result, "status": "generation_failed"}
    for condition in ("previous", "candidate"):
        folder = ROOT / condition / ("shard-" + str(index))
        command = [sys.executable, str(first.STAGE / condition / "scripts/score_behavior_evals.py"),
                   "--results-dir", str(folder), "--mode", "candidate", "--batch-size", "4",
                   "--model", first.PLAN["model"], "--reasoning-effort", first.PLAN["reasoning_effort"],
                   "--timeout-seconds", "900"]
        code = first.execute(command, folder / "scoring.log")
        result["scores"][condition] = code
        print(json.dumps({"phase": "repeat-scored", "shard": index,
                          "condition": condition, "exit_code": code}), flush=True)
    return {**result, "status": "finished"}


if __name__ == "__main__":
    ROOT.mkdir(exist_ok=True)
    (ROOT / "plan.json").write_text(json.dumps({
        "purpose": "Paired repeats of all six executable cases; first-run results remain authoritative records",
        "model": first.PLAN["model"], "reasoning_effort": first.PLAN["reasoning_effort"],
        "generation_timeout_seconds": 1800,
        "inputs": "same frozen guidance, cases, fixtures, task contract and CLI isolation",
        "environment": "After first-run captures; dependency cache may be warm. No cache reset or fixture repairs.",
        "shards": PAIRS,
    }, ensure_ascii=False, indent=2) + "\n")
    while True:
        records = [r for path in first.RESULTS.glob("*/shard-*/manifest.json")
                   for r in json.loads(path.read_text())["cases"]]
        if len(records) == 90 and all(r["generation"]["exit_code"] == 0 for r in records):
            break
        if (first.RESULTS / "execution/outcomes.json").exists() and not list(
            (first.RESULTS / "execution").glob("resume-shard-*-running")
        ):
            raise SystemExit("First captures incomplete; repeats were not started")
        time.sleep(15)
    print(json.dumps({"phase": "repeat-start", "first_captures": len(records)}), flush=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        outcomes = list(pool.map(lambda args: repeat(*args), enumerate(PAIRS, 1)))
    (ROOT / "outcomes.json").write_text(json.dumps(outcomes, indent=2) + "\n")
    raise SystemExit(0 if all(o["status"] == "finished" and all(c == 0 for c in o["scores"].values())
                             for o in outcomes) else 1)
