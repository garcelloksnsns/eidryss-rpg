import net from 'node:net';
import { CLASSES, ITEMS, ATTRIBUTES, chooseClass, ensureProgression, allocate, train, makeItem, makeGeneratedItem, grantXp } from '../game/catalog.js';
import { ensureAtlas, ensureWorldDirector, ensureQuestJournal, initializeIsekai, publicAtlas, publicBestiary, publicEventForecast } from '../game/world.js';
import { assert, AppError } from '../core/errors.js';
import { hashPassword, newToken, tokenDigest, verifyPassword } from '../core/security.js';
import { clamp, cleanText, joinCode, newId, normalizeUsername, nowIso, publicUser } from '../core/utils.js';
import { createDefaultCharacter, effectiveAttributes, resolveMechanics, sanitizeAiDirectives } from '../game/engine.js';
import { MASTERY_RANKS, TALENTS, choosePath, derivedStats, gainAttributeMastery, masteryRankFor, nextMasteryRank, spendTalent } from '../game/progression.js';
import { RECIPES, craft, recipeStatus } from '../game/crafting.js';
import { buyMarketItem, marketPresentation, sellInventoryItem } from '../game/economy.js';
import { advanceCampaignMemory, createCampaignMemory, ensureCampaignMemory } from '../game/memory.js';

const PROVIDERS = new Set(['gemini', 'openai', 'grok', 'groq', 'openrouter', 'custom']);
const VISUAL_THEMES = new Set(['forest', 'ocean', 'ember', 'cosmic']);
const CHARACTER_AURAS = new Set(['folha', 'oceano', 'brasa', 'cosmico']);

const PERFORMANCE_MODES = new Set(['auto','cinematic','balanced','light','ultra']);
const MOTION_MODES = new Set(['full','reduced']);
const DENSITY_MODES = new Set(['comfortable','compact']);
const TEXT_SCALES = new Set(['small','normal','large','xl']);
const MAP_DETAIL_MODES = new Set(['rich','standard','minimal']);

function interfacePreferences(value = {}) {
  const performanceMode = cleanText(value.performanceMode || 'auto', 20).toLowerCase();
  const motionMode = cleanText(value.motionMode || 'full', 20).toLowerCase();
  const density = cleanText(value.density || 'comfortable', 20).toLowerCase();
  const textScale = cleanText(value.textScale || 'normal', 20).toLowerCase();
  const mapDetail = cleanText(value.mapDetail || 'rich', 20).toLowerCase();
  assert(PERFORMANCE_MODES.has(performanceMode), 'INVALID_PREFERENCE', 'Escolha um modo de desempenho válido.');
  assert(MOTION_MODES.has(motionMode), 'INVALID_PREFERENCE', 'Escolha uma opção de animação válida.');
  assert(DENSITY_MODES.has(density), 'INVALID_PREFERENCE', 'Escolha uma densidade de interface válida.');
  assert(TEXT_SCALES.has(textScale), 'INVALID_PREFERENCE', 'Escolha um tamanho de texto válido.');
  assert(MAP_DETAIL_MODES.has(mapDetail), 'INVALID_PREFERENCE', 'Escolha um nível de detalhe do mapa válido.');
  return { performanceMode, motionMode, density, textScale, mapDetail, ambientEffects: value.ambientEffects !== false };
}

function userPresentation(value = {}) {
  const avatar = cleanText(value.avatar || '✦', 16) || '✦';
  const accent = cleanText(value.accent || '#8b7cff', 16);
  assert(/^#[0-9a-f]{6}$/i.test(accent), 'INVALID_PRESENTATION', 'A cor do perfil deve estar no formato #RRGGBB.');
  return { avatar, accent };
}

function visualTheme(value) {
  const theme = cleanText(value || 'forest', 20).toLowerCase();
  assert(VISUAL_THEMES.has(theme), 'INVALID_THEME', 'Escolha um tema visual disponível.');
  return theme;
}

function campaignIcon(value) {
  const icon = cleanText(value || '✦', 16);
  assert(icon.length <= 16, 'INVALID_ICON', 'O ícone da campanha é grande demais.');
  return icon || '✦';
}

function characterPresentation(value = {}) {
  const avatar = cleanText(value.avatar || '✦', 16) || '✦';
  const accent = cleanText(value.accent || '#6de7a5', 16);
  const aura = cleanText(value.aura || 'folha', 20).toLowerCase();
  assert(/^#[0-9a-f]{6}$/i.test(accent), 'INVALID_PRESENTATION', 'A cor do personagem deve estar no formato #RRGGBB.');
  assert(CHARACTER_AURAS.has(aura), 'INVALID_PRESENTATION', 'Escolha uma aura visual disponível.');
  return { avatar, accent, aura };
}

function normalizeAiBaseUrl(value, { required = false } = {}) {
  const text = cleanText(value, 500);
  if (!text) {
    assert(!required, 'INVALID_API_URL', 'Informe o endereço HTTPS da API compatível.');
    return '';
  }
  let parsed;
  try { parsed = new URL(text); } catch { throw new AppError('INVALID_API_URL', 'O endereço da API não é válido. Use uma URL completa.', 400); }
  assert(parsed.protocol === 'https:' || parsed.protocol === 'http:', 'INVALID_API_URL', 'A API precisa usar HTTP ou HTTPS.');
  assert(!parsed.username && !parsed.password && !parsed.hash && !parsed.search, 'INVALID_API_URL', 'Não coloque usuário, senha, parâmetros ou fragmento no endereço da API.');
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const localHttp = hostname==='localhost'||hostname==='::1'||(net.isIP(hostname)===4&&(/^(127|10)\./.test(hostname)||hostname.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)))||(net.isIP(hostname)===6&&/^(fc|fd)/.test(hostname));
  assert(parsed.protocol === 'https:' || localHttp, 'INSECURE_API_URL', 'Use HTTPS. HTTP só é permitido para uma API na rede local.');
  return parsed.toString().replace(/\/$/, '');
}

function safeSettings(settings) {
  return {
    experimentalDice: Boolean(settings.experimentalDice), difficulty: settings.difficulty || 'normal', progressionSpeed: settings.progressionSpeed || 'normal',
    maxPlayers: settings.maxPlayers,
    minPlayers: settings.minPlayers,
    allowLateJoin: settings.allowLateJoin !== false,
    continueWithAbsentees: settings.continueWithAbsentees !== false,
    allowActionEdit: settings.allowActionEdit,
    allowPvp: settings.allowPvp,
    aiProvider: settings.aiProvider,
    aiFallbackProvider: settings.aiFallbackProvider || 'none',
    aiModel: settings.aiModel,
    aiBaseUrl: settings.aiBaseUrl || '',
    tone: settings.tone,
    worldRules: settings.worldRules || '',
    narrativeDepth: settings.narrativeDepth || 'cinematic',
    worldEventFrequency: settings.worldEventFrequency || 'normal',
    visualTheme: settings.visualTheme || 'forest',
    campaignIcon: settings.campaignIcon || '✦',
  };
}

function safeCampaign(campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    joinCode: campaign.joinCode,
    ownerId: campaign.ownerId,
    masterUserId: campaign.masterUserId || campaign.ownerId,
    coMasterUserIds: [...(campaign.coMasterUserIds || [])],
    awayUserIds: [...(campaign.awayUserIds || [])],
    lobbyReadyUserIds: [...(campaign.lobbyReadyUserIds || [])],
    state: campaign.state,
    settings: safeSettings(campaign.settings),
    memberCount: campaign.memberIds.length,
    currentTurnId: campaign.currentTurnId,
    isDemo: Boolean(campaign.isDemo),
    lastSavedAt: campaign.lastSavedAt || campaign.updatedAt || campaign.createdAt,
    createdAt: campaign.createdAt,
  };
}

function publicWorld(world, settings = {}) {
  const director=ensureWorldDirector(world);
  return {location:world.location,time:world.time,weather:world.weather,ecosystem:structuredClone(world.ecosystem),
    introduction:world.introduction?{phase:world.introduction.phase,completed:world.introduction.completed}:null,
    atlas:publicAtlas(world), quests:structuredClone(ensureQuestJournal(world)), eventForecast:publicEventForecast(world,settings),
    storyThreads:structuredClone(director.threads.filter(thread=>thread.status==='ACTIVE').slice(-6)),
    clocks:structuredClone((director.clocks||[]).filter(clock=>clock.visibility!=='PRIVATE').slice(-8)),
    recentEvents:structuredClone((world.events||[]).slice(-5)),
    tension:director.tension,
    entities:(world.entities||[]).filter(e=>!e.location||e.location===world.location).map(({id,name,description,hp,maxHp,status,threat})=>({id,name,description,hp,maxHp,status,threat})),
    bestiary: publicBestiary(world),
    knownNpcs:(world.npcs||[]).filter(n=>(world.knownNpcIds||[]).includes(n.id)||!n.location||n.location===world.location).map(({id,name,description,location,status,role})=>({id,name,description,location,status,role})),
    npcs:(world.npcs||[]).filter(n=>n.location===world.location||!n.location).map(({id,name,description,status,location,role})=>({id,name,description,status,location,role}))};
}

function defaultWorld(description) {
  return {
    location: 'Encruzilhada de Eidryss',
    time: 'Amanhecer',
    weather: 'Céu limpo',
    entities: [
      { id: newId(), name: 'Goblin Batedor', location:'Encruzilhada de Eidryss', type: 'ENEMY', description: 'Uma criatura cautelosa espreitando a estrada.', hp: 35, maxHp: 35, status: 'ALIVE', attributes: { speed: 9, resistance: 7 } },
    ],
    npcs: [
      {
        id: newId(), name: 'Eira, guarda da trilha', description: 'Uma vigia paciente que conhece os caminhos da floresta.',
        personality: 'Cautelosa, direta e leal a quem respeita o bosque.', location: 'Encruzilhada de Eidryss', inventory: [],
        abilities: ['Conhecimento das trilhas'], memory: ['Observa o grupo desde sua chegada.'], status: 'ALIVE', relationships: {},
      },
    ],
    events: [],
    discoveredLocations: ['Encruzilhada de Eidryss'],
    quests: [],
    flags: {},
    ecosystem: {
      biome: 'Floresta ancestral', dangerLevel: 2, ambience: 'Folhas sussurram ao redor da trilha.', cycleIndex: 0,
      resources: [
        { id: newId(), name: 'Ervas Luminosas', itemName: 'Ervas Luminosas', itemDescription: 'Folhas macias que brilham no escuro.', type: 'MATERIAL', quantity: 3, maxQuantity: 3, respawnTurns: 3, weight: 0.1, rarity: 'COMMON', value: 6 },
        { id: newId(), name: 'Pedra de Ferro', itemName: 'Fragmento de Ferro', itemDescription: 'Um fragmento mineral útil para forja.', type: 'MATERIAL', quantity: 2, maxQuantity: 2, respawnTurns: 4, weight: 0.7, rarity: 'COMMON', value: 8 },
        { id: newId(), name: 'Água Clara', itemName: 'Frasco de Água Clara', itemDescription: 'Água fresca recolhida de uma nascente próxima.', type: 'CONSUMABLE', quantity: 2, maxQuantity: 2, respawnTurns: 3, weight: 0.4, rarity: 'COMMON', value: 4 },
      ],
      factions: [{ id: 'guardioes-do-bosque', name: 'Guardiões do Bosque', reputation: 0 }],
    },
    metadata: { premise: cleanText(description, 1_000) },
  };
}

function makeTurn(campaign, state) {
  const away = new Set(campaign.awayUserIds || []);
  const livingUsers = campaign.memberIds.filter((userId) => {
    if (away.has(userId)) return false;
    const character = state.characters.find((item) => item.campaignId === campaign.id && item.userId === userId);
    return character?.status === 'ALIVE';
  });
  const priorNumbers = state.turns.filter((turn) => turn.campaignId === campaign.id).map((turn) => turn.number);
  return {
    id: newId(), campaignId: campaign.id, number: Math.max(0, ...priorNumbers) + 1,
    status: 'COLLECTING_ACTIONS', expectedPlayerIds: livingUsers, actionIds: [],
    narrative: '', summary: '', result: null, provider: null, aiError: null,
    createdAt: nowIso(), resolvedAt: null,
  };
}

