import http from 'node:http';
import {createApp} from '../server/app.mjs';
const handler=createApp();
http.createServer((req,res)=>Promise.resolve(handler(req,res)).catch(()=>res.writeHead(500).end('Unhandled application error'))).listen(Number(process.argv[2]),'127.0.0.1');
