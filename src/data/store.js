import { CLASSES, ensureProgression, chooseClass } from '../game/catalog.js';
import { ensureAtlas, ensureWorldDirector, ensureBestiary } from '../game/world.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const emptyDatabase = () => ({
  schemaVersion: 14,
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
    discoveredLocations: [], quests: [], flags: {}, metadata: {}, activeScenes: {}, localStates: {}, spatialVersion: 1,
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

function migrateRelationship(value) {
  if (value && typeof value === 'object') return {
    affection: Math.max(0, Math.min(100, Number(value.affection || 0))),
    trust: Math.max(0, Math.min(100, Number(value.trust || 0))),
    suspicion: Math.max(0, Math.min(100, Number(value.suspicion || 0))),
    lastInteractionTurn: Number(value.lastInteractionTurn || 0),
    history: Array.isArray(value.history) ? value.history.slice(-20) : [],
  };
  const legacy = Math.max(-100, Math.min(100, Number(value || 0)));
  return {
    affection: Math.max(0, legacy), trust: Math.max(0, legacy), suspicion: Math.max(0, -legacy),
    lastInteractionTurn: 0, history: [],
  };
}

function migrate(database) {
  const state = { ...emptyDatabase(), ...database };
  state.users = state.users.map((user) => ({ aiCredentials: {}, presentation: { avatar: '✦', accent: '#8b7cff' }, ...user, presentation: { avatar: '✦', accent: '#8b7cff', ...(user.presentation || {}) } }));
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
    const campaign=state.campaigns.find(item=>item.id===c.campaignId);
    c.location ||= campaign?.world?.location || 'Encruzilhada de Eidryss';
    c.knownNpcIds = Array.isArray(c.knownNpcIds) ? c.knownNpcIds : [];
    c.knownLocationIds = Array.isArray(c.knownLocationIds) ? c.knownLocationIds : [];
    c.knownFacts = Array.isArray(c.knownFacts) ? c.knownFacts : [];
    c.knownBestiaryKeys = Array.isArray(c.knownBestiaryKeys) ? c.knownBestiaryKeys : [];
    c.travel = c.travel && typeof c.travel === 'object' ? c.travel : null;
    c.zone ||= 'centro';
    const characterAtlas=ensureAtlas(campaign?.world||{});const currentNode=characterAtlas.nodes.find(node=>node.name===c.location);if(!c.knownLocationIds.length)c.knownLocationIds.push(...characterAtlas.nodes.filter(node=>node.known).map(node=>node.id));if(currentNode&&!c.knownLocationIds.includes(currentNode.id))c.knownLocationIds.push(currentNode.id);
    for(const npc of campaign?.world?.npcs||[])if(!npc.location||npc.location===c.location)if(!c.knownNpcIds.includes(npc.id))c.knownNpcIds.push(npc.id);
  });
  state.campaigns.forEach(c => {
    ensureAtlas(c.world); ensureWorldDirector(c.world); ensureBestiary(c.world);
    for(const npc of c.world.npcs||[]){
      npc.values=Array.isArray(npc.values)?npc.values:[];npc.goals=Array.isArray(npc.goals)?npc.goals:[npc.privateProfile?.goals].filter(Boolean);npc.fears=Array.isArray(npc.fears)?npc.fears:[];npc.interests=Array.isArray(npc.interests)?npc.interests:[];
      npc.occupation ||= npc.role||'';npc.homeLocation ||= npc.location||c.world.location;npc.currentLocation ||= npc.location||npc.homeLocation;npc.location=npc.currentLocation;npc.faction ||= null;npc.disposition ||= 'NEUTRAL';npc.speechStyle ||= 'Natural e coerente com sua personalidade.';npc.knowledge=Array.isArray(npc.knowledge)?npc.knowledge:[];npc.secrets=Array.isArray(npc.secrets)?npc.secrets:[];
      npc.relationships ||= {};
      for(const [characterId,value] of Object.entries(npc.relationships))npc.relationships[characterId]=migrateRelationship(value);
      npc.zone ||= 'centro';npc.travel=npc.travel&&typeof npc.travel==='object'?npc.travel:null;npc.lastAction ||= null;
    }
    for(const entity of c.world.entities||[]){entity.zone ||= 'centro';entity.travel=entity.travel&&typeof entity.travel==='object'?entity.travel:null;entity.lastAction ||= null;}
    c.world.quests=(c.world.quests||[]).map(quest=>({origin:quest.origin||'',objectives:Array.isArray(quest.objectives)?quest.objectives:[],location:quest.location||'',npcId:quest.npcId||null,risk:quest.risk||'NORMAL',reward:quest.reward||{xp:Number(quest.rewardXp||0)},consequences:Array.isArray(quest.consequences)?quest.consequences:[],...quest}));
    c.memory ||= {};c.memory.regionMemories=c.memory.regionMemories&&typeof c.memory.regionMemories==='object'?c.memory.regionMemories:{};c.memory.personalFacts=c.memory.personalFacts&&typeof c.memory.personalFacts==='object'?c.memory.personalFacts:{};
  });
  state.actions=state.actions.map(action=>({secretText:'',secretResult:null,...action}));
  state.turns=state.turns.map(turn=>({sceneNarratives:{},sceneMembership:{},...turn}));
  state.schemaVersion = 14;
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
      if((parsed.schemaVersion||0)<14)await fs.copyFile(this.filePath,`${this.filePath}.pre-v14`).catch(error=>{throw error;});
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

  async checkpoint(label = 'manual') {
    await this.queue;
    const directory=`${this.filePath}.checkpoints`;await fs.mkdir(directory,{recursive:true,mode:0o700});
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');const safe=String(label).replace(/[^a-z0-9_-]/gi,'-').slice(0,40)||'manual';const target=path.join(directory,`${stamp}-${safe}.json`);
    await fs.copyFile(this.filePath,target);const handle=await fs.open(target,'r');try{await handle.sync();}finally{await handle.close();}
    const files=(await fs.readdir(directory)).filter(name=>name.endsWith('.json')).sort();for(const old of files.slice(0,-5))await fs.unlink(path.join(directory,old));
    return target;
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
