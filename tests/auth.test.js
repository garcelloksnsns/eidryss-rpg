import test from 'node:test';
import assert from 'node:assert/strict';
import { client, register, testApplication } from './helpers.js';

test('registro, sessão, logout e login protegem a conta', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const first = client(app.base);
  const created = await register(first, 1);
  assert.equal(created.status, 201);
  assert.equal(created.data.user.username, 'jogador1');
  assert.match(first.cookie, /^germinal_session=/);

  const me = await first.request('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.data.user.displayName, 'Jogador 1');

  const duplicate = await client(app.base).request('/api/auth/register', { method: 'POST', body: { username: 'jogador1', displayName: 'Outro', password: 'senha-forte-2' } });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.data.error, 'USERNAME_TAKEN');

  await first.request('/api/auth/logout', { method: 'POST' });
  const rejected = await first.request('/api/auth/me');
  assert.equal(rejected.status, 401);

  const login = await first.request('/api/auth/login', { method: 'POST', body: { username: 'jogador1', password: 'senha-forte-1' } });
  assert.equal(login.status, 200);

  const tunnelLogin = await fetch(`${app.base}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ username: 'jogador1', password: 'senha-forte-1' }),
  });
  assert.equal(tunnelLogin.status, 200);
  assert.match(tunnelLogin.headers.get('set-cookie'), /; Secure/);
});
