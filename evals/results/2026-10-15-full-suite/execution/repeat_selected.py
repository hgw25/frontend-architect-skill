"""Run selected paired repeats with unchanged capture/scoring configuration."""
import json
import sys
from concurrent.futures import ThreadPoolExecutor
import run_suite as first

batch, *ids = sys.argv[1:]
parallel = "--parallel" in ids
if parallel:
    ids.remove("--parallel")
if not ids:
    raise SystemExit("Expected batch name followed by case IDs")
main_results = first.RESULTS
first.RESULTS = main_results / "repeats-selected" / batch
for condition in ("previous", "candidate"):
    (first.RESULTS / condition).mkdir(parents=True, exist_ok=True)
(first.RESULTS / "plan.json").write_text(json.dumps({
    "cases": ids, "model": first.PLAN["model"], "reasoning_effort": first.PLAN["reasoning_effort"],
    "timeout_seconds": 900, "inputs": "same frozen inputs and CLI isolation as the main comparison",
    "purpose": "Review score declines and routing-boundary variance; retain main-run results",
    "max_parallel_conditions": 2 if parallel else 1,
}, indent=2) + "\n")


def condition_worker(condition):
    folder = first.RESULTS / condition / "shard-1"
    folder.mkdir(exist_ok=True)
    captures = []
    for case in ids:
        command = [sys.executable, str(first.STAGE / condition / "scripts/run_behavior_evals.py"),
                   "--case", case, "--mode", "candidate", "--append", "--model", first.PLAN["model"],
                   "--reasoning-effort", first.PLAN["reasoning_effort"], "--timeout-seconds", "900",
                   "--results-dir", str(folder)]
        code = first.execute(command, folder / (case + ".capture.log"))
        record = next(r for r in json.loads((folder / "manifest.json").read_text())["cases"] if r["id"] == case)
        item = {"condition": condition, "case": case, "exit_code": code,
                "generation_exit": record["generation"]["exit_code"]}
        captures.append(item)
        print(json.dumps({"phase": "capture", **item}), flush=True)
        if item["generation_exit"]:
            return condition, {"status": "generation_failed", "captures": captures}
    command = [sys.executable, str(first.STAGE / condition / "scripts/score_behavior_evals.py"),
               "--results-dir", str(folder), "--mode", "candidate", "--batch-size", "4",
               "--model", first.PLAN["model"], "--reasoning-effort", first.PLAN["reasoning_effort"],
               "--timeout-seconds", "900"]
    code = first.execute(command, folder / "scoring.log")
    print(json.dumps({"phase": "scored", "condition": condition, "exit_code": code}), flush=True)
    return condition, {"status": "finished", "captures": captures, "scoring_exit_code": code}


if parallel:
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = dict(pool.map(condition_worker, ("previous", "candidate")))
    good = all(o["status"] == "finished" and o["scoring_exit_code"] == 0 for o in outcomes.values())
    outcome = {"status": "finished" if good else "failed", "conditions": outcomes}
else:
    outcome = first.worker(1, ids)
    good = outcome["status"] == "finished" and all(code == 0 for code in outcome["scoring_exit_codes"].values())
(first.RESULTS / "outcome.json").write_text(json.dumps(outcome, indent=2) + "\n")
raise SystemExit(0 if good else 1)
