import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../src/data/store.js';
import { SecretVault } from '../src/core/secret-vault.js';
import { client, register, testApplication } from './helpers.js';

test('banco da versão anterior ganha ecossistema e aparência sem apagar a campanha', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'germinal-migrate-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'legacy.json');
  await fs.writeFile(file, JSON.stringify({
    schemaVersion: 2, users: [], sessions: [], events: [], actions: [], turns: [],
    campaigns: [{ id: 'c1', name: 'Legado', description: 'Ainda existe.', settings: { maxPlayers: 4 }, world: { location: 'Ponte velha' } }],
    characters: [{ id: 'p1', identity: { name: 'Lina' } }],
  }));
  const store = await new JsonStore(file).init();
  const state = store.read();
  assert.equal(state.schemaVersion, 11);
  assert.equal(state.campaigns[0].world.location, 'Ponte velha');
  assert.equal(state.campaigns[0].settings.visualTheme, 'forest');
  assert.equal(Array.isArray(state.campaigns[0].world.ecosystem.resources), true);
  assert.equal(state.characters[0].presentation.avatar, '✦');
});

test('cofre cifra e recupera chaves sem gravar o segredo em texto puro', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const browser = client(app.base);
  const registered = await register(browser, 31);
  const secret = 'sk-chave-super-secreta-123456';

  const saved = await browser.request('/api/profile/ai', {
    method: 'PATCH',
    body: { provider: 'gemini', apiKey: secret, model: 'gemini-2.5-flash' },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.aiCredentials.gemini.configured, true);
  assert.equal(JSON.stringify(saved.data).includes(secret), false);

  const user = app.store.read((state) => state.users.find((item) => item.id === registered.data.user.id));
  assert.match(user.aiCredentials.gemini.encryptedKey, /^v1\./);
  assert.equal(user.aiCredentials.gemini.encryptedKey.includes(secret), false);
  assert.equal(app.vault.decrypt(user.aiCredentials.gemini.encryptedKey), secret);

  const onDisk = await fs.readFile(app.config.dataFile, 'utf8');
  assert.equal(onDisk.includes(secret), false);
  const reopenedStore = await new JsonStore(app.config.dataFile).init();
  assert.equal(reopenedStore.read((state) => state.users.length), 1);
  const reopenedVault = await SecretVault.open(app.config.vaultKeyFile);
  assert.equal(reopenedVault.decrypt(user.aiCredentials.gemini.encryptedKey), secret);
});

test('líder configura API compatível, salva campanha e exporta backup sem chaves', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const owner = client(app.base); const guest = client(app.base);
  await register(owner, 41); await register(guest, 42);
  const customSecret = 'api-chave-compativel-123456';

  const profileSaved = await owner.request('/api/profile/ai', {
    method: 'PATCH',
    body: { provider: 'custom', apiKey: customSecret, model: 'modelo-rpg', baseUrl: 'https://api.exemplo.test/v1' },
  });
  assert.equal(profileSaved.status, 200);

  const created = await owner.request('/api/campaigns', {
    method: 'POST',
    body: {
      name: 'Sala Persistente', description: 'Uma jornada longa.', maxPlayers: 2, minPlayers: 2,
      aiProvider: 'custom',
      worldRules: 'Ninguém possui sucesso automático.',
    },
  });
  assert.equal(created.status, 201);
  const id = created.data.campaign.id;
  assert.equal(created.data.campaign.settings.aiProvider, 'custom');
  assert.equal(created.data.campaign.settings.aiBaseUrl, 'https://api.exemplo.test/v1');

  const profile = await owner.request('/api/profile');
  assert.equal(profile.data.aiCredentials.custom.configured, true);
  assert.equal(profile.data.aiCredentials.custom.baseUrl, 'https://api.exemplo.test/v1');
  assert.equal(JSON.stringify(profile.data).includes(customSecret), false);

  const saved = await owner.request(`/api/campaigns/${id}/save`, { method: 'POST' });
  assert.equal(saved.status, 200);
  assert.ok(saved.data.savedAt);

  const backup = await owner.request(`/api/campaigns/${id}/export`);
  assert.equal(backup.status, 200);
  assert.equal(backup.data.format, 'EIDRYSS_CAMPAIGN_BACKUP');
  assert.equal(JSON.stringify(backup.data).includes(customSecret), false);
  assert.match(backup.headers.get('content-disposition'), /attachment/);

  const denied = await guest.request(`/api/campaigns/${id}/export`);
  assert.equal(denied.status, 403);
  const persisted = JSON.parse(await fs.readFile(app.config.dataFile, 'utf8'));
  assert.equal(persisted.campaigns.some((campaign) => campaign.id === id), true);
  assert.equal(JSON.stringify(persisted).includes(customSecret), false);
});

test('modo teste cria três companheiros e resolve um turno após uma ação humana', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const browser = client(app.base);
  await register(browser, 51);
  await browser.request('/api/profile/ai', { method: 'PATCH', body: { provider: 'gemini', apiKey: 'chave-de-teste-segura-12345', model: 'gemini-3.8-flash' } });

  const demo = await browser.request('/api/demo', { method: 'POST' });
  assert.equal(demo.status, 201);
  const id = demo.data.campaign.id;
  const initial = await browser.request(`/api/campaigns/${id}/state`);
  assert.equal(initial.data.campaign.isDemo, true);
  assert.equal(initial.data.party.length, 4);
  assert.equal(initial.data.party.filter((member) => member.user.isBot).length, 3);
  assert.equal(initial.data.turn.number, 1);

  const action = await browser.request(`/api/campaigns/${id}/action`, {
    method: 'POST', body: { text: 'Observo a ponte e procuro uma rota segura.' },
  });
  assert.equal(action.status, 200);
  assert.equal(action.data.resolved, true);

  const next = await browser.request(`/api/campaigns/${id}/state`);
  assert.equal(next.data.turn.number, 2);
  assert.equal(next.data.memoryStats.recentTurns, 1);
  const history = await browser.request(`/api/campaigns/${id}/history`);
  assert.equal(history.data.history.length, 1);
  assert.equal(history.data.history[0].actions.length, 4);
});

test('URL inválida de API compatível é rejeitada no servidor', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const browser = client(app.base); await register(browser, 61);
  const response = await browser.request('/api/profile/ai', {
    method: 'PATCH',
    body: { provider: 'custom', apiKey: 'chave-comprida-valida', model: 'modelo', baseUrl: 'file:///segredo' },
  });
  assert.equal(response.status, 400);
  assert.equal(response.data.error, 'INVALID_API_URL');
});