function campaignMember(state, campaignId, userId) {
  const campaign = state.campaigns.find((item) => item.id === campaignId);
  assert(campaign, 'CAMPAIGN_NOT_FOUND', 'Campanha não encontrada.', 404);
  assert(campaign.memberIds.includes(userId), 'PLAYER_NOT_IN_CAMPAIGN', 'Você não participa desta campanha.', 403);
  return campaign;
}

function isSessionController(campaign, userId) {
  return campaign.ownerId === userId || (campaign.masterUserId || campaign.ownerId) === userId || (campaign.coMasterUserIds || []).includes(userId);
}

function votePresentation(campaign, userId) {
  const vote=campaign.activeVote;
  if(!vote||vote.status!=='OPEN')return null;
  const tally=Object.fromEntries((vote.options||[]).map(option=>[option.id,0]));
  for(const optionId of Object.values(vote.ballots||{}))if(Object.hasOwn(tally,optionId))tally[optionId]++;
  return {id:vote.id,prompt:vote.prompt,options:(vote.options||[]).map(option=>({...option,count:tally[option.id]||0})),myVote:vote.ballots?.[userId]||null,createdAt:vote.createdAt,createdBy:vote.createdBy};
}

function touchCampaign(campaign) {
  campaign.updatedAt = nowIso();
  campaign.lastSavedAt = campaign.updatedAt;
}

function demoBotAction(character, turnNumber, world) {
  if(world.introduction&&!world.introduction.completed)return 'Converso com Aurelia e aceito a travessia.';
  const enemy=(world.entities||[]).find(e=>e.status!=='DEAD'&&e.hp>0);
  const power=character.powers.find(p=>p.effects?.[0]?.type==='DAMAGE'&&(character.cooldowns?.[p.id]||0)<=1);
  return enemy ? (power?`Uso ${power.name} contra ${enemy.name}.`:`Ataco ${enemy.name}.`) : 'Observo o ambiente com cuidado.';
}

export class GameService {
  constructor({ store, narrative, config, vault, hub = null }) {
    this.store = store;
    this.narrative = narrative;
    this.config = config;
    this.vault = vault;
    this.hub = hub;
    this.processing = new Set();
  }

  setHub(hub) {
    this.hub = hub;
  }

  async register(input) {
    const username = normalizeUsername(input.username);
    const displayName = cleanText(input.displayName || input.username, 40);
    const password = String(input.password || '');
    assert(/^[a-z0-9_.-]{3,24}$/.test(username), 'INVALID_USERNAME', 'Use de 3 a 24 caracteres: letras, números, ponto, hífen ou sublinhado.');
    assert(displayName.length >= 2, 'INVALID_NAME', 'Informe um nome com pelo menos 2 caracteres.');
    assert(password.length >= 8 && password.length <= 128, 'INVALID_PASSWORD', 'A senha deve ter entre 8 e 128 caracteres.');
    const passwordHash = await hashPassword(password);
    const token = newToken();
    const created = await this.store.mutate((state) => {
      assert(!state.users.some((user) => user.username === username), 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', 409);
      const user = { id: newId(), username, displayName, passwordHash, presentation: userPresentation(input.presentation), preferences: interfacePreferences(input.preferences || {}), createdAt: nowIso() };
      state.users.push(user);
      state.sessions.push({ id: newId(), userId: user.id, digest: tokenDigest(token), expiresAt: new Date(Date.now() + this.config.sessionTtlMs).toISOString(), createdAt: nowIso() });
      return publicUser(user);
    });
    console.info(`[INFO] Jogador criado: ${created.id}`);
    return { user: created, token };
  }

  async login(input) {
    const username = normalizeUsername(input.username);
    const password = String(input.password || '');
    const found = this.store.read((state) => state.users.find((user) => user.username === username));
    assert(found && await verifyPassword(password, found.passwordHash), 'INVALID_CREDENTIALS', 'Usuário ou senha incorretos.', 401);
    const token = newToken();
    await this.store.mutate((state) => {
      state.sessions = state.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now());
      state.sessions.push({ id: newId(), userId: found.id, digest: tokenDigest(token), expiresAt: new Date(Date.now() + this.config.sessionTtlMs).toISOString(), createdAt: nowIso() });
    });
    return { user: publicUser(found), token };
  }

  sessionUser(token) {
    if (!token) return null;
    return this.store.read((state) => {
      const session = state.sessions.find((item) => item.digest === tokenDigest(token) && new Date(item.expiresAt).getTime() > Date.now());
      const user = session && state.users.find((item) => item.id === session.userId);
      return user ? publicUser(user) : null;
    });
  }

  async logout(token) {
    if (!token) return;
    await this.store.mutate((state) => { state.sessions = state.sessions.filter((item) => item.digest !== tokenDigest(token)); });
  }

  profile(userId) {
    return this.store.read((state) => {
      const user = state.users.find((item) => item.id === userId);
      assert(user, 'NOT_AUTHORIZED', 'Sessão inválida.', 401);
      return {
        user: publicUser(user),
        preferences: interfacePreferences(user.preferences || {}),
        aiCredentials: {
          gemini: { configured: Boolean(user.aiCredentials?.gemini?.encryptedKey || this.config.geminiApiKey), model: user.aiCredentials?.gemini?.model || this.config.geminiModel, source: user.aiCredentials?.gemini?.encryptedKey ? 'profile' : this.config.geminiApiKey ? 'environment' : null },
          openai: { configured: Boolean(user.aiCredentials?.openai?.encryptedKey || this.config.openAiApiKey), model: user.aiCredentials?.openai?.model || this.config.openAiModel, source: user.aiCredentials?.openai?.encryptedKey ? 'profile' : this.config.openAiApiKey ? 'environment' : null },
          grok: { configured: Boolean(user.aiCredentials?.grok?.encryptedKey || this.config.grokApiKey), model: user.aiCredentials?.grok?.model || this.config.grokModel, source: user.aiCredentials?.grok?.encryptedKey ? 'profile' : this.config.grokApiKey ? 'environment' : null },
          groq: { configured: Boolean(user.aiCredentials?.groq?.encryptedKey || this.config.groqApiKey), model: user.aiCredentials?.groq?.model || this.config.groqModel, source: user.aiCredentials?.groq?.encryptedKey ? 'profile' : this.config.groqApiKey ? 'environment' : null },
          openrouter: { configured: Boolean(user.aiCredentials?.openrouter?.encryptedKey || this.config.openRouterApiKey), model: user.aiCredentials?.openrouter?.model || this.config.openRouterModel, source: user.aiCredentials?.openrouter?.encryptedKey ? 'profile' : this.config.openRouterApiKey ? 'environment' : null },
          custom: {
            configured: Boolean(
              (user.aiCredentials?.custom?.encryptedKey && user.aiCredentials.custom.model && user.aiCredentials.custom.baseUrl)
              || (this.config.customApiKey && this.config.customModel && this.config.customBaseUrl)
            ),
            model: user.aiCredentials?.custom?.model || this.config.customModel,
            baseUrl: user.aiCredentials?.custom?.baseUrl || this.config.customBaseUrl,
            source: user.aiCredentials?.custom?.encryptedKey ? 'profile' : this.config.customApiKey ? 'environment' : null,
          },
        },
        security: {
          activeSessions: state.sessions.filter((session) => session.userId === userId && new Date(session.expiresAt).getTime() > Date.now()).length,
          passwordUpdatedAt: user.passwordUpdatedAt || user.createdAt,
        },
      };
    });
  }

  async changePassword(userId, currentToken, input) {
    const currentPassword = String(input.currentPassword || '');
    const newPassword = String(input.newPassword || '');
    assert(newPassword.length >= 10 && newPassword.length <= 128, 'INVALID_PASSWORD', 'A nova senha deve ter entre 10 e 128 caracteres.');
    assert(currentPassword !== newPassword, 'INVALID_PASSWORD', 'Escolha uma senha diferente da atual.');
    const user = this.store.read((state) => state.users.find((item) => item.id === userId));
    assert(user && await verifyPassword(currentPassword, user.passwordHash), 'INVALID_CREDENTIALS', 'A senha atual está incorreta.', 401);
    const passwordHash = await hashPassword(newPassword);
    const keepDigest = tokenDigest(currentToken || '');
    await this.store.mutate((state) => {
      const target = state.users.find((item) => item.id === userId);
      assert(target, 'NOT_AUTHORIZED', 'Sessão inválida.', 401);
      target.passwordHash = passwordHash;
      target.passwordUpdatedAt = nowIso();
      state.sessions = state.sessions.filter((session) => session.userId !== userId || session.digest === keepDigest);
    });
    return { ok: true };
  }

  async revokeOtherSessions(userId, currentToken) {
    const keepDigest = tokenDigest(currentToken || '');
    const count = await this.store.mutate((state) => {
      const before = state.sessions.length;
      state.sessions = state.sessions.filter((session) => session.userId !== userId || session.digest === keepDigest);
      return before - state.sessions.length;
    });
    return { ok: true, revoked: count };
  }

  async updateProfile(userId, input) {
    const displayName = cleanText(input.displayName, 40);
    assert(displayName.length >= 2, 'INVALID_NAME', 'Informe um nome com pelo menos 2 caracteres.');
    const presentation = userPresentation(input.presentation || {});
    const updated = await this.store.mutate((state) => {
      const user = state.users.find((item) => item.id === userId);
      assert(user, 'NOT_AUTHORIZED', 'Sessão inválida.', 401);
      user.displayName = displayName;
      user.presentation = presentation;
      user.updatedAt = nowIso();
      return publicUser(user);
    });
    return { user: updated };
  }


  async updatePreferences(userId, input) {
    const preferences = interfacePreferences(input || {});
    await this.store.mutate((state) => {
      const user = state.users.find((item) => item.id === userId);
      assert(user, 'NOT_AUTHORIZED', 'Sessão inválida.', 401);
      user.preferences = preferences;
      user.updatedAt = nowIso();
    });
    return { preferences };
  }

  async saveAiCredential(userId, input) {
    const provider = cleanText(input.provider, 30).toLowerCase();
    assert(PROVIDERS.has(provider), 'INVALID_PROVIDER', 'Escolha um provedor de IA disponível.');
    const remove = Boolean(input.remove);
    const apiKey = String(input.apiKey || '').trim();
    if (!remove) assert(apiKey.length >= 10 && apiKey.length <= 1_000, 'INVALID_API_KEY', 'A chave parece inválida. Confira e tente novamente.');
    const model = cleanText(input.model, 120);
    if (provider === 'custom' && !remove) assert(model, 'INVALID_AI_MODEL', 'Informe o nome do modelo da API compatível.');
    const encryptedKey = remove ? null : this.vault.encrypt(apiKey);
    const baseUrl = provider === 'custom' && !remove ? normalizeAiBaseUrl(input.baseUrl, { required: true }) : '';
    await this.store.mutate((state) => {
      const user = state.users.find((item) => item.id === userId);
      assert(user, 'NOT_AUTHORIZED', 'Sessão inválida.', 401);
      user.aiCredentials ||= {};
      if (remove) delete user.aiCredentials[provider];
      else user.aiCredentials[provider] = { encryptedKey, model, baseUrl, updatedAt: nowIso() };
    });
    return this.profile(userId);
  }

  listCampaigns(userId) {
    return this.store.read((state) => state.campaigns.filter((campaign) => campaign.memberIds.includes(userId)).map(safeCampaign));
  }

