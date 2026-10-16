# Function and caller quality check

Compare the preceding installed local guide d05d4b1be0ef with the revised guide.
Both use the same two new tasks, protected behavior checks, updated rubric,
capture/scoring implementation and CLI isolation. Both explicitly load their
guide; this is not a no-skill baseline. The rubric's function-level criteria
apply equally to both conditions and are not applied retrospectively to earlier
studies. No guidance or acceptance changes are made during generation.

Use gpt-5.6-sol/high, bundled CLI 0.162.0-alpha.17.2, 900 seconds per generation.
Two shards each generate previous then candidate; fresh quality and failure-only
graders see one anonymous condition. Generators do not see grading criteria,
the other condition, fixture-health results or the expected answer. The
implementation workspace has only the initial export fixture; the review task
receives before/ and after/ because comparing them is its actual assignment.

Behavior checks deliberately pass before refactoring. They preserve behavior,
not prove good structure. Inspect actual generated code and review findings for
ownership of operation ordering, inputs/results, effects, real callers and
change locality. Do not score against a required helper name, function count,
folder tree, loop syntax or line limit. Necessary public event-entry delegation
and purposeful private helpers are valid.

The health control changes internal payload encoding to be asynchronous. In the
coupled fixture, existing consumers must now await its private step; in the
cohesive control the same change stays inside the operation. The same ten tests
are retained. The differing file count is supporting evidence only: the important
fact is whether consumers must learn an internal sequencing change under an
unchanged public contract. This is not an actual browser-worker integration or
human maintenance-time measurement.

Inspect all score declines and new failures. For a verdict decline, new failure,
or normalized drop of at least one point, generate one more paired run with the
same configuration. Retain first results and repeats separately; do not resample
until passing or adjust the rubric to erase a difference. A real defect may
justify a separately versioned refinement with its original failure retained.

Frozen inputs use SKILL.snapshot.md and CONTRIBUTING.snapshot.md outside skill
discovery. Restore names in a fresh working copy to repeat a selected task; use
the archived isolation wrapper and configuration on PATH. Absolute temporary
paths in plans/logs identify the actual run, not the only copies of guidance or
fixtures. Reconstruct in new directories and preserve historical records.

Limits: two small Node tasks, same generator/grader model family, no complete
53-case rerun, no real human handoff, and no production React/Vue/native UI or
performance study. Exact service model build/seed and cache state are unavailable.
Successful examples cannot guarantee every future generated or reviewed program.
