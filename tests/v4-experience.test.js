import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { client, register, testApplication } from './helpers.js';

test('perfil 4.0 salva avatar e nome sem expor segredos', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const browser = client(app.base); await register(browser, 91);
  const changed = await browser.request('/api/profile', { method:'PATCH', body:{ displayName:'Arcanista', presentation:{ avatar:'🌙', accent:'#8877ff' } } });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.user.displayName, 'Arcanista');
  assert.deepEqual(changed.data.user.presentation, { avatar:'🌙', accent:'#8877ff' });
  const me = await browser.request('/api/auth/me');
  assert.deepEqual(me.data.user.presentation, { avatar:'🌙', accent:'#8877ff' });
  assert.equal(JSON.stringify(me.data).includes('passwordHash'), false);
});

test('login pode ser persistente ou somente da sessão do navegador', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const browser = client(app.base); await register(browser, 92);
  await browser.request('/api/auth/logout', { method:'POST' });
  const temporary = await fetch(`${app.base}/api/auth/login`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ username:'jogador92', password:'senha-forte-92', remember:false }) });
  assert.equal(temporary.status, 200);
  assert.doesNotMatch(temporary.headers.get('set-cookie') || '', /Max-Age=/i);
  const persistent = await fetch(`${app.base}/api/auth/login`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ username:'jogador92', password:'senha-forte-92', remember:true }) });
  assert.match(persistent.headers.get('set-cookie') || '', /Max-Age=/i);
});

test('frontend 4.0 inclui recursos compactos sem cachear dados sensíveis', async () => {
  const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await fs.readFile(new URL('../public/style.css', import.meta.url), 'utf8');
  const sw = await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(source, /germinal_last_campaign/);
  assert.match(source, /germinal_draft:/);
  assert.match(source, /inventory-search/);
  assert.match(source, /beforeinstallprompt/);
  assert.match(source, /PRESENCE_CHANGED/);
  assert.match(css, /data-compact="compact"/);
  assert.match(css, /presence-dot/);
  assert.match(sw, /\/api\//);
  assert.doesNotMatch(sw, /germinal_session|apiKey|campaignId/);
});
