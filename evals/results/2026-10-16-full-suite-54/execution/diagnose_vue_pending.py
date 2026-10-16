"""Measure the same pending-search interaction in copies of both frozen outputs."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,tempfile
RESULTS=Path(__file__).resolve().parents[1]
DIAG=RESULTS/'vue-pending-diagnostics';DIAG.mkdir()
work=Path(tempfile.mkdtemp(prefix='frontend-vue-pending-'))
manifest=[]
probe='''import { flushPromises, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import SearchPage from './SearchPage.vue'

function response(name: string) {
  return new Response(JSON.stringify({items:[{id:name,name,price:10}],total:1}),
    {status:200,headers:{'content-type':'application/json'}})
}

test('capture feedback while a replacement search remains pending', async () => {
  history.replaceState(null, '', '/search?q=old&page=2&locale=en-US')
  let resolve!: (value: Response) => void
  const pending = new Promise<Response>((done) => { resolve = done })
  const fetchMock = vi.fn().mockResolvedValueOnce(response('Old item'))
    .mockImplementationOnce(() => pending)
  vi.stubGlobal('fetch', fetchMock)
  const wrapper = mount(SearchPage)
  try {
    await flushPromises()
    expect(wrapper.text()).toContain('Old item')
    await wrapper.get('input[name="query"]').setValue('new')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const before = {mainAttributes:wrapper.get('main').attributes(),
      submitText:wrapper.get('button[type="submit"]').text(),text:wrapper.text()}
    resolve(response('New item'))
    await flushPromises()
    expect(wrapper.text()).toContain('New item')
    const after = {mainAttributes:wrapper.get('main').attributes(),
      submitText:wrapper.get('button[type="submit"]').text(),text:wrapper.text()}
    console.log('PENDING_DIAGNOSTIC '+JSON.stringify({before,after}))
  } finally {
    wrapper.unmount()
    vi.unstubAllGlobals()
  }
})
'''
(DIAG/'probe.snapshot.ts').write_text(probe)
for condition,suffix in [('previous','3kvp95dx'),('candidate','ounue74c')]:
    original=Path('/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-'+suffix)
    target=work/condition
    shutil.copytree(original,target,ignore=shutil.ignore_patterns('node_modules','.git','.frontend-architect','dist','test-results'))
    (target/'node_modules').symlink_to(original/'node_modules',target_is_directory=True)
    archive=DIAG/'inputs'/condition
    shutil.copytree(target,archive,ignore=shutil.ignore_patterns('node_modules'))
    hashes={str(p.relative_to(archive)):hashlib.sha256(p.read_bytes()).hexdigest()for p in archive.rglob('*')if p.is_file()}
    (target/'src/pending.diagnostic.test.ts').write_text(probe)
    command=['npm','test','--','src/pending.diagnostic.test.ts']
    done=subprocess.run(command,cwd=target,text=True,capture_output=True,env={**os.environ,'CI':'1','NO_COLOR':'1'},timeout=90)
    (DIAG/(condition+'.log')).write_text(done.stdout+done.stderr)
    prefix='PENDING_DIAGNOSTIC '
    line=next((line for line in done.stdout.splitlines()if prefix in line),None)
    data=json.loads(line.split(prefix,1)[1])if line else None
    source_unchanged=all((target/path).read_bytes()==(archive/path).read_bytes()for path in hashes)
    manifest.append({'condition':condition,'originalWorkspace':str(original),'diagnosticCopy':str(target),'command':command,'exitCode':done.returncode,'sourceUnchanged':source_unchanged,'inputHashes':hashes,'observation':data})
(DIAG/'results.json').write_text(json.dumps({'scope':'Same additional interaction capture in isolated copies; existing tests and production source unchanged; jsdom, not real browser layout','records':manifest},ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{'condition':r['condition'],'exit':r['exitCode'],'sourceUnchanged':r['sourceUnchanged'],'observation':r['observation']}for r in manifest],ensure_ascii=False))
