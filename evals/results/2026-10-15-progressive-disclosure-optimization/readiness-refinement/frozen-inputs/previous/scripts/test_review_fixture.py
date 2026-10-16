"""Protect the review benchmark's seeded behaviors, not just its source wording."""
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'evals/fixtures/community-review'
ORACLE = ROOT / 'evals/oracles/community-review.mjs'


@unittest.skipUnless(shutil.which('node'), 'Node is required for the review fixture behavior checks')
class ReviewFixtureTests(unittest.TestCase):
    def observe(self, snapshot):
        result = subprocess.run(['node', str(ORACLE), str(snapshot)], check=True, capture_output=True, text=True)
        return json.loads(result.stdout)

    def test_green_delivered_tests_leave_four_contract_failures(self):
        tests = sorted((FIXTURE/'after/test').glob('*.test.mjs'))
        subprocess.run(['node', '--test', *(str(path) for path in tests)], check=True, capture_output=True)
        observed = self.observe(FIXTURE/'after')
        self.assertFalse(observed['missingIdDisabled'])
        self.assertEqual(observed['directoryRefreshes'], 0)
        self.assertFalse(observed['retryUsesFailedPayload'])
        self.assertFalse(observed['failedSearchBlocksOldPagination'])
        self.assertEqual(observed['missingIdHref'], None)
        self.assertEqual(observed['feedRefreshes'], 1)
        self.assertEqual(observed['preservedDraft'], 'Unsaved')
        self.assertTrue(observed['preservedFavorite'])
        self.assertEqual(observed['preservedEditedDraft'], 'Edited')

    def test_targeted_fixes_satisfy_the_same_public_contract_checks(self):
        with tempfile.TemporaryDirectory() as temporary:
            snapshot = Path(temporary)/'after'
            shutil.copytree(FIXTURE/'after', snapshot)
            actions = snapshot/'src/community/ui/row-actions.mjs'
            actions.write_text(actions.read_text().replace(
                "post.owned || post.status !== 'published'", '!canAcquire(post)'))
            lifecycle = snapshot/'src/community/lifecycle.mjs'
            lifecycle.write_text(lifecycle.read_text().replace(
                '[resources.feed.refresh()]', '[resources.feed.refresh(), resources.creatorDirectory.refresh()]'))
            publish = snapshot/'src/community/controllers/publish.mjs'
            publish.write_text(publish.read_text().replace(
                'return send(draft.snapshot);\n    },', 'return send(failedPayload);\n    },'))
            feed = snapshot/'src/community/controllers/feed.mjs'
            feed.write_text(feed.read_text().replace(
                "search(next) { query = { ...next }; return load(true); }",
                "search(next) { query = { ...next }; snapshot = { ...snapshot, items: [], cursor: null }; return load(true); }"))
            observed = self.observe(snapshot)
            self.assertTrue(observed['missingIdDisabled'])
            self.assertEqual(observed['directoryRefreshes'], 1)
            self.assertTrue(observed['retryUsesFailedPayload'])
            self.assertTrue(observed['failedSearchBlocksOldPagination'])
            self.assertEqual(observed['preservedEditedDraft'], 'Edited')


@unittest.skipUnless(shutil.which('node'), 'Node is required for reply fixture checks')
class ReplyFixtureTests(unittest.TestCase):
    def test_main_path_exposes_association_loss_and_accepts_a_local_fix(self):
        fixture = ROOT / 'evals/fixtures/reply-completion'
        def run(folder):
            return subprocess.run(['node', '--test', 'test/ledger.test.mjs'],
                                  cwd=folder, capture_output=True, text=True)
        before = run(fixture)
        self.assertNotEqual(before.returncode, 0)
        self.assertIn('# fail 4', before.stdout)
        with tempfile.TemporaryDirectory() as temporary:
            candidate = Path(temporary) / 'reply'
            shutil.copytree(fixture, candidate)
            contract = (candidate / 'test/ledger.test.mjs').read_bytes()
            owner = candidate / 'src/ledger.mjs'
            owner.write_text(owner.read_text().replace(
                'userId: snapshot.replyTo,', 'userId: stored.replyTo,'))
            after = run(candidate)
            self.assertEqual(after.returncode, 0, after.stdout + after.stderr)
            self.assertEqual((candidate / 'test/ledger.test.mjs').read_bytes(), contract)


@unittest.skipUnless(shutil.which('node'), 'Node is required for export boundary fixture checks')
class ExportBoundaryFixtureTests(unittest.TestCase):
    def run_contract(self, folder):
        return subprocess.run(['node', '--test', 'test/export.test.mjs'],
                              cwd=folder, capture_output=True, text=True)

    def test_green_behavior_does_not_distinguish_the_two_boundary_designs(self):
        fixture = ROOT / 'evals/fixtures/export-operation'
        review = ROOT / 'evals/fixtures/export-operation-review'
        contract = (fixture / 'test/export.test.mjs').read_bytes()
        for folder in (fixture, review / 'before', review / 'after'):
            self.assertEqual((folder / 'test/export.test.mjs').read_bytes(), contract)
            result = self.run_contract(folder)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('# tests 10', result.stdout)

    def test_async_encoding_change_exposes_the_leaked_call_protocol(self):
        review = ROOT / 'evals/fixtures/export-operation-review'
        with tempfile.TemporaryDirectory() as temporary:
            coupled, cohesive = Path(temporary) / 'coupled', Path(temporary) / 'cohesive'
            shutil.copytree(review / 'after', coupled)
            shutil.copytree(review / 'before', cohesive)
            steps = coupled / 'src/export-steps.mjs'
            steps.write_text(steps.read_text().replace('function encode(context)', 'async function encode(context)')
                             .replace('    context.payload =', '    await Promise.resolve();\n    context.payload ='))
            failed = self.run_contract(coupled)
            self.assertNotEqual(failed.returncode, 0)
            for name in ('toolbar', 'keyboard'):
                caller = coupled / f'src/{name}.mjs'
                caller.write_text(caller.read_text().replace('  encode(context);', '  await encode(context);'))
            fixed = self.run_contract(coupled)
            self.assertEqual(fixed.returncode, 0, fixed.stdout + fixed.stderr)

            # The same internal change stays inside the cohesive operation;
            # both existing entry points and the public behavior stay unchanged.
            callers = {name: (cohesive / f'src/{name}.mjs').read_bytes() for name in ('toolbar', 'keyboard')}
            owner = cohesive / 'src/export-selection.mjs'
            owner.write_text(owner.read_text().replace('  const payload =', '  await Promise.resolve();\n  const payload ='))
            passed = self.run_contract(cohesive)
            self.assertEqual(passed.returncode, 0, passed.stdout + passed.stderr)
            for name, original in callers.items():
                self.assertEqual((cohesive / f'src/{name}.mjs').read_bytes(), original)
            self.assertEqual((coupled / 'test/export.test.mjs').read_bytes(),
                             (cohesive / 'test/export.test.mjs').read_bytes())


if __name__ == '__main__':
    unittest.main()