  async createCampaign(userId, input) {
    const name = cleanText(input.name, 80);
    const description = cleanText(input.description, 2_000);
    assert(name.length >= 3, 'INVALID_CAMPAIGN', 'O nome precisa ter pelo menos 3 caracteres.');
    const maxPlayers = clamp(Math.trunc(input.maxPlayers || 4), 2, 4);
    const minPlayers = clamp(Math.trunc(input.minPlayers || Math.min(2, maxPlayers)), 1, maxPlayers);
    const provider = PROVIDERS.has(input.aiProvider) ? input.aiProvider : 'gemini';
    const selectedTheme = visualTheme(input.visualTheme || 'forest');
    const selectedIcon = campaignIcon(input.campaignIcon || '✦');
    const savedCustom = provider === 'custom' ? this.store.read((state) => state.users.find((user) => user.id === userId)?.aiCredentials?.custom || null) : null;
    const aiBaseUrl = provider === 'custom' ? normalizeAiBaseUrl(input.aiBaseUrl || savedCustom?.baseUrl || this.config.customBaseUrl, { required: true }) : '';
    const aiModel = cleanText(input.aiModel, 120);
    if (provider === 'custom') assert(aiModel || savedCustom?.model || this.config.customModel, 'INVALID_AI_MODEL', 'Informe o nome do modelo da API compatível.');
    const apiKey = String(input.aiApiKey || '').trim();
    if (apiKey) assert(apiKey.length >= 10 && apiKey.length <= 1_000, 'INVALID_API_KEY', 'A chave de IA parece inválida.');
    const encryptedKey = apiKey ? this.vault.encrypt(apiKey) : null;
    const campaign = await this.store.mutate((state) => {
      const user = state.users.find((item) => item.id === userId);
      assert(user, 'NOT_AUTHORIZED', 'Sessão inválida.', 401);
      user.aiCredentials ||= {};
      if (encryptedKey) user.aiCredentials[provider] = { encryptedKey, model: aiModel, baseUrl: aiBaseUrl, updatedAt: nowIso() };
      let code;
      do code = joinCode(); while (state.campaigns.some((item) => item.joinCode === code));
      const item = {
        id: newId(), name, description, joinCode: code, ownerId: userId, masterUserId: userId, coMasterUserIds: [], awayUserIds: [], lobbyReadyUserIds: [], activeVote:null, voteHistory:[], memberIds: [userId], state: 'LOBBY',
        currentTurnId: null, summary: description, isDemo: false,
        settings: {
          maxPlayers, minPlayers, allowLateJoin: input.allowLateJoin !== false, continueWithAbsentees: input.continueWithAbsentees !== false, experimentalDice: Boolean(input.experimentalDice), difficulty: ['normal','hard'].includes(input.difficulty)?input.difficulty:'normal', progressionSpeed: input.progressionSpeed==='fast'?'fast':'normal',
          allowActionEdit: input.allowActionEdit !== false,
          allowPvp: Boolean(input.allowPvp),
          aiProvider: provider,
          aiFallbackProvider: PROVIDERS.has(input.aiFallbackProvider) && input.aiFallbackProvider !== provider ? input.aiFallbackProvider : 'none',
          aiModel,
          aiBaseUrl,
          tone: cleanText(input.tone || 'Aventura heroica e cinematográfica', 200),
          narrativeDepth: ['balanced','cinematic','epic'].includes(input.narrativeDepth) ? input.narrativeDepth : 'cinematic',
          worldEventFrequency: ['low','normal','high','chaotic'].includes(input.worldEventFrequency) ? input.worldEventFrequency : 'normal',
          worldRules: cleanText(input.worldRules, 3_000),
          visualTheme: selectedTheme,
          campaignIcon: selectedIcon,
        },
        world: defaultWorld(description), memory: createCampaignMemory(description, input.worldRules), createdAt: nowIso(), updatedAt: nowIso(), lastSavedAt: nowIso(),
      };
      initializeIsekai(item.world, ['origin','divine','arrival'].includes(input.introMode)?input.introMode:'divine');
      state.campaigns.push(item);
      state.characters.push(createDefaultCharacter(userId, item.id, user.displayName));
      return safeCampaign(item);
    });
    console.info(`[INFO] Campanha criada: ${campaign.id} (${campaign.joinCode})`);
    return campaign;
  }

  async createDemoCampaign(userId) {
    const demoProvider = this.#firstConfiguredProvider(userId);
    assert(demoProvider, 'AI_CONFIGURATION_REQUIRED', 'Para iniciar o tutorial, salve uma chave de IA no seu perfil ou na criação da sala.');
    const result = await this.store.mutate((state) => {
      const user = state.users.find((item) => item.id === userId);
      assert(user, 'NOT_AUTHORIZED', 'Sessão inválida.', 401);
      const existing = state.campaigns.find((item) => item.ownerId === userId && item.isDemo && item.state !== 'FINISHED');
      if (existing) return { campaign: safeCampaign(existing), reused: true };

      let code;
      do code = joinCode(); while (state.campaigns.some((item) => item.joinCode === code));
      const campaign = {
        id: newId(), name: 'Tutorial: A Ponte Esquecida',
        description: 'Uma aventura curta para aprender turnos, recursos, itens, poderes, memória e ações simultâneas.',
        joinCode: code, ownerId: userId, masterUserId: userId, coMasterUserIds: [], awayUserIds: [], lobbyReadyUserIds: [], activeVote:null, voteHistory:[], memberIds: [userId], state: 'ACTIVE', currentTurnId: null, summary: 'O grupo chegou a uma ponte antiga bloqueada por um goblin batedor.',
        isDemo: true,
        settings: {
          maxPlayers: 4, minPlayers: 4, allowActionEdit: false, allowPvp: false, aiProvider: demoProvider, aiFallbackProvider: 'none', aiModel: '',
          aiBaseUrl: '',
          tone: 'Tutorial claro, aventura leve e cinematográfica',
          narrativeDepth: 'balanced', worldEventFrequency: 'low',
          worldRules: 'Este é um tutorial seguro. Explique consequências com clareza e mantenha os três companheiros controlados pelo servidor.',
          visualTheme: 'forest', campaignIcon: '🧭',
        },
        world: defaultWorld('Uma ponte antiga bloqueia o caminho para a floresta.'),
        memory: createCampaignMemory('O grupo chegou a uma ponte antiga bloqueada por um goblin batedor.', 'Tutorial seguro e didático.'),
        createdAt: nowIso(), updatedAt: nowIso(), lastSavedAt: nowIso(),
      };
      const human = createDefaultCharacter(userId, campaign.id, user.displayName);
      human.identity.title = 'Viajante de Eidryss';
      human.presentation = { avatar: '🧭', accent: '#71baff', aura: 'oceano' };
      state.characters.push(human);

      const bots = [
        { displayName: 'Asha', className: 'Guardiã', title: 'Escudo do Grupo', power: ['Muralha Viva', 'Protege aliados e reduz o impacto de ataques próximos.'] },
        { displayName: 'Kael', className: 'Espadachim', title: 'Lâmina Veloz', power: ['Corte Relâmpago', 'Golpe físico veloz que consome stamina.'] },
        { displayName: 'Nox', className: 'Arcanista', title: 'Olho das Chamas', power: ['Fagulha Arcana', 'Magia de fogo controlada que consome mana.'] },
      ];
      for (const [index, bot] of bots.entries()) {
        const botUser = { id: newId(), username: `demo_${campaign.id.slice(0, 8)}_${index}`, displayName: bot.displayName, passwordHash: 'BOT_DISABLED', aiCredentials: {}, isBot: true, createdAt: nowIso() };
        state.users.push(botUser);
        campaign.memberIds.push(botUser.id);
        const character = createDefaultCharacter(botUser.id, campaign.id, bot.displayName);
        chooseClass(character,['knight','swordsman','mage'][index]);
        character.identity.title = bot.title;
        character.presentation = [
          { avatar: '🛡️', accent: '#f6c86b', aura: 'brasa' },
          { avatar: '⚔️', accent: '#ff7182', aura: 'brasa' },
          { avatar: '🔮', accent: '#a98cff', aura: 'cosmico' },
        ][index];
        state.characters.push(character);
      }
      state.campaigns.push(campaign);
      const turn = makeTurn(campaign, state);
      state.turns.push(turn);
      campaign.currentTurnId = turn.id;
      return { campaign: safeCampaign(campaign), reused: false };
    });
    this.#broadcast(result.campaign.id, 'TURN_STARTED', { turn: 1, demo: true });
    return result;
  }

  async joinCampaign(userId, codeInput) {
    const code = cleanText(codeInput, 30).toUpperCase();
    const joined = await this.store.mutate((state) => {
      const campaign = state.campaigns.find((item) => item.joinCode === code);
      assert(campaign, 'CAMPAIGN_NOT_FOUND', 'Nenhuma campanha usa esse código.', 404);
      if (campaign.memberIds.includes(userId)) return safeCampaign(campaign);
      const mayJoinRunning = campaign.settings.allowLateJoin !== false && ['ACTIVE','PAUSED'].includes(campaign.state);
      assert(campaign.state === 'LOBBY' || mayJoinRunning, 'CAMPAIGN_ALREADY_STARTED', 'Esta campanha não aceita entrada durante a sessão.', 409);
      assert(campaign.memberIds.length < campaign.settings.maxPlayers, 'CAMPAIGN_FULL', 'A campanha está cheia.', 409);
      const user = state.users.find((item) => item.id === userId);
      assert(user, 'NOT_AUTHORIZED', 'Sessão inválida.', 401);
      campaign.memberIds.push(userId);
      touchCampaign(campaign);
      const joinedCharacter=createDefaultCharacter(userId, campaign.id, user.displayName);
      joinedCharacter.joinedTurn=state.turns.find(t=>t.id===campaign.currentTurnId)?.number||1;
      state.characters.push(joinedCharacter);
      state.events.push({id:newId(),campaignId:campaign.id,turnId:campaign.currentTurnId||null,turnNumber:state.turns.find(t=>t.id===campaign.currentTurnId)?.number||null,type:'PLAYER_JOINED_LATE',sourceId:userId,targetId:null,data:{duringSession:campaign.state!=='LOBBY'},timestamp:nowIso()});
      return safeCampaign(campaign);
    });
    this.#broadcast(joined.id, 'PLAYER_JOINED', { memberCount: joined.memberCount });
    return joined;
  }

