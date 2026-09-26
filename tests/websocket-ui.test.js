import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import { client, register, testApplication } from './helpers.js';

test('interface é servida e WebSocket autenticado aceita conexão', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const browser = client(app.base); await register(browser, 1);
  const created = await browser.request('/api/campaigns', { method: 'POST', body: { name: 'Sala WebSocket', maxPlayers: 2, minPlayers: 2 } });
  const page = await fetch(`${app.base}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Eidryss/);
  const script = await fetch(`${app.base}/app.js`);
  assert.equal(script.status, 200);
  const scriptText = await script.text();
  assert.match(scriptText, /new WebSocket/);
  assert.match(scriptText, /Aprenda jogando com a Íris/);
  assert.match(scriptText, /Salvar e sair/);
  assert.match(scriptText, /Outra API compatível/);
  assert.match(scriptText, /Mundo vivo/);
  assert.match(scriptText, /INICIAR-ONLINE-TERMUX\.sh/);
  assert.match(scriptText, /visualTheme/);

  const onlineScript = await fs.readFile(path.resolve('INICIAR-ONLINE-TERMUX.sh'), 'utf8');
  assert.match(onlineScript, /cloudflared tunnel --url http:\/\/127\.0\.0\.1:8000/);

  const port = new URL(app.base).port;
  const response = await new Promise((resolve, reject) => {
    const socket = net.connect(Number(port), '127.0.0.1');
    const key = crypto.randomBytes(16).toString('base64');
    let received = Buffer.alloc(0);
    socket.on('connect', () => socket.write(`GET /ws?campaignId=${created.data.campaign.id} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nCookie: ${browser.cookie}\r\n\r\n`));
    socket.on('data', (chunk) => { received = Buffer.concat([received, chunk]); if (received.includes(Buffer.from('CONNECTED'))) { socket.destroy(); resolve(received.toString('latin1')); } });
    socket.on('error', reject);
    setTimeout(() => { socket.destroy(); reject(new Error('timeout websocket')); }, 2000).unref();
  });
  assert.match(response, /101 Switching Protocols/);
});
