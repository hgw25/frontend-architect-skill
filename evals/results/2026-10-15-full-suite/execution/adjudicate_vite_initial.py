"""Regrade both Vite conditions with raw generation-stage check evidence."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import importlib.util
import json
import re
import shutil
import sys
import run_suite as first

CASE = "vite-feature-flags-plugin"
ROOT = first.RESULTS / "adjudication/vite-execution-evidence"


def supplement(mode, batch, cases, folder):
    result = []
    for record in batch:
        events = folder / record["id"] / mode / "events.jsonl"
        evidence = []
        for line in events.read_text().splitlines():
            event = json.loads(line)
            item = event.get("item", {})
            if event.get("type") != "item.completed":
                continue
            if item.get("type") == "file_change":
                evidence.append({"changed_files": [c["path"] for c in item.get("changes", [])]})
            command = item.get("command", "")
            if item.get("type") == "command_execution" and re.search(
                r"\b(?:npm|npx|pnpm|yarn|bun)\s+(?:run|test|exec|pack|ci|install)\b|\bnode\s+--test\b", command
            ):
                evidence.append({"command": command, "exit_code": item.get("exit_code"),
                                 "output": item.get("aggregated_output", "")})
        result.append({"id": record["id"], "events_in_original_order": evidence})
    return "\n\nRAW GENERATION-STAGE PACKAGE/CHECK EVENTS:\n" + json.dumps(result, ensure_ascii=False)


def worker(condition):
    source = first.STAGE / condition
    sys.path.insert(0, str(source / "scripts"))
    spec = importlib.util.spec_from_file_location("grading", source / "scripts/score_impl.py")
    scorer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scorer)
    quality, failure = scorer.build_prompt, scorer.build_failure_prompt
    scorer.build_prompt = lambda *args: quality(*args) + supplement(*args)
    scorer.build_failure_prompt = lambda *args: failure(*args) + supplement(*args)
    sys.argv = [sys.argv[0], *sys.argv[3:]]
    return scorer.main()


def dispatch(condition):
    source = first.RESULTS / condition / "shard-2"
    destination = ROOT / condition / "shard-1"
    destination.mkdir(parents=True, exist_ok=False)
    manifest = json.loads((source / "manifest.json").read_text())
    record = next(r for r in manifest["cases"] if r["id"] == CASE)
    shutil.copytree(source / CASE, destination / CASE)
    (destination / "manifest.json").write_text(json.dumps({**manifest, "cases": [record]}, ensure_ascii=False, indent=2) + "\n")
    command = [sys.executable, str(Path(__file__).resolve()), "--worker", condition,
               "--results-dir", str(destination), "--mode", "candidate", "--case", CASE,
               "--model", first.PLAN["model"], "--reasoning-effort", first.PLAN["reasoning_effort"],
               "--timeout-seconds", "900"]
    code = first.execute(command, destination / "scoring.log")
    print(json.dumps({"condition": condition, "exit_code": code}), flush=True)
    return condition, code


if __name__ == "__main__":
    if sys.argv[1:2] == ["--worker"]:
        raise SystemExit(worker(sys.argv[2]))
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / "method.json").write_text(json.dumps({
        "purpose": "Evidence-complete independent grading; retain original primary scores",
        "case": CASE, "conditions": ["previous", "candidate"],
        "change": "Both grading passes receive raw package/check commands, results and file-change chronology from existing events.jsonl",
        "unchanged": "guidance, generated artifacts, checks, rubric, failure rules, fixed model configuration",
        "blinding": "No original grades, suspected failure, expected answer or other condition is supplied to either scorer",
    }, indent=2) + "\n")
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = dict(pool.map(dispatch, ("previous", "candidate")))
    (ROOT / "outcomes.json").write_text(json.dumps(outcomes, indent=2) + "\n")
    raise SystemExit(any(code != 0 for code in outcomes.values()))
