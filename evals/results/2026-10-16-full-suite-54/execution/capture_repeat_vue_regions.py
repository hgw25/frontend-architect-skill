"""Observe busy/live attributes wherever each implementation places its feedback."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess
ROOT=Path(__file__).resolve().parents[1];DIAG=ROOT/'vue-repeat-diagnostics'
archive=DIAG/'results-v1-main-only-attributes.json'
if archive.exists():raise SystemExit('Refusing to overwrite first observation')
shutil.copy2(DIAG/'results.json',archive)
data=json.loads(archive.read_text())
probe=(DIAG/'probe.snapshot.ts').read_text()
probe=probe.replace("mainAttributes:wrapper.get('main').attributes(),", "mainAttributes:wrapper.get('main').attributes(), busyRegions:wrapper.findAll('[aria-busy]').map(node=>({tag:node.element.tagName,value:node.attributes('aria-busy')})), liveRegions:wrapper.findAll('[aria-live]').map(node=>({tag:node.element.tagName,value:node.attributes('aria-live'),text:node.text()})),")
(DIAG/'probe-regions.snapshot.ts').write_text(probe)
for record in data['records']:
    condition=record['condition'];target=Path(record['diagnosticCopy'])
    shutil.copy2(DIAG/(condition+'.log'),DIAG/(condition+'-v1.log'))
    (target/'src/pending.diagnostic.test.ts').write_text(probe)
    done=subprocess.run(record['command'],cwd=target,text=True,capture_output=True,env={**os.environ,'CI':'1','NO_COLOR':'1'},timeout=90)
    (DIAG/(condition+'.log')).write_text(done.stdout+done.stderr)
    record['exitCode']=done.returncode
    record['observation']=json.loads((target/'pending-observation.json').read_text())
    record['sourceUnchanged']=all(hashlib.sha256((target/p).read_bytes()).hexdigest()==h for p,h in record['inputHashes'].items())
data['additionalObservation']='Initial probe already showed both visible loading messages. Attributes were initially recorded only on main; current puts busy/live on section. Expanded observation to all busy/live regions without changing scenario, assertions or production inputs. First logs/results retained.'
(DIAG/'results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{k:r[k]for k in ('condition','exitCode','sourceUnchanged','observation')}for r in data['records']],ensure_ascii=False))
