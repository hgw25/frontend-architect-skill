import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = { '/': ['index.html', 'text/html'], '/app.mjs': ['src/app.mjs', 'text/javascript'], '/style.css': ['src/style.css', 'text/css'] };
const server = http.createServer(async (request, response) => {
  const file = files[new URL(request.url, 'http://localhost').pathname];
  if (!file) { response.writeHead(404).end(); return; }
  try { response.setHeader('Content-Type', file[1]); response.end(await readFile(file[0])); }
  catch { response.writeHead(500).end(); }
});
server.listen(Number(process.argv[2]), '127.0.0.1');
