# Information Hiding and Evaluation Integrity Review

Status: **PASS**

## Configuration

- Generation date: 2026-08-21
- Generation model: `gpt-5.4`, reasoning effort `medium`
- Independent scoring model: `gpt-5.6-sol`, reasoning effort `medium`
- Conditions: isolated baseline and candidate sessions
- Candidate loading: current local `SKILL.md` and no more than two routed reference topics
- Baseline loading: no local, installed, or global frontend-architect Skill reference
- Implementation evidence: protected fixture harness, clean install, actual behavior checks, diffs, and logs

The three final pairs use the same model and scoring configuration. The first two pairs are preserved in
[v4](../2026-08-21-gpt-5.4-information-hiding-cross-model-v4/); the final Vite candidate is in
[v6](../2026-08-21-gpt-5.4-information-hiding-cross-model-v6/) and its clean no-Skill baseline is in
[v7](../2026-08-21-gpt-5.4-information-hiding-cross-model-v7/).

## Results

| Case | Baseline | Candidate | Delta | Candidate verdict |
| --- | ---: | ---: | ---: | --- |
| Feature internal decomposition | 14.67 | 14.67 | 0.00 | target |
| Optimistic profile update | 10.29 | 16.00 | +5.71 | target |
| Vite feature-flags infrastructure | 8.80 | 15.20 | +6.40 | target |
| **Average** | **11.25** | **15.29** | **+4.04** | **3/3 target** |

No final candidate triggered a global or case-specific failure. The module-decomposition case was already
strong without the Skill, so the new information-hiding rule preserved rather than inflated its target result.

## Executable Evidence

- The optimistic candidate passed clean install, TypeScript, and the strengthened overlapping-request test:
  an older request succeeds while a newer request remains pending, then the newer request fails and the UI
  rolls back to the latest confirmed authoritative value rather than the initial profile.
- The final Vite candidate read only `frontend-infrastructure.md` and `security-and-trust.md`, modified no
  protected harness file, passed clean install, build, consumer type checking, dev/HMR, diagnostics, bundle
  and source-map secret scanning, actual npm tarball creation, temporary-consumer installation, and import.
- The clean Vite baseline passed the same executable harness but scored 8.80 because the implementation added
  duplicate watcher mechanisms, weakened the precise-key type contract, and left lifecycle and migration risks.
  Passing tests alone therefore did not receive architect-level credit.

## Evaluation Problems Found and Closed

1. Candidate sessions could accidentally read a globally installed older Skill. The runner now requires all
   candidate references to resolve to the isolated local copy.
2. Candidate sessions could load too many references. The runner now records routed topics and rejects more
   than two, with the common rendering guide plus one platform extension counted as one topic.
3. A candidate could modify an existing validation script and then pass its weakened check. Cases can now
   declare `protected_paths`; integrity is checked before package installation or behavior validation.
4. Baseline sessions could discover and read the globally installed Skill, invalidating the comparison. The
   prompt now explicitly forbids it and the runner rejects any baseline reference read.
5. The optimistic fixture previously missed a real concurrency rollback sequence, and the Vite fixture only
   inspected a dry-run package manifest. Both were replaced with behaviorally stronger checks.

Failed and contaminated exploratory runs remain in adjacent result directories as audit evidence. They were
not averaged into the final table and were not rewritten into passing results.

## Limits

This targeted evaluation covers three changed behaviors, not every frontend task. It is cross-model evidence,
not a human production audit. The Vite candidate does not yet prove a multi-version Node/Vite support matrix,
a complete deprecation window, or a live rollback drill; those remain release-program concerns rather than
universal requirements for every small implementation task.
