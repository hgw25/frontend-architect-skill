import { defineConfig } from '@playwright/test';
import net from 'node:net';
if (!process.env.EVAL_INTERACTION_PORT) {
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  process.env.EVAL_INTERACTION_PORT = String(probe.address().port);
  await new Promise((resolve) => probe.close(resolve));
}
const port = Number(process.env.EVAL_INTERACTION_PORT);
export default defineConfig({
  testDir: './tests', workers: 1, timeout: 15000,
  use: { baseURL: 'http://127.0.0.1:' + port, headless: true },
  webServer: { command: 'node scripts/serve.mjs ' + port, port, reuseExistingServer: false },
});