  async updateSettings(campaignId, userId, input) {
    const apiKey = String(input.aiApiKey || '').trim();
    const requestedProvider = cleanText(input.aiProvider, 30).toLowerCase();
    if (apiKey) assert(PROVIDERS.has(requestedProvider) && apiKey.length >= 10 && apiKey.length <= 1_000, 'INVALID_API_KEY', 'A chave de IA parece inválida.');
    const savedCustom = requestedProvider === 'custom' ? this.store.read((state) => ({
      credential: state.users.find((user) => user.id === userId)?.aiCredentials?.custom || null,
      campaignBaseUrl: state.campaigns.find((item) => item.id === campaignId)?.settings?.aiBaseUrl || '',
      campaignModel: state.campaigns.find((item) => item.id === campaignId)?.settings?.aiModel || '',
    })) : null;
    const aiBaseUrl = requestedProvider === 'custom' ? normalizeAiBaseUrl(input.aiBaseUrl || savedCustom?.campaignBaseUrl || savedCustom?.credential?.baseUrl || this.config.customBaseUrl, { required: true }) : '';
    if (requestedProvider === 'custom') assert(cleanText(input.aiModel, 120) || savedCustom?.campaignModel || savedCustom?.credential?.model || this.config.customModel, 'INVALID_AI_MODEL', 'Informe o nome do modelo da API compatível.');
    const encryptedKey = apiKey ? this.vault.encrypt(apiKey) : null;
    const campaign = await this.store.mutate((state) => {
      const item = campaignMember(state, campaignId, userId);
      assert(item.ownerId === userId, 'NOT_AUTHORIZED', 'Somente o organizador pode alterar a campanha.', 403);
      const currentTurn = state.turns.find((turn) => turn.id === item.currentTurnId);
      assert(currentTurn?.status!=='PROCESSING','TURN_BUSY','Aguarde o processamento.',409);
      if(currentTurn?.staged||currentTurn?.actionIds.length){for(const key of ['allowPvp','experimentalDice','difficulty','progressionSpeed','worldEventFrequency','worldRules','tone'])assert(input[key]===undefined||input[key]===item.settings[key],'TURN_SEALED','As regras deste turno estão seladas. Troque apenas a API.',409);}
      assert(item.state === 'LOBBY' || item.state === 'PAUSED' || currentTurn?.status === 'WAITING_FOR_AI', 'CAMPAIGN_ACTIVE', 'Pause a campanha para alterar estas configurações.', 409);
      if (input.aiProvider !== undefined) {
        assert(PROVIDERS.has(input.aiProvider), 'INVALID_PROVIDER', 'Provedor de IA inválido.');
        item.settings.aiProvider = input.aiProvider;
      }
      if (input.aiFallbackProvider !== undefined) {
        const fallback = cleanText(input.aiFallbackProvider, 30).toLowerCase();
        assert(fallback === 'none' || PROVIDERS.has(fallback), 'INVALID_PROVIDER', 'Provedor reserva inválido.');
        item.settings.aiFallbackProvider = fallback === item.settings.aiProvider ? 'none' : fallback;
      } else if (item.settings.aiFallbackProvider === item.settings.aiProvider) item.settings.aiFallbackProvider = 'none';
      if (encryptedKey) {
        const owner = state.users.find((user) => user.id === userId);
        owner.aiCredentials ||= {};
        owner.aiCredentials[requestedProvider] = { encryptedKey, model: cleanText(input.aiModel, 120), baseUrl: aiBaseUrl, updatedAt: nowIso() };
      }
      if (input.aiModel !== undefined) item.settings.aiModel = cleanText(input.aiModel, 120);
      if (input.aiProvider !== undefined) item.settings.aiBaseUrl = requestedProvider === 'custom' ? aiBaseUrl : '';
      if (input.tone !== undefined) item.settings.tone = cleanText(input.tone, 200);
      if (input.narrativeDepth !== undefined) { assert(['balanced','cinematic','epic'].includes(input.narrativeDepth), 'INVALID_SETTING', 'Profundidade narrativa inválida.'); item.settings.narrativeDepth=input.narrativeDepth; }
      if (input.worldEventFrequency !== undefined) { assert(['low','normal','high','chaotic'].includes(input.worldEventFrequency), 'INVALID_SETTING', 'Frequência de eventos inválida.'); item.settings.worldEventFrequency=input.worldEventFrequency; }
      if (input.worldRules !== undefined) {
        item.settings.worldRules = cleanText(input.worldRules, 3_000);
        const memory = ensureCampaignMemory(item);
        memory.canon = [item.description, item.settings.worldRules].filter(Boolean);
      }
      if (input.visualTheme !== undefined) item.settings.visualTheme = visualTheme(input.visualTheme);
      if (input.campaignIcon !== undefined) item.settings.campaignIcon = campaignIcon(input.campaignIcon);
      if (input.allowActionEdit !== undefined) item.settings.allowActionEdit = Boolean(input.allowActionEdit);
      if (input.allowPvp !== undefined) item.settings.allowPvp = Boolean(input.allowPvp);
      if(input.experimentalDice!==undefined)item.settings.experimentalDice=Boolean(input.experimentalDice);
      if(input.difficulty!==undefined){assert(['normal','hard'].includes(input.difficulty),'INVALID_SETTING','Dificuldade inválida.');item.settings.difficulty=input.difficulty;}
      if(input.progressionSpeed!==undefined){assert(['normal','fast'].includes(input.progressionSpeed),'INVALID_SETTING','Progressão inválida.');item.settings.progressionSpeed=input.progressionSpeed;}
      if(input.minPlayers!==undefined){const min=clamp(Math.trunc(Number(input.minPlayers)),1,item.settings.maxPlayers);item.settings.minPlayers=min;}
      if(input.allowLateJoin!==undefined)item.settings.allowLateJoin=Boolean(input.allowLateJoin);
      if(input.continueWithAbsentees!==undefined)item.settings.continueWithAbsentees=Boolean(input.continueWithAbsentees);
      state.events.push({id:newId(),campaignId,type:'HOST_SETTINGS',sourceId:userId,timestamp:nowIso(),data:{description:'Configurações alteradas pelo Host.',allowPvp:item.settings.allowPvp,experimentalDice:item.settings.experimentalDice}});
      touchCampaign(item);
      return safeCampaign(item);
    });
    this.#broadcast(campaignId, 'CAMPAIGN_UPDATED', campaign);
    return campaign;
  }

  async updateMyCharacter(campaignId, userId, input) {
    const updated = await this.store.mutate((state) => {
      const campaign = campaignMember(state, campaignId, userId);
      const hasParticipated = state.actions.some(action=>action.campaignId===campaignId&&action.userId===userId&&!action.absence);
      assert(campaign.state === 'LOBBY' || campaign.state === 'PAUSED' || !hasParticipated, 'CHARACTER_LOCKED', 'Depois de participar de um turno, pause a campanha para editar a ficha.', 409);
      const character = state.characters.find((item) => item.campaignId === campaignId && item.userId === userId);
      assert(character, 'CHARACTER_NOT_FOUND', 'Personagem não encontrado.', 404);
      const turn=state.turns.find(t=>t.id===campaign.currentTurnId);
      assert(!turn||turn.status==='RESOLVED'||(turn.status==='COLLECTING_ACTIONS'&&turn.actionIds.length===0),'TURN_SEALED','O turno já contém ações; a ficha está selada.',409);
      assert(!input.powers&&!input.attributes&&!input.resources,'CONTROLLED_CHARACTER','Poderes e atributos são controlados por classe e progressão.');
      if(input.classId && input.classId!==character.classId){assert(!character.classChosen&&character.level===1,'CLASS_LOCKED','A classe já foi escolhida.');if(character.powers?.length)character.legacyPowers=structuredClone(character.powers);chooseClass(character,input.classId);}
      else if(input.classId)character.classChosen=true;
      const identity = input.identity || {};
      for (const [field, max] of Object.entries({ name: 40, race: 40, description: 1_000, appearance: 1_000, origin: 500, gender: 80, hair: 80, eyes: 80, height:80 })) {
        if (identity[field] !== undefined) character.identity[field] = cleanText(identity[field], max);
      }
      if (identity.age !== undefined) character.identity.age = clamp(Math.trunc(identity.age), 0, 10_000);
      if (input.presentation && typeof input.presentation === 'object') {
        character.presentation = characterPresentation({ ...(character.presentation || {}), ...input.presentation });
      }
      character.updatedAt = nowIso();
      touchCampaign(campaign);
      return character;
    });
    this.#broadcast(campaignId, 'CHARACTER_UPDATED', { characterId: updated.id });
    return updated;
  }

  async startCampaign(campaignId, userId) {
    const result = await this.store.mutate((state) => {
      const campaign = campaignMember(state, campaignId, userId);
      assert(isSessionController(campaign,userId), 'NOT_AUTHORIZED', 'Somente a equipe de mestragem pode iniciar.', 403);
      assert(campaign.state === 'LOBBY', 'CAMPAIGN_ALREADY_STARTED', 'A campanha não está no lobby.', 409);
      assert(campaign.memberIds.length >= campaign.settings.minPlayers, 'NOT_ENOUGH_PLAYERS', `São necessários ${campaign.settings.minPlayers} jogadores.`, 409);
      for(const c of state.characters.filter(c=>c.campaignId===campaignId)){if(!c.classId)chooseClass(c,'warrior');}
      campaign.state = 'ACTIVE';
      const turn = makeTurn(campaign, state);
      state.turns.push(turn);
      campaign.currentTurnId = turn.id;
      touchCampaign(campaign);
      return { campaign: safeCampaign(campaign), turn };
    });
    console.info(`[INFO] Turno ${result.turn.number} iniciado`);
    this.#broadcast(campaignId, 'TURN_STARTED', { turn: result.turn.number });
    return result;
  }

  async pauseCampaign(campaignId, userId, paused) {
    const result = await this.store.mutate((state) => {
      const item = campaignMember(state, campaignId, userId);
      assert(isSessionController(item,userId), 'NOT_AUTHORIZED', 'Somente a equipe de mestragem pode pausar.', 403);
      assert(['ACTIVE', 'PAUSED'].includes(item.state), 'INVALID_CAMPAIGN_STATE', 'A campanha ainda não começou.', 409);
      item.state = paused ? 'PAUSED' : 'ACTIVE';
      let nextTurn = null;
      const current = state.turns.find((turn) => turn.id === item.currentTurnId);
      if (!paused && (!current || current.status === 'RESOLVED')) {
        const living = state.characters.filter((character) => character.campaignId === campaignId && character.status === 'ALIVE');
        if (living.length) {
          nextTurn = makeTurn(item, state);
          state.turns.push(nextTurn);
          item.currentTurnId = nextTurn.id;
        } else {
          item.state = 'FINISHED';
          item.currentTurnId = null;
        }
      }
      touchCampaign(item);
      return { campaign: safeCampaign(item), nextTurn };
    });
    this.#broadcast(campaignId, paused ? 'CAMPAIGN_PAUSED' : 'CAMPAIGN_RESUMED', {});
    if (result.nextTurn) this.#broadcast(campaignId, 'TURN_STARTED', { turn: result.nextTurn.number });
    return result.campaign;
  }

  async submitAction(campaignId, userId, textInput, { replace = false } = {}) {
    const text = cleanText(textInput, this.config.maxActionLength);
    assert(text.length >= 3, 'INVALID_ACTION', 'Descreva sua ação com pelo menos 3 caracteres.');
    const submission = await this.store.mutate((state) => {
      const campaign = campaignMember(state, campaignId, userId);
      assert(campaign.state === 'ACTIVE', 'CAMPAIGN_NOT_ACTIVE', 'A campanha não está ativa.', 409);
      const turn = state.turns.find((item) => item.id === campaign.currentTurnId);
      assert(turn, 'TURN_NOT_FOUND', 'Turno atual não encontrado.', 404);
      assert(turn.status === 'COLLECTING_ACTIONS', 'TURN_ALREADY_CLOSED', 'Este turno já foi fechado.', 409);
      assert(turn.expectedPlayerIds.includes(userId), 'CHARACTER_DEAD', 'Seu personagem não pode agir neste turno.', 409);
      const character = state.characters.find((item) => item.campaignId === campaignId && item.userId === userId);
      assert(character?.classId, 'CLASS_REQUIRED', 'Escolha sua classe na aba Status antes de agir.', 409);
      let action = state.actions.find((item) => item.turnId === turn.id && item.userId === userId);
      if (action) {
        assert(replace && campaign.settings.allowActionEdit, 'ACTION_ALREADY_SUBMITTED', 'Você já enviou sua ação neste turno.', 409);
        action.text = text;
        action.updatedAt = nowIso();
      } else {
        action = { id: newId(), campaignId, turnId: turn.id, userId, characterId: character.id, text, status: 'SUBMITTED', result: null, submittedAt: nowIso(), updatedAt: nowIso() };
        state.actions.push(action);
        turn.actionIds.push(action.id);
      }
      if (campaign.isDemo) {
        for (const memberId of turn.expectedPlayerIds) {
          const member = state.users.find((item) => item.id === memberId);
          if (!member?.isBot || state.actions.some((item) => item.turnId === turn.id && item.userId === memberId)) continue;
          const botCharacter = state.characters.find((item) => item.campaignId === campaignId && item.userId === memberId);
          const botAction = {
            id: newId(), campaignId, turnId: turn.id, userId: memberId, characterId: botCharacter.id,
            text: demoBotAction(botCharacter, turn.number, campaign.world), status: 'SUBMITTED', result: null,
            submittedAt: nowIso(), updatedAt: nowIso(), automatic: true,
          };
          state.actions.push(botAction);
          turn.actionIds.push(botAction.id);
        }
      }
      const hasAction=(id)=>state.actions.some((item)=>item.turnId===turn.id&&item.userId===id);
      const participating = turn.expectedPlayerIds.filter((id)=>state.users.find(u=>u.id===id)?.isBot || this.hub?.isOnline?.(campaignId,id) || hasAction(id));
      const minimum = Math.min(turn.expectedPlayerIds.length, Math.max(1, Number(campaign.settings.minPlayers || 1)));
      const canSkipAbsent = campaign.settings.continueWithAbsentees !== false && participating.length >= minimum;
      const allPresentReady = participating.length >= minimum && participating.every(hasAction);
      const shouldResolve = canSkipAbsent && allPresentReady;
      if (shouldResolve) {
        for (const memberId of turn.expectedPlayerIds) {
          if (hasAction(memberId)) continue;
          const absentCharacter=state.characters.find((item)=>item.campaignId===campaignId&&item.userId===memberId);
          if(!absentCharacter)continue;
          const absentAction={id:newId(),campaignId,turnId:turn.id,userId:memberId,characterId:absentCharacter.id,text:'Mantenho uma postura defensiva e acompanho o grupo enquanto estou ausente.',status:'SUBMITTED',result:null,submittedAt:nowIso(),updatedAt:nowIso(),automatic:true,absence:true};
          state.actions.push(absentAction);turn.actionIds.push(absentAction.id);
        }
        turn.status = 'PROCESSING';
      }
      const ready = turn.expectedPlayerIds.filter(hasAction).length;
      const total = turn.expectedPlayerIds.length;
      touchCampaign(campaign);
      return { action: { id: action.id, status: action.status, updatedAt: action.updatedAt }, ready, total, active:participating.length, minimum, turnId: turn.id, shouldResolve };
    });
    console.info(`[INFO] Jogador enviou ação (${submission.ready}/${submission.total})`);
    this.#broadcast(campaignId, 'ACTION_PROGRESS', { ready: submission.ready, total: submission.total });
    if (submission.shouldResolve) {
      console.info('[INFO] Todos prontos; processando turno');
      await this.resolveTurn(campaignId, submission.turnId);
      const resolved=this.store.read(state=>state.turns.find(t=>t.id===submission.turnId)?.status==='RESOLVED');
      return { ...submission, resolved };
    }
    return { ...submission, resolved: false };
  }


