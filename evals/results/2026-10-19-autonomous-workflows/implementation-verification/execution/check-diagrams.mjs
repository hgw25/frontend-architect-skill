// Parse the actual delivered diagrams; this does not claim browser layout QA.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(path.join(path.resolve(process.argv[2]), '.resolve.cjs'));
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { default: mermaid } = await import(pathToFileURL(require.resolve('mermaid')).href);
function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(full) : full.endsWith('.md') ? [full] : [];
  });
}
for (const argument of process.argv.slice(3)) {
  const root = path.resolve(argument);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const checks = [];
  for (const record of manifest.cases.filter(item => item.id.startsWith('autonomous-live-') || ['autonomous-export-async-encoding', 'autonomous-filter-stock-evolution'].includes(item.id))) {
    const artifacts = path.join(root, record.id, record.mode, 'artifacts');
    const diagrams = [];
    for (const file of markdownFiles(artifacts)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const [index, block] of [...source.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)].entries()) {
        const diagram = { file: path.relative(root, file), block: index + 1 };
        try { await mermaid.parse(block[1]); diagram.valid = true; }
        catch (error) { diagram.valid = false; diagram.error = error.message; }
        diagrams.push(diagram);
      }
    }
    checks.push({ id: record.id, mode: record.mode, diagrams, parsable: diagrams.length ? diagrams.every(item => item.valid) : null });
  }
  const result = { mermaid: require('mermaid/package.json').version, jsdom: require('jsdom/package.json').version,
    scope: 'Mermaid parse only; diagram meanings reviewed separately; no browser rendering claim', checks };
  fs.writeFileSync(path.join(root, 'diagram-checks.json'), JSON.stringify(result, null, 2) + '\n');
  if (checks.some(item => item.parsable === false)) process.exitCode = 1;
  console.log(path.basename(root), checks.map(item => `${item.id}: ${item.parsable === null ? 'no DSL; needs semantic review' : item.parsable ? 'pass' : 'fail'}`).join(', '));
}
