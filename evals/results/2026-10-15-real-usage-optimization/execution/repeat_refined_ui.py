"""Honor the one-point decline repeat rule for the separately refined input set."""
from pathlib import Path
import runpy
import sys
import run_suite as first

first.STAGE = first.STAGE / 'draft-refinement'
first.PLAN['repeatInputDescription'] = 'Unchanged refinement/frozen-inputs guides and six-check browser acceptance v2; same isolation/model/scoring view 2'
sys.argv = ['repeat_selected.py', 'refinement-ui', 'settled-interaction-journey-executable', '--parallel']
runpy.run_path(str(Path(__file__).with_name('repeat_selected.py')), run_name='__main__')