  async handlePresenceChange(campaignId, userId, online) {
    if (online) return { resolved:false };
    const turnId = await this.store.mutate((state) => {
      const campaign = state.campaigns.find((item)=>item.id===campaignId);
      if (!campaign || campaign.state!=='ACTIVE' || campaign.settings.continueWithAbsentees===false) return null;
      const turn=state.turns.find((item)=>item.id===campaign.currentTurnId);
      if(!turn || turn.status!=='COLLECTING_ACTIONS') return null;
      const hasAction=(id)=>state.actions.some((item)=>item.turnId===turn.id&&item.userId===id);
      const participating=turn.expectedPlayerIds.filter((id)=>state.users.find(u=>u.id===id)?.isBot || this.hub?.isOnline?.(campaignId,id) || hasAction(id));
      const minimum=Math.min(turn.expectedPlayerIds.length,Math.max(1,Number(campaign.settings.minPlayers||1)));
      if(participating.length<minimum || !participating.every(hasAction)) return null;
      for(const memberId of turn.expectedPlayerIds){
        if(hasAction(memberId))continue;
        const character=state.characters.find((item)=>item.campaignId===campaignId&&item.userId===memberId);
        if(!character)continue;
        const action={id:newId(),campaignId,turnId:turn.id,userId:memberId,characterId:character.id,text:'Mantenho uma postura defensiva e acompanho o grupo enquanto estou ausente.',status:'SUBMITTED',result:null,submittedAt:nowIso(),updatedAt:nowIso(),automatic:true,absence:true};
        state.actions.push(action);turn.actionIds.push(action.id);
      }
      turn.status='PROCESSING';touchCampaign(campaign);return turn.id;
    });
    if(!turnId)return {resolved:false};
    this.#broadcast(campaignId,'ACTION_PROGRESS',{automaticAbsence:true});
    const result=await this.resolveTurn(campaignId,turnId);
    return {resolved:!result?.awaitingAi,awaitingAi:Boolean(result?.awaitingAi)};
  }

  async forceResolve(campaignId, userId) {
    const data = await this.store.mutate((state) => {
      const campaign = campaignMember(state, campaignId, userId);
      assert(isSessionController(campaign,userId), 'NOT_AUTHORIZED', 'Somente a equipe de mestragem pode fechar o turno.', 403);
      assert(campaign.state === 'ACTIVE', 'CAMPAIGN_NOT_ACTIVE', 'A campanha não está ativa.', 409);
      const turn = state.turns.find((item) => item.id === campaign.currentTurnId);
      assert(turn?.status === 'COLLECTING_ACTIONS', 'TURN_ALREADY_CLOSED', 'O turno já foi fechado.', 409);
      for (const memberId of turn.expectedPlayerIds) {
        if (state.actions.some((item) => item.turnId === turn.id && item.userId === memberId)) continue;
        const character = state.characters.find((item) => item.campaignId === campaignId && item.userId === memberId);
        const action = { id: newId(), campaignId, turnId: turn.id, userId: memberId, characterId: character.id, text: 'Aguardo com cautela e observo o que acontece.', status: 'SUBMITTED', result: null, submittedAt: nowIso(), updatedAt: nowIso(), automatic: true };
        state.actions.push(action);
        turn.actionIds.push(action.id);
      }
      turn.status = 'PROCESSING';
      touchCampaign(campaign);
      return { turnId: turn.id };
    });
    const result=await this.resolveTurn(campaignId, data.turnId);
    return {resolved:!result?.awaitingAi,awaitingAi:Boolean(result?.awaitingAi)};
  }

  async resolveTurn(campaignId,turnId){
    if(this.processing.has(turnId))return {processing:true};
    this.processing.add(turnId);
    try{return await this.resolveTurnOnce(campaignId,turnId);}catch(error){await this.store.mutate(state=>{const turn=state.turns.find(t=>t.id===turnId);if(turn?.status==='PROCESSING'){turn.status='WAITING_FOR_AI';turn.aiError='Processamento interrompido. Estado anterior preservado.';}}).catch(()=>{});throw error;}finally{this.processing.delete(turnId);}
  }

  async resolveTurnOnce(campaignId, turnId) {
    const context = this.store.read((state) => {
      const campaign = state.campaigns.find((item) => item.id === campaignId);
      const turn = state.turns.find((item) => item.id === turnId);
      if (!campaign || !turn || turn.status !== 'PROCESSING') return null;
      const characters = state.characters.filter((item) => item.campaignId === campaignId);
      const actions = state.actions.filter((item) => item.turnId === turnId);
      const recentTurns = state.turns.filter((item) => item.campaignId === campaignId && item.status === 'RESOLVED').slice(-3).map((item) => ({ number: item.number, summary: item.summary }));
      return { campaign, turn, characters, actions, recentTurns };
    });
    if (!context) return null;

    let mechanics=context.turn.staged;
    if(!mechanics){
      mechanics=resolveMechanics({...context,turnNumber:context.turn.number});
      await this.store.mutate(state=>{const turn=state.turns.find(t=>t.id===turnId);assert(turn?.status==='PROCESSING','TURN_SEALED','Turno indisponível.',409);turn.staged=mechanics;turn.snapshot={characters:context.characters,world:context.campaign.world};});
    }
    this.#broadcast(campaignId,'TURN_PROCESSING',{turn:context.turn.number});
    let rawNarrative;
    let providerError = null;
    const providerEvents = [];
    const primaryProvider = context.campaign.settings.aiProvider;
    const fallbackProvider = context.campaign.settings.aiFallbackProvider || 'none';
    const devFailure=context.campaign.isDemo && this.config.devTools ? context.campaign.devFailure : null;
    try {
      if(devFailure&&devFailure!=='none')throw new Error({quota:'Cota de teste esgotada (429).',timeout:'Tempo limite de teste.',invalid:'Resposta inválida de teste.',auth:'Chave de teste inválida (401).'}[devFailure]||'Falha de teste.');
      const credential = this.#credentialFor(context.campaign.ownerId, primaryProvider);
      rawNarrative = await this.narrative.generate({ ...context, mechanics }, credential);
    } catch (primaryError) {
      const primaryMessage = this.safeAiError(primaryError);
      const canFallback = fallbackProvider !== 'none' && fallbackProvider !== primaryProvider && this.#providerConfigured(context.campaign.ownerId, fallbackProvider);
      if (canFallback) {
        try {
          const credential = this.#credentialFor(context.campaign.ownerId, fallbackProvider);
          const fallbackCampaign = structuredClone(context.campaign);
          fallbackCampaign.settings = {
            ...fallbackCampaign.settings,
            aiProvider: fallbackProvider,
            aiModel: credential?.model || '',
            aiBaseUrl: fallbackProvider === 'custom' ? (credential?.baseUrl || '') : '',
          };
          rawNarrative = await this.narrative.generate({ ...context, campaign: fallbackCampaign, mechanics }, credential);
          providerError = `Provedor principal falhou: ${primaryMessage}`;
          providerEvents.push({ id:newId(), type:'AI_PROVIDER_FALLBACK', turnNumber:context.turn.number, sourceId:null, targetId:null, data:{ from:primaryProvider, to:fallbackProvider, description:`A narrativa mudou automaticamente de ${primaryProvider} para ${fallbackProvider} sem recalcular o turno.` }, timestamp:nowIso() });
          console.warn(`[WARN] ${primaryProvider} falhou; fallback ${fallbackProvider} assumiu o turno.`);
        } catch (fallbackError) {
          providerError = `${primaryMessage} Reserva ${fallbackProvider}: ${this.safeAiError(fallbackError)}`;
        }
      } else providerError = primaryMessage;
      if (!rawNarrative) {
        console.error(`[WARN] Provedor narrativo indisponível; turno preservado. ${providerError}`);
        await this.store.mutate((state) => {
          const campaign = state.campaigns.find((item) => item.id === campaignId);
          const turn = state.turns.find((item) => item.id === turnId);
          if (!campaign || !turn || turn.status !== 'PROCESSING') return;
          turn.status = 'WAITING_FOR_AI';
          turn.aiError = providerError;
          campaign.updatedAt = nowIso();
          campaign.lastSavedAt = campaign.updatedAt;
        });
        this.#broadcast(campaignId, 'AI_ATTENTION_REQUIRED', { turn: context.turn.number });
        return { awaitingAi: true, error: providerError };
      }
    }
    const directives = sanitizeAiDirectives(rawNarrative, mechanics.characters.map((item) => item.id));
    if (!directives.narrative) {
      const message = 'A IA não retornou narrativa válida. Revise a chave/modelo e tente novamente.';
      await this.store.mutate((state) => {
        const campaign = state.campaigns.find((item) => item.id === campaignId);
        const turn = state.turns.find((item) => item.id === turnId);
        if (!campaign || !turn || turn.status !== 'PROCESSING') return;
        turn.status = 'WAITING_FOR_AI'; turn.aiError = message; touchCampaign(campaign);
      });
      this.#broadcast(campaignId, 'AI_ATTENTION_REQUIRED', { turn: context.turn.number });
      return { awaitingAi: true, error: message };
    }

    const completed = await this.store.mutate((state) => {
      const campaign = state.campaigns.find((item) => item.id === campaignId);
      const turn = state.turns.find((item) => item.id === turnId);
      assert(turn?.status === 'PROCESSING', 'TURN_ALREADY_RESOLVED', 'O turno já foi processado.', 409);
      for (const resolved of mechanics.characters) {
        const index = state.characters.findIndex((item) => item.id === resolved.id);
        if (index >= 0) state.characters[index] = resolved;
      }
      campaign.world = { ...mechanics.world, ...directives.worldUpdates, flags: { ...(mechanics.world.flags || {}), ...(directives.worldUpdates.flags || {}) } };
      for (const update of directives.characterUpdates) {
        const character = state.characters.find((item) => item.id === update.characterId && item.campaignId === campaignId);
        if (!character) continue;
        character.resources.hp = clamp(character.resources.hp + update.hpDelta, 0, character.resources.maxHp);
        character.resources.mana = clamp(character.resources.mana + update.manaDelta, 0, character.resources.maxMana);
        character.resources.stamina = clamp(character.resources.stamina + update.staminaDelta, 0, character.resources.maxStamina);
        if (update.position) character.position = update.position;
        character.conditions = [...new Set([...(character.conditions || []), ...update.addStatus])].slice(0, 30);
        if (character.resources.hp === 0) character.status = 'DEAD';
        character.updatedAt = nowIso();
      }
      const allEvents = [
        ...mechanics.events,
        ...providerEvents,
        ...directives.events.map((item) => ({ ...item, id: newId(), turnNumber: turn.number, timestamp: nowIso() })),
      ].map((item) => ({ ...item, campaignId, turnId }));
      state.events.push(...allEvents);
      for (const outcome of mechanics.outcomes) {
        const action = state.actions.find((item) => item.id === outcome.actionId);
        if (action) { action.status = 'RESOLVED'; action.result = outcome; }
      }
      delete turn.staged;
      turn.status = 'RESOLVED';
      turn.aiError = null;
      turn.narrative = directives.narrative;
      turn.summary = directives.summary || mechanics.outcomes.map((item) => item.summary).join(' ');
      turn.provider = rawNarrative.provider || campaign.settings.aiProvider;
      turn.result = { outcomes: mechanics.outcomes, events: allEvents, providerError };
      turn.resolvedAt = nowIso();
      advanceCampaignMemory(campaign, { turnNumber: turn.number, summary: turn.summary, memoryUpdates: directives.memoryUpdates, events: allEvents, actions: state.actions.filter((action) => action.turnId === turn.id) });
      for(const dialogue of (Array.isArray(rawNarrative.npc_dialogues)?rawNarrative.npc_dialogues:[]).slice(0,6)){
        if(!dialogue||typeof dialogue.npc_id!=='string')continue;
        const npc=campaign.world.npcs.find(n=>n.id===dialogue.npc_id&&(!n.location||n.location===campaign.world.location));
        const involved=npc&&context.actions.filter(a=>a.text.toLocaleLowerCase().includes(npc.name.toLocaleLowerCase()));
        if(!npc||!involved.length)continue;
        const record=campaign.memory.npcMemories[npc.id];if(!record)continue;
        record.interactions.push({turn:turn.number,speakerId:npc.id,text:cleanText(dialogue.reply,800),witnesses:involved.map(a=>a.characterId)});
        const note=cleanText(dialogue.memory_note,400);if(note&&!record.facts.includes(note))record.facts.push(note);
      }
      campaign.summary = [campaign.memory.grandSummary, ...campaign.memory.chapters.slice(-2).map((chapter) => chapter.summary), ...campaign.memory.recentSummaries.map((item) => item.summary)].filter(Boolean).join(' ').slice(-8_000);
      const living = state.characters.filter((item) => item.campaignId === campaignId && item.status === 'ALIVE');
      let nextTurn = null;
      if (living.length === 0) {
        campaign.state = 'FINISHED';
        campaign.currentTurnId = null;
      } else if (campaign.state === 'ACTIVE') {
        nextTurn = makeTurn(campaign, state);
        state.turns.push(nextTurn);
        campaign.currentTurnId = nextTurn.id;
      }
      campaign.updatedAt = nowIso();
      campaign.lastSavedAt = campaign.updatedAt;
      return { resolvedTurn: turn, nextTurn, campaignState: campaign.state };
    });
    console.info(`[INFO] Turno ${completed.resolvedTurn.number} resolvido`);
    this.#broadcast(campaignId, 'TURN_RESOLVED', { turn: completed.resolvedTurn.number });
    if (completed.nextTurn) this.#broadcast(campaignId, 'TURN_STARTED', { turn: completed.nextTurn.number });
    return completed;
  }

