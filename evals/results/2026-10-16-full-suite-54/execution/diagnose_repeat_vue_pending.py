"""Replay the same pending interaction against both fresh repeat submissions."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
DIAG=ROOT/'vue-repeat-diagnostics'
if DIAG.exists():raise SystemExit('Refusing to overwrite diagnostic evidence')
sources={}
for condition in ('previous','candidate'):
    manifest=json.loads((ROOT/'repeats'/condition/'vue-search-url-i18n/manifest.json').read_text())
    sources[condition]=Path(manifest['cases'][0]['workspace'])
DIAG.mkdir();work=Path(tempfile.mkdtemp(prefix='frontend-vue-repeat-pending-'))
probe=(ROOT/'vue-pending-diagnostics/probe-file-capture.snapshot.ts').read_text()
probe=probe.replace("mainAttributes:wrapper.get('main').attributes(),", "mainAttributes:wrapper.get('main').attributes(), statusTexts:wrapper.findAll('[role=\"status\"]').map(node=>node.text()),")
(DIAG/'probe.snapshot.ts').write_text(probe)
records=[]
for condition,source in sources.items():
    target=work/condition
    shutil.copytree(source,target,ignore=shutil.ignore_patterns('node_modules','.git','.frontend-architect','dist','test-results','.cache'))
    (target/'node_modules').symlink_to(source/'node_modules',target_is_directory=True)
    archive=DIAG/'inputs'/condition
    shutil.copytree(target,archive,ignore=shutil.ignore_patterns('node_modules'))
    hashes={str(p.relative_to(archive)):hashlib.sha256(p.read_bytes()).hexdigest()for p in archive.rglob('*')if p.is_file()}
    (target/'src/pending.diagnostic.test.ts').write_text(probe)
    command=['npm','test','--','src/pending.diagnostic.test.ts']
    done=subprocess.run(command,cwd=target,text=True,capture_output=True,env={**os.environ,'CI':'1','NO_COLOR':'1'},timeout=90)
    (DIAG/(condition+'.log')).write_text(done.stdout+done.stderr)
    payload=target/'pending-observation.json'
    records.append({'condition':condition,'originalWorkspace':str(source),'diagnosticCopy':str(target),'command':command,'exitCode':done.returncode,'sourceUnchanged':all(hashlib.sha256((target/p).read_bytes()).hexdigest()==h for p,h in hashes.items()),'inputHashes':hashes,'observation':json.loads(payload.read_text())if payload.exists()else None})
data={'scope':'Same initial-resolved, replacement-held, final-resolved scenario as first-pass probe; observes equivalent feedback including live status, without requiring a particular button/aria implementation. Original sources and tests untouched. jsdom only.','records':records}
(DIAG/'results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{k:r[k]for k in ('condition','exitCode','sourceUnchanged','observation')}for r in records],ensure_ascii=False))
