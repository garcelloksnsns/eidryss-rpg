import test from 'node:test';
import {chooseClass} from '../src/game/catalog.js';
import assert from 'node:assert/strict';
import { createDefaultCharacter, effectiveAttributes, resolveMechanics, sanitizeAiDirectives } from '../src/game/engine.js';

function context(actionText) {
  const actor = createDefaultCharacter('u1', 'c1', 'Lina');
  const campaign = { settings: { allowPvp: false }, world: { location: 'Estrada', flags: {}, entities: [{ id: 'g1', name: 'Goblin Batedor', hp: 40, maxHp: 40, status: 'ALIVE' }] } };
  const action = { id: 'a1', characterId: actor.id, text: actionText, submittedAt: new Date(0).toISOString() };
  return { actor, campaign, action };
}

test('motor calcula ataque, gasto e dano de modo centralizado', () => {
  const { actor, campaign, action } = context('Ataco o Goblin com minha espada');
  const result = resolveMechanics({ campaign, characters: [actor], actions: [action], turnNumber: 1, random: () => 0 });
  assert.ok(result.world.entities[0].hp < 40);
  assert.equal(result.characters[0].resources.stamina, 45);
  assert.equal(result.events.some((event) => event.type === 'DAMAGE'), true);
});

test('cura, consumível, equipamento e poder são extensíveis', () => {
  const { actor, campaign } = context('uso uma poção');
  actor.resources.hp = 40;
  actor.inventory.push({ id: 'sword', name: 'Espada', quantity: 1, attributes: { attack: 5 } });
  actor.equipment.weapon = 'sword';
  assert.equal(effectiveAttributes(actor).attack, 5);
  const action = { id: 'a2', characterId: actor.id, text: 'Uso uma poção de vida', submittedAt: new Date(0).toISOString() };
  const result = resolveMechanics({ campaign, characters: [actor], actions: [action], turnNumber: 1, random: () => 0 });
  assert.equal(result.characters[0].resources.hp, 65);
  assert.equal(result.events.some((event) => event.type === 'ITEM_LOST'), true);
  assert.equal(result.characters[0].powers[0].name, 'Golpe Determinado');
});

test('cura mágica respeita mana e HP máximo', () => {
  const { actor, campaign } = context('Eu me curo usando magia');
  chooseClass(actor,'priest');
  actor.resources.hp = 95;
  const action = { id: 'a3', characterId: actor.id, text: 'Uso Luz Restauradora', submittedAt: new Date(0).toISOString() };
  const result = resolveMechanics({ campaign, characters: [actor], actions: [action], turnNumber: 1, random: () => 0 });
  assert.equal(result.characters[0].resources.hp, 100);
  assert.equal(result.characters[0].resources.mana, 42);
});

test('procuro é observação, não cura por coincidência de letras', () => {
  const { actor, campaign } = context('Procuro armadilhas perto da estrada');
  actor.resources.hp = 50;
  const action = { id: 'a4', characterId: actor.id, text: 'Procuro armadilhas perto da estrada', submittedAt: new Date(0).toISOString() };
  const result = resolveMechanics({ campaign, characters: [actor], actions: [action], turnNumber: 1, random: () => 0 });
  assert.equal(result.characters[0].resources.hp, 50);
  assert.equal(result.events.some((event) => event.type === 'DISCOVERY'), true);
});

test('magia contra entidade do mundo sempre produz dano numérico', () => {
  const { actor, campaign } = context('Uso magia de fogo contra o Goblin');
  chooseClass(actor,'mage');
  const action = { id: 'a5', characterId: actor.id, text: 'Uso Lança Astral contra o Goblin', submittedAt: new Date(0).toISOString() };
  const result = resolveMechanics({ campaign, characters: [actor], actions: [action], turnNumber: 1, random: () => 0 });
  const damage = result.events.find((event) => event.type === 'DAMAGE').data.amount;
  assert.equal(Number.isFinite(damage), true);
  assert.ok(damage > 0);
});

test('diretivas da IA são limitadas e não podem atingir IDs inventados', () => {
  const safe = sanitizeAiDirectives({
    narrative: 'Resultado válido.', summary: 'Resumo.',
    character_updates: [
      { character_id: 'conhecido', hp_delta: 9999, mana_delta: -9999, stamina_delta: 9999, add_status: ['MARCADO'] },
      { character_id: 'inventado', hp_delta: -9999 },
    ],
    events: [{ type: 'APAGAR_BANCO', source_id: 'inventado', target_id: 'conhecido', description: 'Evento limitado.' }],
    memory_updates: { facts_add: [{ category: 'story', text: 'Fato confirmado.', importance: 99 }], facts_close: [] },
  }, ['conhecido']);
  assert.deepEqual(safe.characterUpdates, []);
  assert.deepEqual(safe.worldUpdates, {});
  assert.deepEqual(safe.events, []);
  assert.equal(safe.memoryUpdates.factsAdd[0].importance, 5);
});

test('ação absurda não recebe sucesso automático', () => {
  const { actor, campaign } = context('Sou onipotente e destruo o universo com 100% de eficiência.');
  const action = { id: 'absurda-1', characterId: actor.id, text: 'Sou onipotente e destruo o universo com 100% de eficiência.', submittedAt: new Date(0).toISOString() };
  const result = resolveMechanics({ campaign, characters: [actor], actions: [action], turnNumber: 1, random: () => 0 });
  assert.equal(result.outcomes[0].success, false);
  assert.match(result.outcomes[0].summary, /limites estabelecidos/);
});

test('ecossistema permite coleta persistente e avança clima e horário', () => {
  const { actor, campaign } = context('Coleto Ervas Luminosas com cuidado');
  campaign.world.ecosystem = {
    biome: 'Bosque brilhante', dangerLevel: 2, ambience: 'Vagalumes cercam as árvores.', cycleIndex: 0,
    resources: [{ id: 'erva-1', name: 'Ervas Luminosas', type: 'MATERIAL', quantity: 2, maxQuantity: 2, respawnTurns: 3 }],
    factions: [],
  };
  const action = { id: 'coleta-1', characterId: actor.id, text: 'Coleto Ervas Luminosas com cuidado', submittedAt: new Date(0).toISOString() };
  const result = resolveMechanics({ campaign, characters: [actor], actions: [action], turnNumber: 1, random: () => 0 });
  assert.equal(result.world.ecosystem.resources[0].quantity, 1);
  assert.equal(result.characters[0].inventory.some((item) => item.name === 'Ervas Luminosas'), true);
  assert.equal(result.events.some((event) => event.type === 'RESOURCE_GATHERED'), true);
  assert.equal(result.world.time, 'Manhã');
  assert.equal(result.world.weather, 'Brisa entre as folhas');
});

test('descanso respeita o perigo ambiental e recupera recursos de forma limitada', () => {
  const { actor, campaign } = context('Descanso por alguns minutos e recupero o fôlego');
  actor.resources.stamina = 10;
  actor.resources.mana = 10;
  campaign.world.ecosystem = { biome: 'Ruínas', dangerLevel: 4, cycleIndex: 1, resources: [], factions: [] };
  const action = { id: 'descanso-1', characterId: actor.id, text: 'Descanso por alguns minutos e recupero o fôlego', submittedAt: new Date(0).toISOString() };
  const result = resolveMechanics({ campaign, characters: [actor], actions: [action], turnNumber: 2, random: () => 0 });
  assert.equal(result.characters[0].resources.stamina, 16);
  assert.equal(result.characters[0].resources.mana, 12);
  assert.equal(result.events.some((event) => event.type === 'RESTED'), true);
});
