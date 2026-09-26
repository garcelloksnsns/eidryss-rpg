import test from 'node:test';
import assert from 'node:assert/strict';
import { client, register, testApplication } from './helpers.js';

test('fluxo completo com quatro jogadores fecha uma vez e abre o próximo turno', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const players = [1, 2, 3, 4].map(() => client(app.base));
  for (let i = 0; i < players.length; i += 1) assert.equal((await register(players[i], i + 1)).status, 201);
  const created = await players[0].request('/api/campaigns', { method: 'POST', body: { name: 'As Quatro Sementes', description: 'Teste integral.', maxPlayers: 4, minPlayers: 4, allowActionEdit: false } });
  const campaign = created.data.campaign;
  for (let i = 1; i < players.length; i += 1) assert.equal((await players[i].request('/api/campaigns/join', { method: 'POST', body: { code: campaign.joinCode } })).status, 200);
  assert.equal((await players[0].request(`/api/campaigns/${campaign.id}/start`, { method: 'POST' })).status, 200);

  const first = await players[0].request(`/api/campaigns/${campaign.id}/action`, { method: 'POST', body: { text: 'Observo o Goblin e procuro armadilhas.' } });
  assert.equal(first.data.ready, 1);
  const secretView = await players[1].request(`/api/campaigns/${campaign.id}/state`);
  assert.equal(secretView.data.turn.ready, 1);
  assert.equal(secretView.data.turn.myAction, null);
  assert.equal(JSON.stringify(secretView.data).includes('procuro armadilhas'), false);
  const duplicate = await players[0].request(`/api/campaigns/${campaign.id}/action`, { method: 'POST', body: { text: 'Tento outra coisa.' } });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.data.error, 'ACTION_ALREADY_SUBMITTED');
  await players[1].request(`/api/campaigns/${campaign.id}/action`, { method: 'POST', body: { text: 'Ataco o Goblin com a espada.' } });
  const simultaneous = await Promise.all([
    players[2].request(`/api/campaigns/${campaign.id}/action`, { method: 'POST', body: { text: 'Uso magia de fogo contra o Goblin.' } }),
    players[3].request(`/api/campaigns/${campaign.id}/action`, { method: 'POST', body: { text: 'Defendo meus aliados com meu escudo.' } }),
  ]);
  assert.equal(simultaneous.every((response) => response.status === 200), true);
  assert.equal(simultaneous.filter((response) => response.data.resolved).length, 1);

  const views = await Promise.all(players.map((player) => player.request(`/api/campaigns/${campaign.id}/state`)));
  const narratives = views.map((view) => view.data.lastResult.narrative);
  assert.equal(new Set(narratives).size, 1);
  assert.equal(views[0].data.turn.number, 2);
  assert.equal(views[0].data.turn.status, 'COLLECTING_ACTIONS');
  const history = await players[0].request(`/api/campaigns/${campaign.id}/history`);
  assert.equal(history.data.history.length, 1);
  assert.equal(history.data.history[0].actions.length, 4);
});

test('falha da IA preserva o turno selado até o líder corrigir a credencial', async (t) => {
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';
  t.after(() => { if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey; });
  const app = await testApplication({ narrative: { availability: () => ({ gemini: false, openai: false, grok: false, openrouter: false, custom: false }), generate: async () => { throw new Error('Créditos da API esgotados.'); } } }); t.after(app.cleanup);
  const players = [client(app.base), client(app.base)];
  await register(players[0], 11); await register(players[1], 12);
  const created = await players[0].request('/api/campaigns', { method: 'POST', body: { name: 'Fallback Seguro', maxPlayers: 2, minPlayers: 2, aiProvider: 'gemini' } });
  const campaign = created.data.campaign;
  await players[1].request('/api/campaigns/join', { method: 'POST', body: { code: campaign.joinCode } });
  await players[0].request(`/api/campaigns/${campaign.id}/start`, { method: 'POST' });
  await players[0].request(`/api/campaigns/${campaign.id}/action`, { method: 'POST', body: { text: 'Observo a estrada com cuidado.' } });
  const final = await players[1].request(`/api/campaigns/${campaign.id}/action`, { method: 'POST', body: { text: 'Defendo meu companheiro.' } });
  assert.equal(final.status, 200);
  const view = await players[0].request(`/api/campaigns/${campaign.id}/state`);
  assert.equal(view.data.lastResult, null);
  assert.equal(view.data.turn.number, 1);
  assert.equal(view.data.turn.status, 'WAITING_FOR_AI');
  assert.match(view.data.turn.aiError, /Créditos/);
});

test('retomar campanha abre novo turno se o anterior terminou durante a pausa', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const owner = client(app.base); const guest = client(app.base);
  await register(owner, 71); await register(guest, 72);
  const created = await owner.request('/api/campaigns', { method: 'POST', body: { name: 'Pausa Segura', maxPlayers: 2, minPlayers: 2 } });
  const campaign = created.data.campaign;
  await guest.request('/api/campaigns/join', { method: 'POST', body: { code: campaign.joinCode } });
  await owner.request(`/api/campaigns/${campaign.id}/start`, { method: 'POST' });
  await owner.request(`/api/campaigns/${campaign.id}/pause`, { method: 'POST' });
  await app.store.mutate((state) => {
    const item = state.campaigns.find((entry) => entry.id === campaign.id);
    state.turns.find((turn) => turn.id === item.currentTurnId).status = 'RESOLVED';
  });

  const resumed = await owner.request(`/api/campaigns/${campaign.id}/resume`, { method: 'POST' });
  assert.equal(resumed.status, 200);
  const state = await owner.request(`/api/campaigns/${campaign.id}/state`);
  assert.equal(state.data.campaign.state, 'ACTIVE');
  assert.equal(state.data.turn.number, 2);
  assert.equal(state.data.turn.status, 'COLLECTING_ACTIONS');
});
