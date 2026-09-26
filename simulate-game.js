import fs from 'node:fs/promises';
import path from 'node:path';
import { createConfig } from './src/core/config.js';
import { SecretVault } from './src/core/secret-vault.js';
import { JsonStore } from './src/data/store.js';
import { GameService } from './src/services/game-service.js';

const rootDir = process.cwd();
const simulationFile = path.join(rootDir, 'data', 'simulation.json');
await fs.rm(simulationFile, { force: true });
const config = createConfig({ rootDir, dataFile: simulationFile, vaultKeyFile: path.join(rootDir, 'data', 'simulation.key') });
const store = await new JsonStore(config.dataFile).init();
const narrative = {
  availability: () => ({ gemini: true, openai: true, grok: true, openrouter: true, custom: true }),
  async generate(context) { return { narrative: `Simulação: ${context.mechanics.outcomes.map((item) => item.summary).join(' ')}`, summary: context.mechanics.outcomes.map((item) => item.summary).join(' '), world_updates: {}, character_updates: [], events: [], memory_updates: { facts_add: [], facts_close: [] }, provider: 'simulation' }; },
};
const vault = await SecretVault.open(config.vaultKeyFile);
const game = new GameService({ store, narrative, config, vault });

const names = ['Luiz', 'Duda', 'Caio', 'Luna'];
const accounts = [];
for (let index = 0; index < names.length; index += 1) {
  accounts.push(await game.register({ username: `simulador${index + 1}`, displayName: names[index], password: `germinal-${index + 1}-segura` }));
}
const campaign = await game.createCampaign(accounts[0].user.id, {
  name: 'A Semente do Eclipse', description: 'Quatro viajantes precisam atravessar uma estrada dominada por criaturas.',
  introMode:'arrival', maxPlayers: 4, minPlayers: 4, aiProvider: 'gemini', allowActionEdit: true,
});
for (let index = 1; index < accounts.length; index += 1) await game.joinCampaign(accounts[index].user.id, campaign.joinCode);
for(const [i,account]of accounts.entries())await game.updateMyCharacter(campaign.id,account.user.id,{classId:['warrior','mage','knight','archer'][i]});
await game.startCampaign(campaign.id, accounts[0].user.id);

const turns = [
  [
    'Observo a estrada e procuro armadilhas perto do Goblin.',
    'Avanço para a carroça abandonada com cuidado.',
    'Protejo o grupo com meu escudo.',
    'Uso minha percepção para localizar outros inimigos.',
  ],
  [
    'Ataco o Goblin com um corte rápido de espada.',
    'Uso Lança Astral contra o Goblin.',
    'Defendo meus aliados contra qualquer contra-ataque.',
    'Ataco o Goblin com um chute certeiro.',
  ],
  [
    'Coleto Ervas Luminosas com cuidado.',
    'Descanso por alguns minutos e recupero o fôlego.',
    'Converso com Eira, guarda da trilha, antes de avançar.',
    'Observo os rastros deixados na estrada.',
  ],
];

for (let turnIndex = 0; turnIndex < turns.length; turnIndex += 1) {
  console.log(`\n--- TURNO ${turnIndex + 1} ---`);
  for (let playerIndex = 0; playerIndex < accounts.length; playerIndex += 1) {
    await game.submitAction(campaign.id, accounts[playerIndex].user.id, turns[turnIndex][playerIndex]);
  }
  const view = game.campaignState(campaign.id, accounts[0].user.id);
  console.log(view.lastResult.narrative);
}

const history = game.history(campaign.id, accounts[0].user.id);
console.log('\n=========================================');
console.log(`Simulação concluída: ${history.length} turnos, ${accounts.length} jogadores.`);
console.log(`Banco da simulação: ${simulationFile}`);
