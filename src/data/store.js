import { CLASSES, ensureProgression, chooseClass } from '../game/catalog.js';
import { ensureAtlas, ensureWorldDirector, ensureBestiary } from '../game/world.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const emptyDatabase = () => ({
  schemaVersion: 11,
  users: [],
  sessions: [],
  campaigns: [],
  characters: [],
  turns: [],
  actions: [],
  events: [],
});

function migrateWorld(world = {}) {
  const ecosystem = world.ecosystem && typeof world.ecosystem === 'object' ? world.ecosystem : {};
  return {
    location: 'Encruzilhada de Eidryss', time: 'Amanhecer', weather: 'Céu limpo', entities: [], npcs: [], events: [],
    discoveredLocations: [], quests: [], flags: {}, metadata: {},
    ...world,
    ecosystem: {
      biome: 'Floresta ancestral', dangerLevel: 2, ambience: 'Folhas sussurram ao redor da trilha.', cycleIndex: 0,
      resources: [], factions: [],
      ...ecosystem,
      resources: Array.isArray(ecosystem.resources) ? ecosystem.resources : [],
      factions: Array.isArray(ecosystem.factions) ? ecosystem.factions : [],
    },
  };
}

function migrate(database) {
  const state = { ...emptyDatabase(), ...database };
  state.users = state.users.map((user) => ({
    aiCredentials: {},
    presentation: { avatar: '✦', accent: '#8b7cff' },
    preferences: { performanceMode:'auto', motionMode:'full', density:'comfortable', textScale:'normal', mapDetail:'rich', ambientEffects:true },
    ...user,
    presentation: { avatar: '✦', accent: '#8b7cff', ...(user.presentation || {}) },
    preferences: {
      performanceMode:'auto', motionMode:'full', density:'comfortable', textScale:'normal', mapDetail:'rich', ambientEffects:true,
      ...(user.preferences || {}),
    },
  }));
  state.campaigns = state.campaigns.map((campaign) => ({
    isDemo: false,
    masterUserId: campaign.masterUserId || campaign.ownerId,
    coMasterUserIds: Array.isArray(campaign.coMasterUserIds) ? campaign.coMasterUserIds : [],
    lobbyReadyUserIds: Array.isArray(campaign.lobbyReadyUserIds) ? campaign.lobbyReadyUserIds : [],
    activeVote: campaign.activeVote || null,
    voteHistory: Array.isArray(campaign.voteHistory) ? campaign.voteHistory : [],
    awayUserIds: Array.isArray(campaign.awayUserIds) ? campaign.awayUserIds : [],
    lastSavedAt: campaign.updatedAt || campaign.createdAt,
    ...campaign,
    world: migrateWorld(campaign.world),
    settings: { worldRules: '', aiBaseUrl: '', visualTheme: 'forest', campaignIcon: '✦', aiProvider: 'gemini', aiFallbackProvider: 'none', narrativeDepth: 'cinematic', worldEventFrequency: 'normal', allowLateJoin: true, continueWithAbsentees: true, minPlayers: Math.min(2, campaign.settings?.maxPlayers || 4), ...campaign.settings, aiProvider: campaign.settings?.aiProvider === 'local' ? 'gemini' : campaign.settings?.aiProvider || 'gemini' },
  }));
  state.characters = state.characters.map((character) => ({
    presentation: { avatar: '✦', accent: '#6de7a5', aura: 'folha' },
    ...character,
    presentation: { avatar: '✦', accent: '#6de7a5', aura: 'folha', ...(character.presentation || {}) },
  }));
  state.characters.forEach(c=>{
    ensureProgression(c);
    c.joinedTurn ||= 1;
    if(!c.classId&&c.attributes&&c.resources){
      c.legacyPowers=structuredClone(c.powers||[]);const attributes=c.attributes;
      const names={Mago:'mage',Arcanista:'mage',Sacerdote:'priest',Espadachim:'swordsman',Guardiã:'knight'};
      chooseClass(c,names[c.identity?.class]||'warrior');c.attributes=attributes;
    }
    if(c.specialization&&!c.pathId){const cls=CLASSES.find(item=>item.id===c.classId);const path=cls?.paths?.find(item=>item.name===c.specialization);if(path)c.pathId=path.id;}
  });
  state.campaigns.forEach(c => { ensureAtlas(c.world); ensureWorldDirector(c.world); ensureBestiary(c.world); });
  state.schemaVersion = 11;
  return state;
}

export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = emptyDatabase();
    this.queue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
      if((parsed.schemaVersion||0)<11)await fs.copyFile(this.filePath,`${this.filePath}.pre-v11`).catch(error=>{throw error;});
      this.state = migrate(parsed);
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Banco não pôde ser aberto. Arquivo original preservado; restaure um backup antes de iniciar.', { cause: error });
      this.state = emptyDatabase();
      await this.#persist(this.state);
    }
    return this;
  }

  read(selector = (state) => state) {
    return selector(structuredClone(this.state));
  }

  mutate(mutator) {
    const operation = async () => {
      const draft = structuredClone(this.state);
      const result = await mutator(draft);
      await this.#persist(draft);
      this.state = draft;
      return structuredClone(result);
    };
    const pending = this.queue.then(operation, operation);
    this.queue = pending.then(() => undefined, () => undefined);
    return pending;
  }

  async #persist(state) {
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    const handle = await fs.open(temporary, 'r+');
    try { await handle.sync(); } finally { await handle.close(); }
    await fs.copyFile(this.filePath, `${this.filePath}.bak`).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await fs.rename(temporary, this.filePath);
  }
}
