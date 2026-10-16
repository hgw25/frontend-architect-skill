"""Capture diagnostic data directly when the test reporter omits passed-test console output."""
from pathlib import Path
import json,os,shutil,subprocess,hashlib
RESULTS=Path(__file__).resolve().parents[1]
DIAG=RESULTS/'vue-pending-diagnostics'
shutil.copy2(DIAG/'results.json',DIAG/'results-v1-no-observation.json')
data=json.loads((DIAG/'results.json').read_text())
probe=(DIAG/'probe.snapshot.ts').read_text().replace("import SearchPage from './SearchPage.vue'", "import SearchPage from './SearchPage.vue'\nimport {writeFileSync} from 'node:fs'")
probe=probe.replace("console.log('PENDING_DIAGNOSTIC '+JSON.stringify({before,after}))", "writeFileSync('pending-observation.json', JSON.stringify({before,after}))")
(DIAG/'probe-file-capture.snapshot.ts').write_text(probe)
for record in data['records']:
    target=Path(record['diagnosticCopy']);condition=record['condition']
    shutil.copy2(DIAG/(condition+'.log'),DIAG/(condition+'-v1-no-console.log'))
    (target/'src/pending.diagnostic.test.ts').write_text(probe)
    done=subprocess.run(record['command'],cwd=target,text=True,capture_output=True,env={**os.environ,'CI':'1','NO_COLOR':'1'},timeout=90)
    (DIAG/(condition+'.log')).write_text(done.stdout+done.stderr)
    record['initialProbeExitCode']=record['exitCode'];record['exitCode']=done.returncode
    record['observation']=json.loads((target/'pending-observation.json').read_text())
    record['sourceUnchanged']=all(hashlib.sha256((target/path).read_bytes()).hexdigest()==digest for path,digest in record['inputHashes'].items())
data['captureCorrection']='Both first probe tests passed, but reporter emitted no observation to captured output. Only observation recording changed from console to file; input, source and all assertions unchanged. First logs/results retained.'
(DIAG/'results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{'condition':r['condition'],'exit':r['exitCode'],'sourceUnchanged':r['sourceUnchanged'],'observation':r['observation']}for r in data['records']],ensure_ascii=False))
