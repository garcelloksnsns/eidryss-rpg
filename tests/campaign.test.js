import test from 'node:test';
import assert from 'node:assert/strict';
import { client, register, testApplication } from './helpers.js';

test('campanha recebe jogadores por código e protege configurações', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const owner = client(app.base); const guest = client(app.base);
  await register(owner, 1); await register(guest, 2);
  const created = await owner.request('/api/campaigns', { method: 'POST', body: { name: 'Reino de Teste', description: 'Uma campanha.', maxPlayers: 2, minPlayers: 2 } });
  assert.equal(created.status, 201);
  assert.match(created.data.campaign.joinCode, /^EIDRYSS-\d{4}$/);

  const joined = await guest.request('/api/campaigns/join', { method: 'POST', body: { code: created.data.campaign.joinCode.toLowerCase() } });
  assert.equal(joined.status, 200);
  assert.equal(joined.data.campaign.memberCount, 2);

  const forbidden = await guest.request(`/api/campaigns/${created.data.campaign.id}/settings`, { method: 'PATCH', body: { allowPvp: true } });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.data.error, 'NOT_AUTHORIZED');

  const game = await owner.request(`/api/campaigns/${created.data.campaign.id}/state`);
  assert.equal(game.data.party.length, 2);
  assert.equal(game.data.character.inventory[0].name, 'Poção de Vida');
});

test('líder personaliza tema da sala e aparência da própria ficha', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const owner = client(app.base); await register(owner, 91);
  const created = await owner.request('/api/campaigns', {
    method: 'POST', body: { name: 'Aurora Cósmica', description: 'Teste visual.', maxPlayers: 2, minPlayers: 2, visualTheme: 'cosmic', campaignIcon: '🌙' },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.campaign.settings.visualTheme, 'cosmic');
  assert.equal(created.data.campaign.settings.campaignIcon, '🌙');

  const changed = await owner.request(`/api/campaigns/${created.data.campaign.id}/character`, {
    method: 'PATCH', body: { presentation: { avatar: '🔮', accent: '#a98cff', aura: 'cosmico' } },
  });
  assert.equal(changed.status, 200);
  const state = await owner.request(`/api/campaigns/${created.data.campaign.id}/state`);
  assert.equal(state.data.character.presentation.avatar, '🔮');
  assert.equal(state.data.party[0].character.presentation.accent, '#a98cff');

  const updated = await owner.request(`/api/campaigns/${created.data.campaign.id}/settings`, {
    method: 'PATCH', body: { visualTheme: 'ocean', campaignIcon: '🧭' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.campaign.settings.visualTheme, 'ocean');
  assert.equal(updated.data.campaign.settings.campaignIcon, '🧭');
});
