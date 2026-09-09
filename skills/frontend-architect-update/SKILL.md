---
name: frontend-architect-update
description: Check, update, or roll back the locally installed frontend-architect skill from hgw25/frontend-architect-skill. Use when the user asks to maintain this skill installation, not to upgrade a frontend project's dependencies or publish a release.
---

# Frontend Architect Update

Maintain the installed `frontend-architect` skill. Repository:
`https://github.com/hgw25/frontend-architect-skill`. Resolve the installation as
`${CODEX_HOME:-$HOME/.codex}/skills/frontend-architect`; respect an explicitly
specified installation path. Keep backups outside the skills discovery directory.
This companion skill is maintained separately; do not replace it with a copy
embedded inside the main skill installation.

## Choose the requested operation

- A status/version question is read-only. Report installed `VERSION` and the
  available stable version; do not update merely because a newer version exists.
- An update request authorizes downloading, validating, backing up and replacing
  this installation. Do not ask for confirmation again for those routine steps.
- Honor an explicit version. Otherwise query repository tags with
  `git ls-remote --tags --refs https://github.com/hgw25/frontend-architect-skill.git`.
  Accept only `vMAJOR.MINOR.PATCH`, compare integer tuples, and choose the highest.
  Tags are supported even when no GitHub Release page exists. Exclude prereleases.
- A rollback request restores the most recent completed backup for this skill,
  or the backup/version the user names. First verify its skill name and VERSION;
  preserve the outgoing installation as another backup.

## Update workflow

Use the installed system `skill-installer` skill and its
`scripts/install-skill-from-github.py` helper. Resolve it relative to the actual
Codex skills root; read its instructions before first use. If unavailable, report
that missing dependency rather than fetching and executing an arbitrary updater.

1. Read the installed VERSION. Inspect whether the destination is a symlink or
   is itself a Git checkout. Do not replace a development checkout or follow a
   symlink as if it were an ordinary managed installation; report the situation
   and establish the intended target with the user.
2. Stage the requested immutable tag outside the skills directory, using a fresh
   temporary directory and the installer arguments below. Never install over the
   current directory directly. A failed download leaves the installation intact.
3. Compare the existing installation against a separately staged copy of its
   declared installed tag, not against the new version. Compare file bytes and
   detect additions and deletions, ignoring only generated `__pycache__`, `.pyc`
   and `.DS_Store`. If the declared version cannot be resolved, treat provenance
   as unknown. Report local changes or unknown provenance and ask whether to
   preserve them in a backup and replace, or keep the current installation.
   Do not infer overwrite authorization from an ordinary update request.
4. If installed and target versions and contents match, report up to date and
   stop. Otherwise verify the staged root `SKILL.md` declares
   `name: frontend-architect`, VERSION matches the selected tag, and referenced
   runtime files exist. Run the installed skill-creator's `quick_validate.py`
   if available. Do not run scripts taken from the downloaded release as part
   of installation. Missing local validation dependencies must be reported;
   never claim checks ran when they did not.
5. Before replacement, compare the current files again against the snapshot
   inspected above. If they changed, stop and reassess. Serialize concurrent
   updates with an exclusive lock outside the skills directory. Do not remove
   another process's lock or assume a stale lock is safe to delete.
6. Copy the validated candidate into a staging sibling on the destination
   filesystem. Move the current directory to a unique backup outside discovery,
   then rename the staged candidate into its place. If replacement fails, restore
   the backup. Retain a small JSON receipt outside discovery recording repository,
   tag, resolved commit, installation path, backup path and completion time. Mark
   completion only after validating the installed contents against the candidate.
   Release the lock in a finally/cleanup path. Retain interrupted backup/staging
   data for recovery rather than deleting the only good copy.
7. Report the actual version, validation result and backup location. The skill
   will be available on the next turn. Do not restart Codex automatically.

Installer invocation (substitute the selected tag and fresh staging directory):

```bash
python3 "$installer_script" \
  --repo hgw25/frontend-architect-skill --path . \
  --ref "$selected_tag" --name frontend-architect --dest "$stage_dir"
```

Resolve the tag's commit with `git ls-remote` including the peeled annotated tag
entry; retain that identity in the receipt. If it changes during staging, abort.
The installer uses the existing root-directory distribution, including repository
support files. Do not claim a minimal runtime package exists or filter files
silently: packaging changes belong in a separate reviewed release.

If a downloaded release contains this companion under
`skills/frontend-architect-update/SKILL.md`, keep the independently installed
companion authoritative. Before activation, move the nested companion outside
skill discovery into the backup area, recording that packaging normalization in
the receipt. Apply the same normalization to comparison baselines. Do not leave
two discoverable skills with the same name.

## Rollback and failure boundaries

Use the same locking, change detection, backup, replacement and post-check rules
for rollback. Select backups by completed receipt where available, not arbitrary
folder ordering; for legacy backups inspect VERSION and contents and show the
chosen source. If the source is ambiguous, ask which one to restore.

Network/authentication failures, invalid metadata, concurrent changes or an
unrecoverable filesystem error end the attempt with a concrete status. Do not
retry indefinitely, change repository visibility, create credentials, publish
new versions, or modify unrelated skills to make an update succeed.