  campaignState(campaignId, userId) {
    return this.store.read((state) => {
      const campaign = campaignMember(state, campaignId, userId);
      const character = state.characters.find((item) => item.campaignId === campaignId && item.userId === userId);
      const party = campaign.memberIds.map((memberId) => {
        const user = state.users.find((item) => item.id === memberId);
        const memberCharacter = state.characters.find((item) => item.campaignId === campaignId && item.userId === memberId);
        return { user: publicUser(user), online: Boolean(user?.isBot || this.hub?.isOnline?.(campaignId, memberId)), away:Boolean((campaign.awayUserIds||[]).includes(memberId)), lobbyReady:Boolean((campaign.lobbyReadyUserIds||[]).includes(memberId)), isOwner:campaign.ownerId===memberId, isMaster:(campaign.masterUserId||campaign.ownerId)===memberId, isCoMaster:(campaign.coMasterUserIds||[]).includes(memberId), character: memberCharacter ? { id: memberCharacter.id, name: memberCharacter.identity.name, resources: memberCharacter.resources, status: memberCharacter.status, position: memberCharacter.position, level:memberCharacter.level, className:memberCharacter.identity.class, ready:state.actions.some(a=>a.turnId===campaign.currentTurnId&&a.userId===memberId), presentation: characterPresentation(memberCharacter.presentation || {}) } : null };
      });
      const turn = state.turns.find((item) => item.id === campaign.currentTurnId) || null;
      const currentActions = turn ? state.actions.filter((item) => item.turnId === turn.id) : [];
      const myAction = currentActions.find((item) => item.userId === userId);
      const lastTurn = state.turns.filter((item) => item.campaignId === campaignId && item.status === 'RESOLVED').sort((a, b) => b.number - a.number)[0] || null;
      const owner = state.users.find((item) => item.id === campaign.ownerId);
      const globalAvailability = this.narrative.availability();
      const credentialMeta = campaign.ownerId === userId ? {
        gemini:{configured:Boolean(owner?.aiCredentials?.gemini?.encryptedKey||this.config.geminiApiKey),source:owner?.aiCredentials?.gemini?.encryptedKey?'profile':this.config.geminiApiKey?'environment':null,model:owner?.aiCredentials?.gemini?.model||this.config.geminiModel||''},
        openai:{configured:Boolean(owner?.aiCredentials?.openai?.encryptedKey||this.config.openAiApiKey),source:owner?.aiCredentials?.openai?.encryptedKey?'profile':this.config.openAiApiKey?'environment':null,model:owner?.aiCredentials?.openai?.model||this.config.openAiModel||''},
        grok:{configured:Boolean(owner?.aiCredentials?.grok?.encryptedKey||this.config.grokApiKey),source:owner?.aiCredentials?.grok?.encryptedKey?'profile':this.config.grokApiKey?'environment':null,model:owner?.aiCredentials?.grok?.model||this.config.grokModel||''},
        groq:{configured:Boolean(owner?.aiCredentials?.groq?.encryptedKey||this.config.groqApiKey),source:owner?.aiCredentials?.groq?.encryptedKey?'profile':this.config.groqApiKey?'environment':null,model:owner?.aiCredentials?.groq?.model||this.config.groqModel||''},
        openrouter:{configured:Boolean(owner?.aiCredentials?.openrouter?.encryptedKey||this.config.openRouterApiKey),source:owner?.aiCredentials?.openrouter?.encryptedKey?'profile':this.config.openRouterApiKey?'environment':null,model:owner?.aiCredentials?.openrouter?.model||this.config.openRouterModel||''},
        custom:{configured:Boolean(owner?.aiCredentials?.custom?.encryptedKey||this.config.customApiKey),source:owner?.aiCredentials?.custom?.encryptedKey?'profile':this.config.customApiKey?'environment':null,model:owner?.aiCredentials?.custom?.model||this.config.customModel||'',baseUrl:owner?.aiCredentials?.custom?.baseUrl||this.config.customBaseUrl||''},
      } : null;
      return {
        catalog: {classes:CLASSES,items:ITEMS,attributes:ATTRIBUTES,talents:TALENTS,masteryRanks:MASTERY_RANKS,recipes:RECIPES.map(recipe=>({...recipe,status:recipeStatus(character,recipe)})),market:marketPresentation(character,campaign.world)}, devTools:Boolean(this.config.devTools&&campaign.ownerId===userId&&campaign.isDemo),
        audit:state.events.filter(e=>e.campaignId===campaignId&&(e.type.startsWith('HOST_')||e.type.startsWith('MASTER_')||e.type==='PLAYER_AVAILABILITY')).slice(-40),
        campaign: { ...safeCampaign(campaign), world: publicWorld(campaign.world, campaign.settings), summary: campaign.summary },
        character: (()=>{ ensureProgression(character); const attrs=effectiveAttributes(character); return {...character,legacyPowers:undefined,effectiveAttributes:attrs,derivedStats:derivedStats(character,attrs),masterySummary:Object.fromEntries(Object.keys(ATTRIBUTES).map(key=>{const xp=character.masteries?.[key]?.xp||0;const rank=masteryRankFor(xp);const next=nextMasteryRank(xp);return [key,{xp,uses:character.masteries?.[key]?.uses||0,rank,next}];}))}; })(),
        party,
        turn: turn ? { id: turn.id, number: turn.number, status: turn.status, ready: currentActions.length, total: turn.expectedPlayerIds.length, active: turn.expectedPlayerIds.filter(id=>state.users.find(u=>u.id===id)?.isBot || this.hub?.isOnline?.(campaignId,id) || currentActions.some(a=>a.userId===id)).length, minimum: Math.min(turn.expectedPlayerIds.length,Math.max(1,Number(campaign.settings.minPlayers||1))), aiError: (campaign.ownerId === userId || (campaign.masterUserId||campaign.ownerId)===userId) ? turn.aiError || null : null, myAction: myAction ? { id: myAction.id, text: myAction.text, status: myAction.status } : null } : null,
        lastResult: lastTurn ? { number: lastTurn.number, narrative: lastTurn.narrative, summary: lastTurn.summary, provider: lastTurn.provider, resolvedAt: lastTurn.resolvedAt, events: state.events.filter(event=>event.turnId===lastTurn.id).slice(-20).map(event=>({type:event.type,data:event.data})) } : null,
        isOwner: campaign.ownerId === userId,
        isMaster: (campaign.masterUserId || campaign.ownerId) === userId,
        isCoMaster: (campaign.coMasterUserIds || []).includes(userId),
        canControl: isSessionController(campaign,userId),
        vote: votePresentation(campaign,userId),
        catchUp: Number(character?.joinedTurn||1)>1 ? { joinedTurn:Number(character.joinedTurn), summary:cleanText(campaign.summary||'',3500), recent:state.turns.filter(t=>t.campaignId===campaignId&&t.status==='RESOLVED').sort((a,b)=>b.number-a.number).slice(0,3).map(t=>({number:t.number,summary:t.summary})) } : null,
        master: publicUser(state.users.find((item)=>item.id===(campaign.masterUserId||campaign.ownerId))),
        memoryStats: {
          chapters: ensureCampaignMemory(campaign).chapters.length,
          recentTurns: campaign.memory.recentSummaries.length,
          activeFacts: campaign.memory.facts.filter((fact) => fact.active !== false).length,
        },
        aiAvailability: {
          gemini: Boolean(globalAvailability.gemini || owner?.aiCredentials?.gemini?.encryptedKey),
          openai: Boolean(globalAvailability.openai || owner?.aiCredentials?.openai?.encryptedKey),
          grok: Boolean(globalAvailability.grok || owner?.aiCredentials?.grok?.encryptedKey),
          groq: Boolean(globalAvailability.groq || owner?.aiCredentials?.groq?.encryptedKey),
          openrouter: Boolean(globalAvailability.openrouter || owner?.aiCredentials?.openrouter?.encryptedKey),
          custom: Boolean(globalAvailability.custom || owner?.aiCredentials?.custom?.encryptedKey),
        },
        aiCredentialMeta: credentialMeta,
      };
    });
  }

  async transferMaster(campaignId, userId, targetUserId) {
    const result = await this.store.mutate((state) => {
      const campaign = campaignMember(state, campaignId, userId);
      assert(campaign.ownerId === userId, 'NOT_AUTHORIZED', 'Somente o proprietário do servidor pode transferir ou retomar o papel de mestre.', 403);
      const targetId = targetUserId || campaign.ownerId;
      assert(campaign.memberIds.includes(targetId), 'PLAYER_NOT_IN_CAMPAIGN', 'O novo mestre precisa participar desta campanha.', 409);
      const previous = campaign.masterUserId || campaign.ownerId;
      campaign.masterUserId = targetId;
      touchCampaign(campaign);
      state.events.push({id:newId(),campaignId,type:'MASTER_TRANSFERRED',sourceId:userId,targetId,data:{previousMasterUserId:previous,newMasterUserId:targetId,description:targetId===campaign.ownerId?'O proprietário retomou o papel de mestre.':'O papel de mestre foi transferido sem mover o servidor ou revelar chaves de API.'},timestamp:nowIso()});
      return {campaign:safeCampaign(campaign),master:publicUser(state.users.find(u=>u.id===targetId))};
    });
    this.#broadcast(campaignId,'MASTER_TRANSFERRED',{masterUserId:result.campaign.masterUserId});
    return result;
  }

