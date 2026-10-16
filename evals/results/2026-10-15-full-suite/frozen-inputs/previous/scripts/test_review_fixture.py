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


if __name__ == '__main__':
    unittest.main()
