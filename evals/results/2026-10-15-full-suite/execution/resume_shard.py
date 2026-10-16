"""Resume a stopped shard, archiving failed attempts before any replacement."""
from pathlib import Path
import json
import shutil
import sys
import run_suite as first

index = int(sys.argv[1])
long_case = sys.argv[2]
marker = first.RESULTS / f"execution/resume-shard-{index}-running"
marker.touch()
outcome = {"shard": index, "long_case": long_case, "timeout_seconds": 1800, "captures": []}
try:
    for case in first.PLAN["shards"][index - 1]:
        for condition in ("previous", "candidate"):
            folder = first.RESULTS / condition / f"shard-{index}"
            manifest = json.loads((folder / "manifest.json").read_text())
            old = next((r for r in manifest["cases"] if r["id"] == case), None)
            if old and old["generation"]["exit_code"] == 0:
                continue
            if old:
                archive = first.RESULTS / "attempts" / f"{condition}-{case}-900-seconds"
                archive.mkdir(parents=True, exist_ok=False)
                shutil.copytree(folder / case, archive / case)
                shutil.copy2(folder / (case + ".capture.log"), archive / "capture.log")
                shutil.copy2(folder / "manifest.json", archive / "original-shard-manifest.json")
                (archive / "manifest.json").write_text(json.dumps({**manifest, "cases": [old]}, ensure_ascii=False, indent=2) + "\n")
            timeout = "1800" if case == long_case else "900"
            command = [sys.executable, str(first.STAGE / condition / "scripts/run_behavior_evals.py"),
                       "--case", case, "--mode", "candidate", "--append", "--model", first.PLAN["model"],
                       "--reasoning-effort", first.PLAN["reasoning_effort"], "--timeout-seconds", timeout,
                       "--results-dir", str(folder)]
            code = first.execute(command, folder / (case + ".capture.log"))
            record = next(r for r in json.loads((folder / "manifest.json").read_text())["cases"] if r["id"] == case)
            event = {"condition": condition, "case": case, "exit_code": code,
                     "generation_exit": record["generation"]["exit_code"], "timeout_seconds": int(timeout)}
            outcome["captures"].append(event)
            print(json.dumps(event), flush=True)
            if event["generation_exit"]:
                raise RuntimeError("Generation failed again")
    outcome["scores"] = {}
    for condition in ("previous", "candidate"):
        folder = first.RESULTS / condition / f"shard-{index}"
        command = [sys.executable, str(first.STAGE / condition / "scripts/score_behavior_evals.py"),
                   "--results-dir", str(folder), "--mode", "candidate", "--batch-size", "4",
                   "--model", first.PLAN["model"], "--reasoning-effort", first.PLAN["reasoning_effort"],
                   "--timeout-seconds", "900"]
        code = first.execute(command, folder / "scoring.log")
        outcome["scores"][condition] = code
        print(json.dumps({"phase": "resumed-score", "condition": condition, "exit_code": code}), flush=True)
    outcome["status"] = "finished"
except Exception as error:
    outcome["status"] = "failed"
    outcome["error"] = repr(error)
finally:
    (first.RESULTS / f"execution/resume-shard-{index}-outcome.json").write_text(json.dumps(outcome, indent=2) + "\n")
    marker.unlink(missing_ok=True)
raise SystemExit(0 if outcome["status"] == "finished" else 1)