  async setAvailability(campaignId, userId, away) {
    const result = await this.store.mutate((state) => {
      const campaign=campaignMember(state,campaignId,userId);
      campaign.awayUserIds=Array.isArray(campaign.awayUserIds)?campaign.awayUserIds:[];
      const set=new Set(campaign.awayUserIds);
      if(away)set.add(userId);else set.delete(userId);
      campaign.awayUserIds=[...set];
      const turn=state.turns.find(t=>t.id===campaign.currentTurnId);
      if(away && turn?.status==='COLLECTING_ACTIONS' && turn.expectedPlayerIds.includes(userId) && !state.actions.some(a=>a.turnId===turn.id&&a.userId===userId)){
        turn.expectedPlayerIds=turn.expectedPlayerIds.filter(id=>id!==userId);
      } else if(!away && turn?.status==='COLLECTING_ACTIONS' && !turn.expectedPlayerIds.includes(userId) && turn.actionIds.length===0){
        const character=state.characters.find(c=>c.campaignId===campaignId&&c.userId===userId);
        if(character?.status==='ALIVE')turn.expectedPlayerIds.push(userId);
      }
      state.events.push({id:newId(),campaignId,turnId:turn?.id||null,turnNumber:turn?.number||null,type:'PLAYER_AVAILABILITY',sourceId:userId,targetId:null,data:{away:Boolean(away),description:away?'Jogador marcou ausência temporária; continuará na campanha e volta em um turno futuro.':'Jogador voltou a ficar disponível; entra no próximo turno aberto.'},timestamp:nowIso()});
      touchCampaign(campaign);
      return {away:Boolean(away),campaign:safeCampaign(campaign)};
    });
    this.#broadcast(campaignId,'PLAYER_AVAILABILITY',{userId,away:Boolean(away)});
    return result;
  }

  async setLobbyReady(campaignId,userId,ready){
    const result=await this.store.mutate(state=>{
      const campaign=campaignMember(state,campaignId,userId);assert(campaign.state==='LOBBY','INVALID_CAMPAIGN_STATE','A prontidão do lobby só pode ser alterada antes da sessão.',409);
      const set=new Set(campaign.lobbyReadyUserIds||[]);if(ready)set.add(userId);else set.delete(userId);campaign.lobbyReadyUserIds=[...set];touchCampaign(campaign);
      return {ready:Boolean(ready),readyCount:campaign.lobbyReadyUserIds.length,campaign:safeCampaign(campaign)};
    });this.#broadcast(campaignId,'LOBBY_READY_CHANGED',{userId,ready:Boolean(ready)});return result;
  }

  async delegateCoMaster(campaignId,userId,targetUserId,enabled=true){
    const result=await this.store.mutate(state=>{
      const campaign=campaignMember(state,campaignId,userId);assert(campaign.ownerId===userId,'NOT_AUTHORIZED','Somente o proprietário pode delegar co-mestres.',403);
      assert(campaign.memberIds.includes(targetUserId),'PLAYER_NOT_IN_CAMPAIGN','O co-mestre precisa estar na campanha.',409);assert(targetUserId!==campaign.ownerId,'INVALID_ROLE','O proprietário já possui controle total.');
      const target=state.users.find(u=>u.id===targetUserId);assert(!target?.isBot,'INVALID_ROLE','Bots não podem ser co-mestres.');
      const set=new Set(campaign.coMasterUserIds||[]);if(enabled){assert(set.has(targetUserId)||set.size<2,'ROLE_LIMIT','A campanha permite até dois co-mestres.');set.add(targetUserId);}else set.delete(targetUserId);campaign.coMasterUserIds=[...set];touchCampaign(campaign);
      state.events.push({id:newId(),campaignId,type:'MASTER_DELEGATION',sourceId:userId,targetId:targetUserId,data:{enabled:Boolean(enabled),description:enabled?`${target?.displayName||'Jogador'} recebeu controles auxiliares de mestragem.`:`${target?.displayName||'Jogador'} deixou de ser co-mestre.`},timestamp:nowIso()});
      return {campaign:safeCampaign(campaign),enabled:Boolean(enabled),target:publicUser(target)};
    });this.#broadcast(campaignId,'MASTER_DELEGATION',{targetUserId,enabled:Boolean(enabled)});return result;
  }

