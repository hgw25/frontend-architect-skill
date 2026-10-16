from pathlib import Path
import sys,json
import run_behavior_evals as runner
import score_impl as scorer
if __name__ == '__main__':
    folder=Path(sys.argv[sys.argv.index('--results-dir')+1])
    path=folder/'manifest.json'; manifest=json.loads(path.read_text())
    original=[]
    for record in manifest['cases']:
        case_dir=folder/record['id']/record['mode']
        events=(case_dir/'events.jsonl').read_text()
        original.append({'id':record['id'],'reference_routing':record['reference_routing']})
        record['reference_routing']=runner.analyze_reference_reads(events,Path(record['workspace']))
    archive=folder/'capture-routing-original.json'
    if not archive.exists(): archive.write_text(json.dumps(original,ensure_ascii=False,indent=2)+'\n')
    runner.write_manifest(path,manifest)
    raise SystemExit(scorer.main())
