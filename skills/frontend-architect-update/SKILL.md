---
name: frontend-architect-update
description: Install, check, update, or roll back the local frontend-architect skill from hgw25/frontend-architect-skill. Use to maintain this skill installation, not to upgrade a frontend project's dependencies or publish a release.
---

# Frontend Architect Update

Repository: `https://github.com/hgw25/frontend-architect-skill`. Default destination:
`${CODEX_HOME:-$HOME/.codex}/skills/frontend-architect`; honor an explicit target.
Keep this companion independently installed. The single filesystem executor is
[this companion's manage_installation.py](scripts/manage_installation.py).
Use the trusted installed copy, or the reviewed source copy during skill development.
Do not execute scripts from a newly downloaded main-skill candidate.

## Select the operation and establish provenance

- A status/version question is read-only: report installed VERSION and available
  stable version. It does not authorize an update.
- An install or update request authorizes staging, validation, backup and activation.
  A missing destination is an initial install, not an error or an approval gate.
- Honor an explicit immutable tag. Otherwise query
  `git ls-remote --tags --refs https://github.com/hgw25/frontend-architect-skill.git`,
  accept only `vMAJOR.MINOR.PATCH`, compare integer tuples and choose the highest.
  Tags do not require a GitHub Release page. Exclude prereleases.
- Resolve its commit including the peeled annotated-tag entry; verify that identity
  has not changed after staging. Retain it in the activation receipt.
- Inspect the current installation with the executor's `inspect` command. Symlinks
  and development checkouts require the intended target to be established with the
  user; never follow or replace them as ordinary managed directories.

## Stage with the supported downloader

Read the installed system `skill-installer` instructions, then use its
`scripts/install-skill-from-github.py` helper. If unavailable, report the missing
capability rather than fetching an arbitrary updater.

```bash
python3 "$installer_script" \
  --repo hgw25/frontend-architect-skill --path . \
  --ref "$selected_tag" --name frontend-architect --dest "$stage_dir"
```

Use a fresh staging directory outside skill discovery. The root distribution
includes repository support files; do not silently create a different runtime
package. Verify skill identity, VERSION/tag, runtime references and the trusted
installed skill-creator's `quick_validate.py` when available. Report missing local
validation dependencies; do not claim checks ran when they did not.

For an existing installation, stage its declared installed tag separately as the
comparison baseline. Compare against that version, not the new candidate. Local
changes or an unresolvable local-preview version require preserving the changes
or explicit replacement authorization. Existing human authorization persists;
do not ask again when the current session already authorized replacing those
known changes. An ordinary update request alone does not authorize discarding
unknown local work.

## Activate through the common transaction

```bash
python3 "$executor" activate \
  --candidate "$stage_dir/frontend-architect" --destination "$installation" \
  --backup-root "$backup_root" --baseline "$old_stage_dir/frontend-architect" \
  --tag "$selected_tag" --commit "$resolved_commit"
```

Omit `--baseline` for an absent destination. Use `--replace-local` only when the
human has already authorized replacement of the identified local changes or
unknown provenance. Development previews use a reviewed local candidate and a
receipt identifying its actual snapshot; never call them a published release.

The executor owns normalization, exclusive locking, file comparison before the
swap, same-filesystem staging, backup, post-check, failure restoration and the
JSON receipt. It removes the embedded `skills/frontend-architect-update` copy
from the activated main skill, preserving that copy outside discovery. It applies
the same comparison normalization to old distributions. The independently installed
companion remains authoritative. Do not reproduce these steps with another `mv`
sequence. Keep the backup root outside discovery and on the destination filesystem;
a different volume is rejected before replacement.

The companion itself can use the same transaction with
`--skill-name frontend-architect-update` and its separately staged candidate and
baseline. Never substitute the main skill's embedded copy for that separate update.

## Restore and report

```bash
python3 "$executor" rollback \
  --destination "$installation" --backup-root "$backup_root"
```

Rollback selects a completed receipt with a verified backup, preserves the outgoing
installation and uses the same transaction. Honor a named receipt with `--receipt`.
Local changes require the same authorization. Legacy backups without receipts need
identity/content inspection and an explicitly selected source; stage that source
and use `activate` with a verified current baseline rather than inventing a receipt
or choosing by arbitrary folder order. Ask only if the source remains ambiguous.

Network/auth failures, invalid metadata, concurrent changes or an unavailable
executor end with a concrete status. Do not retry indefinitely or remove another
process's lock. On a filesystem failure, inspect the receipt and surviving backup;
report whether recovery completed. Retain interrupted data for recovery.
Report actual version, checks, receipt and backup. The skill is available on the
next turn; do not restart Codex, publish tags, change credentials or modify unrelated
skills. A local validation result does not prove that a remote release was published.