  async createVote(campaignId,userId,input){
    const result=await this.store.mutate(state=>{
      const campaign=campaignMember(state,campaignId,userId);assert(isSessionController(campaign,userId),'NOT_AUTHORIZED','Somente a equipe de mestragem pode abrir votações.',403);
      assert(!campaign.activeVote||campaign.activeVote.status!=='OPEN','VOTE_ALREADY_OPEN','Já existe uma votação aberta.',409);
      const prompt=cleanText(input.prompt,180);assert(prompt.length>=3,'INVALID_VOTE','Escreva a pergunta da votação.');
      const labels=(Array.isArray(input.options)?input.options:[]).map(value=>cleanText(value,80)).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,4);assert(labels.length>=2,'INVALID_VOTE','A votação precisa de pelo menos duas opções.');
      const vote={id:newId(),prompt,options:labels.map(label=>({id:newId(),label})),ballots:{},createdBy:userId,createdAt:nowIso(),status:'OPEN'};campaign.activeVote=vote;touchCampaign(campaign);return votePresentation(campaign,userId);
    });this.#broadcast(campaignId,'VOTE_OPENED',{voteId:result.id});return result;
  }

  async castVote(campaignId,userId,optionId){
    const result=await this.store.mutate(state=>{
      const campaign=campaignMember(state,campaignId,userId);const vote=campaign.activeVote;assert(vote?.status==='OPEN','VOTE_NOT_OPEN','Não há votação aberta.',409);assert((vote.options||[]).some(option=>option.id===optionId),'INVALID_VOTE_OPTION','Opção inválida.');
      vote.ballots ||= {};vote.ballots[userId]=optionId;touchCampaign(campaign);return votePresentation(campaign,userId);
    });this.#broadcast(campaignId,'VOTE_UPDATED',{});return result;
  }

  async closeVote(campaignId,userId){
    const result=await this.store.mutate(state=>{
      const campaign=campaignMember(state,campaignId,userId);assert(isSessionController(campaign,userId),'NOT_AUTHORIZED','Somente a equipe de mestragem pode encerrar votações.',403);const vote=campaign.activeVote;assert(vote?.status==='OPEN','VOTE_NOT_OPEN','Não há votação aberta.',409);
      const tally=Object.fromEntries((vote.options||[]).map(option=>[option.id,0]));for(const optionId of Object.values(vote.ballots||{}))if(Object.hasOwn(tally,optionId))tally[optionId]++;
      const archived={...vote,status:'CLOSED',closedAt:nowIso(),tally};campaign.voteHistory=[...(campaign.voteHistory||[]),archived].slice(-20);campaign.activeVote=null;touchCampaign(campaign);return archived;
    });this.#broadcast(campaignId,'VOTE_CLOSED',{voteId:result.id});return result;
  }

  async saveCampaign(campaignId, userId) {
    const saved = await this.store.mutate((state) => {
      const campaign = campaignMember(state, campaignId, userId);
      campaign.lastSavedAt = nowIso();
      campaign.updatedAt = campaign.lastSavedAt;
      state.events.push({ id: newId(), campaignId, turnId: campaign.currentTurnId, turnNumber: state.turns.find((turn) => turn.id === campaign.currentTurnId)?.number || null, type: 'CAMPAIGN_SAVED', sourceId: userId, targetId: null, data: { manual: true }, timestamp: campaign.lastSavedAt });
      return { savedAt: campaign.lastSavedAt, campaignId };
    });
    this.#broadcast(campaignId, 'CAMPAIGN_SAVED', saved);
    return saved;
  }

  exportCampaign(campaignId, userId) {
    return this.store.read((state) => {
      const campaign = campaignMember(state, campaignId, userId);
      assert(campaign.ownerId === userId, 'NOT_AUTHORIZED', 'Somente o líder pode exportar o backup.', 403);
      return {
        format: 'EIDRYSS_CAMPAIGN_BACKUP', version: 1, exportedAt: nowIso(),
        campaign: structuredClone(campaign),
        members: campaign.memberIds.map((id) => publicUser(state.users.find((user) => user.id === id))),
        characters: state.characters.filter((item) => item.campaignId === campaignId),
        turns: state.turns.filter((item) => item.campaignId === campaignId).map(({staged,snapshot,...turn})=>turn),
        actions: state.actions.filter((item) => item.campaignId === campaignId).map((action) => {
          const turn = state.turns.find((item) => item.id === action.turnId);
          return turn?.status === 'RESOLVED' ? action : { ...action, text: '[AÇÃO SELADA ATÉ O TURNO SER RESOLVIDO]' };
        }),
        events: state.events.filter((item) => item.campaignId === campaignId),
      };
    });
  }

  history(campaignId, userId) {
    return this.store.read((state) => {
      campaignMember(state, campaignId, userId);
      return state.turns.filter((turn) => turn.campaignId === campaignId && turn.status === 'RESOLVED').sort((a, b) => b.number - a.number).map((turn) => ({
        id: turn.id, number: turn.number, narrative: turn.narrative, summary: turn.summary, provider: turn.provider,
        createdAt: turn.createdAt, resolvedAt: turn.resolvedAt,
        actions: state.actions.filter((action) => action.turnId === turn.id).map((action) => {
          const character = state.characters.find((item) => item.id === action.characterId);
          return { characterName: character?.identity.name || 'Desconhecido', text: action.text, result: action.result };
        }),
        events: state.events.filter((item) => item.turnId === turn.id),
      }));
    });
  }

  async recoverInterruptedTurns() {
    await this.store.mutate(state=>{for(const turn of state.turns){if(turn.status==='PROCESSING'){turn.status='WAITING_FOR_AI';turn.aiError='Servidor reiniciado. Resultados preservados; tente novamente.';}}});
  }

  async retryTurn(campaignId, userId) {
    const turnId = await this.store.mutate((state) => {
      const campaign = campaignMember(state, campaignId, userId);
      assert(isSessionController(campaign,userId), 'NOT_AUTHORIZED', 'Somente a equipe de mestragem pode tentar a IA novamente.', 403);
      const turn = state.turns.find((item) => item.id === campaign.currentTurnId);
      assert(turn?.status === 'WAITING_FOR_AI', 'TURN_NOT_WAITING_FOR_AI', 'Este turno não está aguardando uma IA.', 409);
      turn.status = 'PROCESSING'; turn.aiError = null; touchCampaign(campaign);
      return turn.id;
    });
    return this.resolveTurn(campaignId, turnId);
  }

  async characterOperation(campaignId,userId,input){
    const result=await this.store.mutate(state=>{
      const campaign=campaignMember(state,campaignId,userId);const turn=state.turns.find(t=>t.id===campaign.currentTurnId);
      const c=state.characters.find(c=>c.campaignId===campaignId&&c.userId===userId);ensureProgression(c);
      const myAction=turn?state.actions.find(action=>action.turnId===turn.id&&action.characterId===c.id):null;
      assert(!turn||turn.status==='RESOLVED'||(turn.status==='COLLECTING_ACTIONS'&&!myAction),'TURN_SEALED','Sua ação deste turno já foi selada. Evolua a ficha no próximo turno antes de enviar uma nova ação.',409);
      let eventData={operation:input.operation};
      if(input.operation==='allocate'){allocate(c,input.allocation);eventData={...eventData,allocation:structuredClone(input.allocation),remainingAttributePoints:c.attributePoints};}
      else if(input.operation==='train')train(c,input.skillId);
      else if(input.operation==='path'){
        const cls=CLASSES.find(x=>x.id===c.classId);const path=choosePath(c,input.pathId,cls);eventData={...eventData,pathId:path.id,pathName:path.name};
      }
      else if(input.operation==='specialize'){
        const cls=CLASSES.find(x=>x.id===c.classId);const path=(cls?.paths||[]).find(path=>path.name===input.name);
        if(path)choosePath(c,path.id,cls);else {assert(cls&&c.level>=cls.specializationLevel&&!c.specialization&&cls.specializations.includes(input.name),'SPECIALIZATION_LOCKED','Especialização indisponível.');c.specialization=input.name;c.attributes[cls.primaryAttributes[0]]+=2;}
      }
      else if(input.operation==='talent'){
        const spent=spendTalent(c,input.talentId);eventData={...eventData,talentId:spent.talent.id,talentName:spent.talent.name,rank:spent.rank};
      }
      else if(input.operation==='craft'){
        const made=craft(c,input.recipeId);c.craftingXp=Number(c.craftingXp||0)+10;eventData={...eventData,recipeId:made.recipe.id,itemName:made.result.name};
      }
      else if(input.operation==='buy'){
        const bought=buyMarketItem(c,campaign.world,input.marketId,input.quantity);eventData={...eventData,marketId:input.marketId,itemName:bought.item.name,total:bought.total,quantity:bought.quantity,coins:bought.coins};
      }
      else if(input.operation==='sell'){
        const sold=sellInventoryItem(c,campaign.world,input.itemId,input.quantity);eventData={...eventData,itemName:sold.itemName,total:sold.total,quantity:sold.quantity,coins:sold.coins};
      }
      else if(input.operation==='downtime'){
        assert(c.downtimePoints>0,'NO_DOWNTIME','Você não possui pontos de intervalo. Resolva turnos para recuperar atividades de downtime.');
        const kind=cleanText(input.kind,30);
        if(kind==='train'){
          assert(Object.hasOwn(ATTRIBUTES,input.attribute),'INVALID_ATTRIBUTE','Atributo inválido.');const gain=gainAttributeMastery(c,input.attribute,28);eventData={...eventData,kind,attribute:input.attribute,masteryXp:gain.xp,rank:gain.after.name};
        } else if(kind==='recover'){
          c.resources.hp=Math.min(c.resources.maxHp,c.resources.hp+25);c.resources.mana=Math.min(c.resources.maxMana,c.resources.mana+18);c.resources.stamina=Math.min(c.resources.maxStamina,c.resources.stamina+22);eventData={...eventData,kind};
        } else if(kind==='study'){
          const gain=gainAttributeMastery(c,'intelligence',22);grantXp(c,10);eventData={...eventData,kind,masteryXp:gain.xp,xp:10};
        } else throw new AppError('INVALID_DOWNTIME','Atividade de intervalo inválida.');
        c.downtimePoints--;
      }
      else if(input.operation==='equip'){const item=c.inventory.find(i=>i.id===input.itemId&&i.quantity>0);assert(item?.slot&&c.level>=(item.requirements?.level||1),'ITEM_UNAVAILABLE','Equipamento indisponível.');if(c.equipment[item.slot]===item.id)delete c.equipment[item.slot];else c.equipment[item.slot]=item.id;}
      else throw new AppError('INVALID_OPERATION','Operação inválida.');
      state.events.push({id:newId(),campaignId,turnId:turn?.id||null,turnNumber:turn?.number||null,type:'CHARACTER_PROGRESSION',sourceId:userId,targetId:c.id,data:eventData,timestamp:nowIso()});
      touchCampaign(campaign);return c;
    });this.#broadcast(campaignId,'CHARACTER_UPDATED',{});return {character:result};
  }

  async adminOperation(campaignId,userId,input){
    const reason=cleanText(input.reason,200);assert(reason.length>=3,'REASON_REQUIRED','Informe o motivo.');
    let generatedItem=null;
    if(input.operation==='grant-ai-item'){
      const request=cleanText(input.itemId||input.itemPrompt,500);assert(request.length>=2,'ITEM_PROMPT_REQUIRED','Descreva o item que o Host quer criar.');
      const snapshot=this.store.read(state=>{
        const campaign=campaignMember(state,campaignId,userId);assert(isSessionController(campaign,userId),'NOT_AUTHORIZED','Somente a equipe de mestragem.',403);
        const turn=state.turns.find(t=>t.id===campaign.currentTurnId);assert(turn?.status!=='PROCESSING','TURN_BUSY','Aguarde a IA.',409);
        assert(campaign.state==='PAUSED'&&(!turn||turn.status==='RESOLVED'||(turn.status==='COLLECTING_ACTIONS'&&!turn.actionIds.length)),'TURN_SEALED','Pause num turno sem ações.',409);
        const character=state.characters.find(c=>c.campaignId===campaignId&&c.id===input.characterId);assert(character,'CHARACTER_NOT_FOUND','Personagem inválido.');
        return {campaign,character};
      });
      const credential=this.#credentialFor(snapshot.campaign.ownerId,snapshot.campaign.settings.aiProvider);
      assert(credential?.apiKey,'AI_CONFIGURATION_REQUIRED','Configure uma chave de IA para o provedor da campanha antes de criar itens.');
      assert(typeof this.narrative.generateItem==='function','AI_ITEM_UNAVAILABLE','Este provedor narrativo não oferece criação de itens.',503);
      try{
        const raw=await this.narrative.generateItem({campaign:snapshot.campaign,character:snapshot.character,request},credential);
        generatedItem=makeGeneratedItem(raw,{request,level:snapshot.character.level});
        if(Number.isSafeInteger(input.quantity))generatedItem.quantity=clamp(input.quantity,1,20);
      }catch(error){throw new AppError('AI_ITEM_FAILED',`Não foi possível criar o item: ${this.safeAiError(error)}`,502);}
    }
    const result=await this.store.mutate(state=>{
      const campaign=campaignMember(state,campaignId,userId);assert(isSessionController(campaign,userId),'NOT_AUTHORIZED','Somente a equipe de mestragem.',403);
      const turn=state.turns.find(t=>t.id===campaign.currentTurnId);assert(turn?.status!=='PROCESSING','TURN_BUSY','Aguarde a IA.',409);
      let itemResult=null;
      if(input.operation==='reopen'){
        assert(turn&&campaign.state==='PAUSED','PAUSE_REQUIRED','Pause antes de reabrir.',409);
        assert(!turn.staged,'TURN_SEALED','Turno calculado não pode ser reaberto para rerrolar dados.',409);
        state.actions=state.actions.filter(a=>a.turnId!==turn.id);turn.actionIds=[];turn.status='COLLECTING_ACTIONS';
      }else{
        assert(campaign.state==='PAUSED'&&(!turn||turn.status==='RESOLVED'||(turn.status==='COLLECTING_ACTIONS'&&!turn.actionIds.length)),'TURN_SEALED','Pause num turno sem ações.',409);
        const c=state.characters.find(c=>c.campaignId===campaignId&&c.id===input.characterId);assert(c,'CHARACTER_NOT_FOUND','Personagem inválido.');
        if(input.operation==='grant-item'){itemResult=makeItem(input.itemId,Number.isSafeInteger(input.quantity)?clamp(input.quantity,1,20):1);c.inventory.push(itemResult);}
        else if(input.operation==='grant-ai-item'){assert(generatedItem,'AI_ITEM_FAILED','A IA não produziu um item válido.',502);itemResult=structuredClone(generatedItem);c.inventory.push(itemResult);}
        else if(input.operation==='remove-item'){assert(c.inventory.some(i=>i.id===input.itemId),'ITEM_UNAVAILABLE','Item ausente.');c.inventory=c.inventory.filter(i=>i.id!==input.itemId);for(const[k,v]of Object.entries(c.equipment))if(v===input.itemId)delete c.equipment[k];}
        else if(input.operation==='hp'){assert(Number.isSafeInteger(input.value)&&input.value>=0&&input.value<=c.resources.maxHp,'INVALID_HP','HP inválido.');c.resources.hp=input.value;c.status=input.value?'ALIVE':'DEAD';if(turn)turn.expectedPlayerIds=state.characters.filter(ch=>ch.campaignId===campaignId&&ch.status==='ALIVE').map(ch=>ch.userId);}
        else throw new AppError('INVALID_OPERATION','Operação inválida.');
      }
      state.events.push({id:newId(),campaignId,type:'HOST_CORRECTION',sourceId:userId,timestamp:nowIso(),data:{operation:input.operation,characterId:input.characterId,reason,itemName:itemResult?.name||'',itemId:itemResult?.id||input.itemId||''}});touchCampaign(campaign);return {ok:true,item:itemResult?{id:itemResult.id,name:itemResult.name,description:itemResult.description,type:itemResult.type,rarity:itemResult.rarity,quantity:itemResult.quantity,attributes:itemResult.attributes,effects:itemResult.effects}:null};
    });this.#broadcast(campaignId,'HOST_CORRECTION',{});return result;
  }

  async testAi(userId,input){
    const provider=cleanText(input.provider||input.aiProvider,30);assert(PROVIDERS.has(provider),'INVALID_PROVIDER','Provedor inválido.');
    const suppliedKey=String(input.apiKey||input.aiApiKey||'').trim();
    if(suppliedKey)assert(suppliedKey.length>=10&&suppliedKey.length<=1_000,'INVALID_API_KEY','A chave parece inválida. Confira e tente novamente.');
    const saved=this.#credentialFor(userId,provider);
    const model=cleanText(input.model||input.aiModel,120)||saved?.model||'';
    const baseUrl=provider==='custom'?normalizeAiBaseUrl(input.baseUrl||input.aiBaseUrl||saved?.baseUrl,{required:true}):'';
    const credential=suppliedKey?{apiKey:suppliedKey,model,baseUrl}:saved;
    assert(credential?.apiKey,'AI_CONFIGURATION_REQUIRED','Nenhuma chave foi informada ou salva para este provedor.');
    const context={campaign:{name:'Teste de conexão',settings:{aiProvider:provider,aiModel:model,aiBaseUrl:baseUrl,tone:'Responda apenas: Conexão confirmada.',worldRules:''},world:{location:'Teste',npcs:[],entities:[]}},turn:{number:0},characters:[],actions:[],mechanics:{outcomes:[],events:[]}};
    try{const result=await this.narrative.generate(context,credential);assert(typeof result.narrative==='string'&&result.narrative.trim(),'INVALID_RESPONSE','Resposta inválida.');return {ok:true,provider,model:result.model||context.campaign.settings.aiModel,testedUnsavedKey:Boolean(suppliedKey)};}catch(error){throw new AppError('AI_TEST_FAILED',this.safeAiError(error),502);}
  }

  safeAiError(error){
    const text=String(error.message||'Falha de conexão');
    if(/429|quota|cota|crédito|credito/i.test(text))return 'Créditos ou cota esgotados / limite de requisições (429). Aguarde ou troque a chave.';
    if(/401|403|chave|key/i.test(text))return 'Chave ausente, inválida ou sem permissão. Confira a configuração.';
    if(/abort|timeout|tempo/i.test(text))return 'Tempo limite da IA. O turno foi preservado.';
    if(/408|425|500|502|503|504/i.test(text))return 'O provedor de IA está temporariamente instável. O servidor já tentou novamente automaticamente; tente mais uma vez em alguns segundos.';
    if(/JSON|resposta inválida|resposta invalida/i.test(text))return 'A IA respondeu em formato inválido. O turno foi preservado; tente novamente.';
    return 'Provedor indisponível ou resposta inválida. Confira modelo e conexão; tente novamente.';
  }

  async devOperation(campaignId,userId,input){
    assert(this.config.devTools,'NOT_FOUND','Rota não encontrada.',404);
    await this.store.mutate(state=>{const c=campaignMember(state,campaignId,userId);assert(c.ownerId===userId&&c.isDemo,'NOT_AUTHORIZED','Somente o dono de uma campanha de teste.',403);const turn=state.turns.find(t=>t.id===c.currentTurnId);assert(turn?.status!=='PROCESSING','TURN_BUSY','Aguarde.',409);
      if(input.operation==='failure'){assert(['none','quota','timeout','invalid','auth'].includes(input.value),'INVALID_FAILURE','Falha inválida.');c.devFailure=input.value;}
      else if(input.operation==='xp'){assert(!turn?.actionIds.length,'TURN_SEALED','Aguarde novo turno.',409);for(const ch of state.characters.filter(ch=>ch.campaignId===campaignId))grantXp(ch,300);}
      else throw new AppError('INVALID_OPERATION','Operação inválida.');
      state.events.push({id:newId(),campaignId,type:'HOST_DEV',sourceId:userId,timestamp:nowIso(),data:{operation:input.operation}});
    });return {ok:true};
  }

  #firstConfiguredProvider(ownerId) {
    const profile = this.profile(ownerId).aiCredentials;
    return ['groq', 'gemini', 'openai', 'grok', 'openrouter', 'custom'].find((provider) => profile[provider]?.configured) || null;
  }

  #providerConfigured(ownerId, provider) {
    if (!PROVIDERS.has(provider)) return false;
    const stored = this.store.read((state) => Boolean(state.users.find((user) => user.id === ownerId)?.aiCredentials?.[provider]?.encryptedKey));
    return stored || Boolean(this.narrative.availability?.()[provider]);
  }

  #credentialFor(ownerId, provider) {
    if (!PROVIDERS.has(provider)) return null;
    const credential = this.store.read((state) => state.users.find((user) => user.id === ownerId)?.aiCredentials?.[provider] || null);
    if (!credential?.encryptedKey) return null;
    return { apiKey: this.vault.decrypt(credential.encryptedKey), model: credential.model || '', baseUrl: credential.baseUrl || '' };
  }

  #broadcast(campaignId, type, data) {
    this.hub?.broadcast(campaignId, { type, data, timestamp: nowIso() });
  }
}

export { AppError };
