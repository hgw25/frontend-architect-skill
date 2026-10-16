# Preserved repeat dispatch failure

At 2026-10-16T04:35:17 UTC the orchestrator was mistakenly started with `/Users/heguangwei/.local/bin/python3`, which lacks PyYAML. All 14 capture calls and all 14 scorer calls failed at `import yaml` before any model invocation, workspace creation, or sample generation. These are dispatch/environment failures, not 14 behavioral failures or retries of generated quality failures.

The complete logs, selection and outcomes remain here. After confirming PyYAML 6.0.3 in the original evaluation venv, the same 7-case pair selection was launched under `/tmp/mattpocock-skills-review.IvnLUj/venv/bin/python`; results are separately retained in `../repeats/`. No output was overwritten.
