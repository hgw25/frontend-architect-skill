"""Exercise installation transactions on temporary directories, including failures."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'skills/frontend-architect-update/scripts'))
import manage_installation as installation


class InstallationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.destination = self.root/'skills/frontend-architect'
        self.backups = self.root/'backups'
        self.old = self.candidate('old', '1.0.0')
        self.new = self.candidate('new', '1.1.0')

    def candidate(self, name, version):
        root = self.root/name
        (root/'references').mkdir(parents=True)
        (root/'SKILL.md').write_text('---\nname: frontend-architect\n---\n[Guide](references/guide.md)\n')
        (root/'VERSION').write_text(version+'\n')
        (root/'references/guide.md').write_text(version+' guide')
        embedded = root/'skills/frontend-architect-update'
        embedded.mkdir(parents=True)
        (embedded/'SKILL.md').write_text('---\nname: frontend-architect-update\n---\n')
        return root

    def activate(self, candidate=None, **kwargs):
        return installation.activate(candidate or self.old, self.destination, self.backups, **kwargs)

    def receipts(self):
        return [json.loads(path.read_text()) for path in self.backups.glob('frontend-architect/*/receipt.json')]

    def test_initial_update_rollback_share_normalization_and_keep_independent_companion(self):
        companion = self.root/'skills/frontend-architect-update'
        companion.mkdir(parents=True)
        (companion/'SKILL.md').write_text('authoritative independent companion')
        first = self.activate(tag='v1.0.0', commit='old-commit')
        self.assertEqual(first['state'], 'completed')
        self.assertIsNone(first['backup'])
        self.assertFalse((self.destination/installation.EMBEDDED).exists())
        second = self.activate(self.new, baseline=self.old, tag='v1.1.0', commit='new-commit')
        self.assertEqual((self.destination/'VERSION').read_text().strip(), '1.1.0')
        self.assertTrue((Path(second['backup'])/'VERSION').exists())
        restored = installation.rollback(self.destination, self.backups)
        self.assertEqual(restored['state'], 'completed')
        self.assertEqual((self.destination/'VERSION').read_text().strip(), '1.0.0')
        self.assertEqual((companion/'SKILL.md').read_text(), 'authoritative independent companion')
        self.assertFalse((self.destination/installation.EMBEDDED).exists())
        self.assertFalse(list(self.backups.glob('*.lock')))

    def test_local_additions_deletions_and_unknown_provenance_require_authorization(self):
        self.activate()
        for change in ('added', 'deleted', 'unknown'):
            with self.subTest(change=change):
                if change == 'added':
                    (self.destination/'local.txt').write_text('local')
                elif change == 'deleted':
                    (self.destination/'local.txt').unlink()
                    (self.destination/'references/guide.md').unlink()
                else:
                    (self.destination/'references/guide.md').write_text('1.0.0 guide')
                with self.assertRaisesRegex(ValueError, 'Local changes or unknown provenance'):
                    self.activate(self.new, baseline=self.old if change != 'unknown' else None)
        receipt = self.activate(self.new, replace_local=True)
        self.assertEqual(receipt['state'], 'completed')

    def test_activation_failure_restores_previous_bytes_and_preserves_receipt(self):
        self.activate()
        original = installation.file_manifest(self.destination)
        replace = installation.os.replace
        def fail_activation(source, target):
            if Path(source).name.startswith('.frontend-architect-stage-') and Path(target) == self.destination:
                raise OSError('injected activation failure')
            return replace(source, target)
        with patch.object(installation.os, 'replace', side_effect=fail_activation):
            with self.assertRaisesRegex(OSError, 'injected activation failure'):
                self.activate(self.new, baseline=self.old)
        self.assertEqual(installation.file_manifest(self.destination), original)
        self.assertIn('restored', [receipt['state'] for receipt in self.receipts()])
        self.assertFalse(list(self.root.glob('skills/.frontend-architect-stage-*')))

    def test_post_activation_mismatch_restores_previous_and_retains_failed_candidate(self):
        self.activate()
        original = installation.file_manifest(self.destination)
        verify = installation.verify_installation
        def fail_final(destination, expected):
            if destination == self.destination:
                raise ValueError('injected post-check mismatch')
            return verify(destination, expected)
        with patch.object(installation, 'verify_installation', side_effect=fail_final):
            with self.assertRaisesRegex(ValueError, 'post-check mismatch'):
                self.activate(self.new, baseline=self.old)
        self.assertEqual(installation.file_manifest(self.destination), original)
        self.assertTrue(list(self.backups.glob('frontend-architect/*/failed-installation')))

    def test_changed_installation_during_staging_is_not_overwritten(self):
        self.activate()
        copytree = installation.shutil.copytree
        def mutate(source, target, *args, **kwargs):
            result = copytree(source, target, *args, **kwargs)
            if source == self.new:
                (self.destination/'concurrent.txt').write_text('other editor')
            return result
        with patch.object(installation.shutil, 'copytree', side_effect=mutate):
            with self.assertRaisesRegex(ValueError, 'changed while preparing'):
                self.activate(self.new, baseline=self.old)
        self.assertEqual((self.destination/'concurrent.txt').read_text(), 'other editor')
        self.assertEqual((self.destination/'VERSION').read_text().strip(), '1.0.0')

    def test_lock_is_exclusive_and_another_process_lock_is_not_removed(self):
        lock_root = self.destination.parent.parent/'.frontend-architect-maintenance-locks'
        with installation.installation_lock(self.destination):
            locks = list(lock_root.glob('*.lock'))
            self.assertEqual(len(locks), 1)
            with self.assertRaises(FileExistsError):
                self.activate()
            with self.assertRaises(FileExistsError):
                installation.activate(self.old, self.destination, self.root/'other-backups')
            self.assertTrue(locks[0].exists())
        self.assertFalse(list(lock_root.glob('*.lock')))

    def test_symlink_checkout_tag_and_missing_reference_are_rejected_before_replacement(self):
        self.destination.parent.mkdir()
        self.destination.symlink_to(self.old, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'symlink installation'):
            self.activate(self.new)
        self.destination.unlink()
        self.activate()
        (self.destination/'.git').write_text('gitdir: elsewhere')
        with self.assertRaisesRegex(ValueError, 'development checkout'):
            self.activate(self.new, baseline=self.old)
        (self.destination/'.git').unlink()
        with self.assertRaisesRegex(ValueError, 'selected tag'):
            self.activate(self.new, baseline=self.old, tag='v9.0.0')
        (self.new/'references/guide.md').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing runtime reference'):
            self.activate(self.new, baseline=self.old)

    def test_rollback_rejects_changed_backup_and_preserves_current(self):
        self.activate()
        update = self.activate(self.new, baseline=self.old)
        (Path(update['backup'])/'VERSION').write_text('corrupt')
        with self.assertRaisesRegex(ValueError, 'differs from its receipt'):
            installation.rollback(self.destination, self.backups)
        self.assertEqual((self.destination/'VERSION').read_text().strip(), '1.1.0')

    def test_same_bytes_are_a_noop_and_candidate_change_cannot_pass_post_check(self):
        self.activate()
        count = len(self.receipts())
        self.assertEqual(self.activate(self.old, baseline=self.old)['state'], 'unchanged')
        self.assertEqual(len(self.receipts()), count)
        copytree = installation.shutil.copytree
        def change_candidate(source, target, *args, **kwargs):
            result = copytree(source, target, *args, **kwargs)
            if source == self.new:
                (Path(target)/'references/guide.md').write_text('changed during staging')
            return result
        with patch.object(installation.shutil, 'copytree', side_effect=change_candidate):
            with self.assertRaisesRegex(ValueError, 'Installed bytes differ'):
                self.activate(self.new, baseline=self.old)
        self.assertEqual((self.destination/'VERSION').read_text().strip(), '1.0.0')

    def test_companion_uses_the_same_transaction_and_separate_receipts(self):
        candidate = self.root/'companion'
        candidate.mkdir()
        (candidate/'SKILL.md').write_text('---\nname: frontend-architect-update\n---\n')
        (candidate/'VERSION').write_text('1.0.0\n')
        destination = self.root/'skills/frontend-architect-update'
        receipt = installation.activate(candidate, destination, self.backups,
                                          skill_name='frontend-architect-update', tag='v1.0.0')
        self.assertEqual(receipt['skill_name'], 'frontend-architect-update')
        self.assertIn('/frontend-architect-update/', receipt['receipt'])

    def test_recovery_failure_retains_verified_backup_and_does_not_claim_completion(self):
        self.activate()
        original = installation.file_manifest(self.destination)
        replace = installation.os.replace
        def fail_swap_and_recovery(source, target):
            if Path(target) == self.destination:
                raise OSError('injected swap/recovery failure')
            return replace(source, target)
        with patch.object(installation.os, 'replace', side_effect=fail_swap_and_recovery):
            with self.assertRaisesRegex(RuntimeError, 'Recovery incomplete'):
                self.activate(self.new, baseline=self.old)
        failed = next(receipt for receipt in self.receipts() if receipt['state'] == 'recovery_failed')
        self.assertFalse(failed['recovery_complete'])
        self.assertEqual(installation.file_manifest(Path(failed['backup'])), original)


if __name__ == '__main__':
    unittest.main()
