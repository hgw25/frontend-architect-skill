import { defineConfig } from '@playwright/test';
import net from 'node:net';
if (!process.env.EVAL_METHODS_PORT) {
 const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
 process.env.EVAL_METHODS_PORT=String(probe.address().port);await new Promise(resolve=>probe.close(resolve));
}
const port=Number(process.env.EVAL_METHODS_PORT);
export default defineConfig({
 testDir:'./tests',workers:1,timeout:20000,
 use:{baseURL:'http://127.0.0.1:'+port,headless:true,viewport:{width:1100,height:760},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'node scripts/serve.mjs '+port,port,reuseExistingServer:false},
 reporter:[['list'],['json',{outputFile:'test-results/results.json'}]]
});
