"""Check maintained study/report links, excluding captured model prose."""
from pathlib import Path
from urllib.parse import unquote,urlsplit
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(json.loads((ROOT/'run-plan.json').read_text())['sourceRoot'])
files=[SOURCE/'README.md',ROOT/'report.md',ROOT/'method.md',ROOT/'dialog-diagnostics/report.md',ROOT/'vue-pending-diagnostics/report.md',ROOT/'vue-repeat-diagnostics/report.md',ROOT/'vite-recovery-review/report.md']
checked=[];errors=[]
for path in files:
    links=[]
    for href in re.findall(r'\[[^\]]*\]\(([^)]+)\)',path.read_text()):
        href=href.strip('<>');url=urlsplit(href)
        if url.scheme or not url.path:continue
        target=path.parent/unquote(url.path)
        links.append(href)
        if not target.exists():errors.append({'source':str(path),'href':href})
    checked.append({'source':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'localTargets':len(links)})
result={'scope':'Maintained index/report local link targets; excludes generated model prose and does not verify remote URLs or heading anchors','files':checked,'errors':errors}
(ROOT/'report-links-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checkedFiles':len(checked),'localTargets':sum(r['localTargets']for r in checked),'errors':errors},ensure_ascii=False))
raise SystemExit(bool(errors))
