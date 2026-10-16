from pathlib import Path
import difflib,json,os,subprocess
R=Path(__file__).resolve().parents[1]/'dialog-diagnostics'
W=Path(json.loads((R/'plan.json').read_text())['inputs']['previous276']['diagnosticCopy'])
commands=[]
def run(name,args):
    p=subprocess.run(args,cwd=W,text=True,capture_output=True,env={**os.environ,'CI':'1','NO_COLOR':'1'})
    (R/(name+'.log')).write_text(p.stdout+p.stderr)
    commands.append({'name':name,'command':args,'exit_code':p.returncode})
    print(name,p.returncode,flush=True)
    return p.returncode
# A normal React transform renders the exact same imported HydrationApp successfully.
run('previous-node-ssr-build',['node_modules/.bin/esbuild','src/HydrationApp.tsx','--bundle','--platform=node','--format=esm','--packages=external','--outfile=dist/diagnostic-ssr.mjs'])
run('previous-node-ssr-render',['node','--input-type=module','-e',"import {createElement} from 'react'; import {renderToString} from 'react-dom/server'; import {writeFileSync} from 'node:fs'; import {HydrationApp} from './dist/diagnostic-ssr.mjs'; const html=renderToString(createElement(HydrationApp)); writeFileSync('dist/diagnostic-server.html',html); console.log(html);"])
# Reproduce the Playwright transform error without Chromium or the browser fixture.
(W/'diagnostic').mkdir(exist_ok=True)
(W/'diagnostic/ssr.spec.ts').write_text("import {test,expect} from '@playwright/test';\nimport {createElement} from 'react';\nimport {renderToString} from 'react-dom/server';\nimport {HydrationApp} from '../src/HydrationApp';\ntest('same component in Playwright transform',()=>{expect(renderToString(createElement(HydrationApp))).toContain('Hydration dialog')});\n")
(W/'diagnostic.config.ts').write_text("import {defineConfig} from '@playwright/test'; export default defineConfig({testDir:'./diagnostic'});\n")
run('previous-playwright-transform-repro',['node_modules/.bin/playwright','test','--config','diagnostic.config.ts'])
changes=[]
for name in ['vite.browser-test.config.ts','tests/dialog.spec.ts']:
    path=W/name; before=path.read_text()
    if name.startswith('vite'):
        after=before.replace('plugins: [react()],','plugins: [react()],\n  define: { "process.env.NODE_ENV": JSON.stringify("production") },')
    else:
        after=before.replace("import { HydrationApp } from '../src/HydrationApp'","import { readFileSync } from 'node:fs'")
        after=after.replace('renderToString(createElement(HydrationApp))',"readFileSync('dist/diagnostic-server.html', 'utf8')")
    assert before!=after
    path.write_text(after)
    changes.extend(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile=name,tofile=name))
(R/'previous-harness-only.patch').write_text(''.join(changes))
run('previous-harness-fixed-browser',['npm','run','test:browser'])
(R/'previous-checks.json').write_text(json.dumps(commands,indent=2)+'\n')
