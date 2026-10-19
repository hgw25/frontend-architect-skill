import json
from pathlib import Path
import shlex
import sys
import tempfile
import unittest
from unittest.mock import patch

import run_behavior_evals as runner


class IndependentConsumerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.workspace = self.root/'delivered'
        self.workspace.mkdir()
        self.fixture = self.root/'fixture'
        self.fixture.mkdir()
        (self.fixture/'result.txt').write_text('good')
        (self.workspace/'result.txt').write_text('good')
        (self.root/'oracle.py').write_text("from pathlib import Path\nassert Path('result.txt').read_text() == 'good', 'consumer outcome failed'\n")
        self.case = {'id':'consumer','prompt':'Complete the task','fixture':'fixture',
                     'acceptance_checks':[{'name':'consumer-outcome',
                         'command':shlex.quote(sys.executable)+' checks/consumer.py',
                         'files':{'checks/consumer.py':'oracle.py'}}]}

    def run_check(self):
        with patch.object(runner,'ROOT',self.root):
            return runner.run_acceptance_checks(self.case,self.workspace,10)

    def test_real_consumer_accepts_working_output_and_rejects_broken_output(self):
        self.assertEqual(self.run_check()[0]['exit_code'],0)
        (self.workspace/'result.txt').write_text('broken')
        results = self.run_check()
        self.assertNotEqual(results[0]['exit_code'],0)
        self.assertIn('consumer outcome failed',results[0]['stderr'])

    def test_oracle_is_not_a_generator_hint_or_a_mutation_of_the_delivery(self):
        prompt = runner.build_prompt(self.case,'candidate')
        self.assertNotIn('consumer-outcome',prompt)
        self.assertNotIn('oracle.py',prompt)
        self.assertNotIn('checks/consumer.py',prompt)
        self.run_check()
        self.assertFalse((self.workspace/'checks').exists())
        self.assertEqual((self.workspace/'result.txt').read_text(),'good')

    def test_cannot_replace_an_existing_delivered_file(self):
        self.case['acceptance_checks'][0]['files'] = {'result.txt':'oracle.py'}
        with self.assertRaisesRegex(ValueError,'must not replace delivered files'):
            self.run_check()
        self.assertEqual((self.workspace/'result.txt').read_text(),'good')

    def test_validation_contract_binds_the_hidden_support_bytes_and_command(self):
        before = runner.capture_contract(self.case,self.root)
        (self.root/'oracle.py').write_text('raise AssertionError("changed check")\n')
        after = runner.capture_contract(self.case,self.root)
        self.assertNotEqual(before,after)
        expected = runner.expected_validation_commands(self.case)
        self.assertEqual(expected,['acceptance: consumer-outcome: '+self.case['acceptance_checks'][0]['command']])

    def test_uses_frozen_support_when_the_maintainer_source_changes(self):
        self.case['_acceptance_inputs'] = {'oracle.py':(self.root/'oracle.py').read_bytes()}
        contract = runner.capture_contract(self.case,self.root)
        (self.root/'oracle.py').unlink()
        self.assertEqual(self.run_check()[0]['exit_code'],0)
        self.assertEqual(runner.capture_contract(self.case,self.root),contract)


if __name__ == '__main__':
    unittest.main()
