from pathlib import Path
from urllib.parse import unquote,urlsplit
import hashlib,json,re
R=Path(__file__).resolve().parents[1];S=R.parents[2]
files=[S/'README.md',R/'report.md',R/'method.md',R/'attribution.md']
errors=[];checked=[]
for path in files:
    targets=[]
    for href in re.findall(r'\[[^\]]*\]\(([^)]+)\)',path.read_text()):
        url=urlsplit(href.strip('<>'))
        if url.scheme or not url.path:continue
        targets.append(href)
        if not(path.parent/unquote(url.path)).exists():errors.append({'source':str(path),'href':href})
    checked.append({'source':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'localTargets':len(targets)})
(R/'link-check.json').write_text(json.dumps({'files':checked,'errors':errors,'scope':'Maintained local targets; remote URLs and captured model prose excluded'},indent=2)+'\n')
print(json.dumps({'checkedFiles':len(checked),'localTargets':sum(r['localTargets']for r in checked),'errors':errors}))
raise SystemExit(bool(errors))
