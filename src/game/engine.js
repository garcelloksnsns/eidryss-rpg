import crypto from 'node:crypto';
import { CLASSES, chooseClass, ensureProgression, grantXp, makeItem, STORY_SKILLS } from './catalog.js';
import { gainAttributeMastery, gainSkillMastery, masteryBonus, masteryRankFor, pathModifiers, talentModifiers } from './progression.js';
import { progressWorld, updateBestiaryKnowledge } from './world.js';
import { clamp, cleanText, newId, nowIso } from '../core/utils.js';

const EVENT_TYPES = new Set([
  'DAMAGE', 'HEAL', 'ITEM_GAINED', 'ITEM_LOST', 'STATUS_APPLIED', 'STATUS_REMOVED',
  'CHARACTER_MOVED', 'POWER_USED', 'CHARACTER_DIED', 'CHARACTER_INCAPACITATED',
  'DISCOVERY', 'QUEST_STARTED', 'QUEST_COMPLETED', 'WORLD_CHANGED', 'ACTION_RESOLVED',
  'RESOURCE_GATHERED', 'RESOURCE_RESPAWNED', 'RESTED', 'NPC_RELATION_CHANGED',
  'WORLD_EVENT', 'NPC_ARRIVED', 'ENCOUNTER_STARTED', 'ENEMY_ACTED', 'STORY_THREAD_STARTED',
  'ACTION_CHECKED', 'COMPLICATION', 'WORLD_CLOCK_ADVANCED', 'WORLD_CLOCK_COMPLETED',
  'ATTRIBUTE_MASTERY_GAINED', 'ATTRIBUTE_MASTERY_RANK_UP', 'SKILL_MASTERY_GAINED', 'SKILL_MASTERY_RANK_UP',
]);

const TIME_CYCLE = ['Amanhecer', 'Manhã', 'Tarde', 'Entardecer', 'Noite'];
const WEATHER_CYCLE = ['Céu limpo', 'Brisa entre as folhas', 'Névoa baixa', 'Chuva leve', 'Céu estrelado'];

function ensureEcosystem(world) {
  world.ecosystem ||= {};
  const ecosystem = world.ecosystem;
  ecosystem.biome ||= 'Floresta ancestral';
  ecosystem.dangerLevel = clamp(Number(ecosystem.dangerLevel ?? 2), 0, 5);
  ecosystem.ambience ||= 'Folhas sussurram ao redor da trilha.';
  ecosystem.cycleIndex = clamp(Math.trunc(Number(ecosystem.cycleIndex ?? 0)), 0, TIME_CYCLE.length - 1);
  ecosystem.resources = Array.isArray(ecosystem.resources) ? ecosystem.resources : [];
  ecosystem.factions = Array.isArray(ecosystem.factions) ? ecosystem.factions : [];
  for (const resource of ecosystem.resources) {
    resource.id ||= newId();
    resource.name ||= 'Recurso natural';
    resource.type ||= 'MATERIAL';
    resource.quantity = Math.max(0, Math.trunc(Number(resource.quantity ?? 0)));
    resource.maxQuantity = Math.max(resource.quantity, Math.trunc(Number(resource.maxQuantity ?? resource.quantity)));
    resource.respawnTurns = clamp(Math.trunc(Number(resource.respawnTurns ?? 3)), 1, 20);
  }
  return ecosystem;
}

function advanceEcosystem(world, turnNumber, events) {
  const ecosystem = ensureEcosystem(world);
  const priorIndex = ecosystem.cycleIndex;
  ecosystem.cycleIndex = (priorIndex + 1) % TIME_CYCLE.length;
  world.time = TIME_CYCLE[ecosystem.cycleIndex];
  world.weather = WEATHER_CYCLE[ecosystem.cycleIndex];
  ecosystem.lastAdvancedTurn = turnNumber;
  const respawned = [];
  for (const resource of ecosystem.resources) {
    if (resource.quantity === 0 && Number(resource.nextRespawnTurn || Infinity) <= turnNumber) {
      resource.quantity = Math.max(1, resource.maxQuantity);
      delete resource.nextRespawnTurn;
      respawned.push(resource.name);
      events.push(event(turnNumber, 'RESOURCE_RESPAWNED', null, resource.id, { resource: resource.name, quantity: resource.quantity }));
    }
  }
  events.push(event(turnNumber, 'WORLD_CHANGED', null, null, {
    time: world.time, weather: world.weather, biome: ecosystem.biome, respawned,
  }));
}

function fold(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function createDefaultCharacter(userId, campaignId, name) {
  const character = {
    id: newId(),
    userId,
    campaignId,
    identity: {
      name: cleanText(name, 40) || 'Aventureiro',
      age: null,
      race: 'Humano',
      class: 'Aventureiro',
      title: 'Recém-chegado',
      description: '',
      appearance: '',
    },
    presentation: { avatar: '✦', accent: '#6de7a5', aura: 'folha' },
    attributes: {
      strength: 10,
      speed: 10,
      resistance: 10,
      intelligence: 10,
      perception: 10,
      magic: 10,
      luck: 10,
      charisma: 10,
      initiative: 0,
      defense: 0,
      attack: 0,
    },
    resources: { hp: 100, maxHp: 100, mana: 50, maxMana: 50, stamina: 50, maxStamina: 50 },
    level: 1,
    experience: 0,
    status: 'ALIVE',
    position: 'Ponto inicial',
    inventory: [
      {
        id: newId(), name: 'Poção de Vida', description: 'Recupera 25 HP.', type: 'CONSUMABLE',
        quantity: 1, weight: 0.2, rarity: 'COMMON', value: 15, effects: [{ type: 'HEAL', value: 25 }],
        attributes: {}, metadata: {},
      },
    ],
    equipment: {},
    powers: [
      {
        id: newId(), name: 'Golpe Determinado', description: 'Um ataque focado e confiável.', type: 'ACTIVE',
        cost: { stamina: 8 }, cooldown: 0, conditions: [], effects: [{ type: 'DAMAGE', scaling: 'strength', base: 8 }],
        priority: 2, passive: false, metadata: {},
      },
    ],
    abilities: [],
    effects: [],
    conditions: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  chooseClass(character, 'warrior');
  character.classChosen = false;
  character.inventory.push(makeItem('sword'), makeItem('robe'));
  return character;
}

export function effectiveAttributes(character) {
  const result = { ...character.attributes };
  const cls = CLASSES.find((entry) => entry.id === character.classId);
  for (const [key, value] of Object.entries(talentModifiers(character))) result[key] = (result[key] || 0) + value;
  for (const [key, value] of Object.entries(pathModifiers(character, cls))) result[key] = (result[key] || 0) + value;
  for (const itemId of Object.values(character.equipment || {})) {
    const item = character.inventory.find((entry) => entry.id === itemId);
    for (const [key, value] of Object.entries(item?.attributes || {})) {
      if (typeof value === 'number') result[key] = (result[key] || 0) + value;
    }
  }
  for (const effect of character.effects || []) {
    for (const [key, value] of Object.entries(effect.attributeModifiers || {})) {
      if (typeof value === 'number') result[key] = (result[key] || 0) + value;
    }
  }
  return result;
}

export function priorityScore(character, action) {
  const stats = effectiveAttributes(character);
  const normalized = fold(action.text);
  const mentionedPower = (character.powers || []).find((power) => normalized.includes(fold(power.name)));
  const effectPriority = (character.effects || []).reduce((total, effect) => total + Number(effect.priorityModifier || 0), 0);
  const contextual = /surpresa|embosc|preparad/.test(normalized) ? 3 : /pesad|cuidadosamente/.test(normalized) ? -2 : 0;
  return Number((stats.speed + (stats.initiative || 0) + stats.luck * 0.2 + effectPriority + (mentionedPower?.priority || 0) + contextual).toFixed(2));
}

export function calculateHit(attacker, defender, random = Math.random) {
  const attack = effectiveAttributes(attacker);
  const defense = defender ? effectiveAttributes(defender) : { speed: 8, perception: 8 };
  const chance = clamp(0.68 + (attack.speed + attack.perception - defense.speed - defense.perception) / 120, 0.2, 0.95);
  return { hit: random() <= chance, chance };
}

export function calculateDamage(attacker, defender, { base = 6, scaling = 'strength', magical = false } = {}, random = Math.random) {
  const attack = effectiveAttributes(attacker);
  const defense = defender ? effectiveAttributes(defender) : { resistance: 8, magic: 8, defense: 0 };
  const raw = base + (attack[scaling] || 0) * 0.8 + (attack.attack || 0);
  const mitigation = magical ? defense.magic * 0.15 : defense.resistance * 0.25 + (defense.defense || 0);
  const criticalChance = clamp(0.05 + attack.luck / 300, 0.05, 0.25);
  const critical = random() <= criticalChance;
  return { damage: Math.max(1, Math.round((raw - mitigation) * (critical ? 1.6 : 1))), critical };
}

function classify(text) {
  const value = fold(text);
  if (/\b(?:onipotent\w*|oniscient\w*|100\s*%\s*(?:de\s*)?(?:eficiencia|sucesso)|destruo?\s+(?:o\s+)?(?:universo|planeta|tudo)|mato\s+todos?\s+(?:instantaneamente|sem esforço)|sem\s+(?:custo|limite|risco))\b/.test(value)) return 'ABSURD';
  if (/\b(?:pocao|elixir|consumivel)\b/.test(value)) return 'ITEM';
  if (/\b(?:curar|curo|cura|cure|heal|healing|regenerar|regenero|regeneracao)\b/.test(value)) return 'HEAL';
  if (/\b(?:colet\w*|colho|colher|recolho|extrair|extraio|minero|minerar|forrage\w*|pego ervas|busco agua)\b/.test(value)) return 'GATHER';
  if (/\b(?:descans\w*|acampo|acampar|repouso|recupero o folego)\b/.test(value)) return 'REST';
  if (/\b(?:convers\w*|dialog\w*|negoci\w*|pergunto|falo com|interajo|interagir)\b/.test(value)) return 'INTERACT';
  if (/defend|prote|bloque|escudo/.test(value)) return 'DEFEND';
  if (/esquiv|desvi|rolamento/.test(value)) return 'DODGE';
  if (/magia|feitico|feitiço|fogo|gelo|raio|mana|encant/.test(value)) return 'MAGIC';
  if (/atac|golpe|soco|chute|corto|cortar|espada|flecha|tiro/.test(value)) return 'ATTACK';
  if (/corro|movo|vou ate|vou até|avanço|avanco|recuo|entro|saio/.test(value)) return 'MOVE';
  if (/observo|investigo|procuro|examino|percebo|localizo|localizar|rastreio/.test(value)) return 'OBSERVE';
  return 'CREATIVE';
}

function actionTarget(action, actors, worldEntities) {
  const text = fold(action.text);
  const mentioned = (name) => {
    const normalized = fold(name);
    if (text.includes(normalized)) return true;
    return normalized.split(/\s+/).filter((word) => word.length >= 4).some((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text));
  };
  const character = actors.find((candidate) => candidate.id !== action.characterId && candidate.status==='ALIVE' && mentioned(candidate.identity.name));
  if (character) return { kind: 'character', value: character };
  const entity = (worldEntities || []).find((candidate) => mentioned(candidate.name));
  return entity ? { kind: 'entity', value: entity } : null;
}

function namedTarget(text, candidates) {
  const normalizedText = fold(text);
  return (candidates || []).find((candidate) => {
    const name = fold(candidate.name);
    if (!name) return false;
    if (normalizedText.includes(name)) return true;
    return name.split(/\s+/).filter((word) => word.length >= 4).some((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(normalizedText));
  }) || null;
}

function gatheredItem(resource, actor, turnNumber) {
  return {
    id: newId(),
    name: resource.itemName || resource.name,
    description: cleanText(resource.itemDescription || `Material obtido em ${resource.name}.`, 300),
    type: resource.type || 'MATERIAL',
    quantity: 1,
    weight: Math.max(0, Number(resource.weight ?? 0.2)),
    rarity: cleanText(resource.rarity || 'COMMON', 30).toUpperCase(),
    value: Math.max(0, Number(resource.value ?? 4)),
    effects: [],
    attributes: {},
    metadata: { source: resource.name, gatheredBy: actor.id, turn: turnNumber },
  };
}

function event(turnNumber, type, sourceId, targetId, data) {
  return { id: newId(), turnNumber, type, sourceId, targetId: targetId || null, data, timestamp: nowIso() };
}

function spend(character, resource, amount) {
  if ((character.resources[resource] || 0) < amount) return false;
  character.resources[resource] -= amount;
  return true;
}

function checkAttributeFor(text, fallback='perception') {
  const value=fold(text);
  if (/convenc|persuad|negoci|engan|intimid|discurso|diplom/.test(value)) return 'charisma';
  if (/forc|arromb|ergu|empurr|quebr/.test(value)) return 'strength';
  if (/furtiv|silencio|esgueir|acrob|salto|rapido/.test(value)) return 'speed';
  if (/ritual|arcano|magico|runa|mana|ocult/.test(value)) return 'magic';
  if (/plano|constru|decifr|estud|analiso|engenh/.test(value)) return 'intelligence';
  if (/sorte|arris|aposto|improvis/.test(value)) return 'luck';
  return fallback;
}

export function resolveActionCheck(character, { text='', attribute='perception', danger=2, difficulty='normal', bonus=0 } = {}, random=Math.random) {
  const stats=effectiveAttributes(character);
  const key=attribute==='auto'?checkAttributeFor(text):attribute;
  const baseStat=Number(stats[key] ?? 10);
  const mastery=masteryBonus(character,key);
  const stat=baseStat+mastery;
  const luck=Number(stats.luck ?? 10);
  const hard=difficulty==='hard'?.09:0;
  const chance=clamp(.48+(stat-10)*.025+(luck-10)*.008+Number(bonus||0)*.018-Number(danger||0)*.035-hard,.16,.84);
  const roll=clamp(Number(random()),0,.999999);
  const critical=roll<=Math.max(.025,chance*.10);
  const partialLimit=Math.min(.96,chance+.18);
  const degree=critical?'critical_success':roll<=chance?'success':roll<=partialLimit?'partial':'failure';
  return {attribute:key,stat,baseStat,masteryBonus:mastery,chance:Number(chance.toFixed(3)),roll:Number(roll.toFixed(3)),degree,success:degree!=='failure'};
}

function applyDamageToTarget(target, amount) {
  if (!target) return { before: 0, after: 0 };
  if (target.resources) {
    const before = target.resources.hp;
    target.resources.hp = clamp(before - amount, 0, target.resources.maxHp);
    if (target.resources.hp === 0) target.status = 'DEAD';
    return { before, after: target.resources.hp };
  }
  const before = Number(target.hp || 0);
  target.hp = clamp(before - amount, 0, Number(target.maxHp || before));
  if (target.hp === 0) target.status = 'DEAD';
  return { before, after: target.hp };
}


function resolveEnemyInitiative(world, actors, events, turnNumber, random, settings = {}) {
  if (!settings.worldEventFrequency) return;
  if (world.introduction && !world.introduction.completed) return;
  const living = actors.filter((character) => character.status === 'ALIVE');
  if (!living.length) return;
  const damagedEnemies = new Set(events.filter((entry) => entry.type === 'DAMAGE' && living.some((character) => character.id === entry.sourceId)).map((entry) => entry.targetId));
  const danger = Number(world.ecosystem?.dangerLevel || 2);
  const frequencyBonus = settings.worldEventFrequency === 'high' ? .08 : settings.worldEventFrequency === 'chaotic' ? .14 : settings.worldEventFrequency === 'low' ? -.07 : 0;
  for (const enemy of (world.entities || []).filter((entry) => entry.status !== 'DEAD' && entry.hp > 0 && (!entry.location || entry.location === world.location))) {
    if (damagedEnemies.has(enemy.id)) continue; // ataques sofridos já usam a retaliação existente
    if (Number(enemy.spawnTurn || 0) >= turnNumber) continue; // encontro novo dá um turno para o grupo reagir
    const aggression = clamp(.22 + danger * .045 + (settings.difficulty === 'hard' ? .10 : 0) + frequencyBonus, .10, .62);
    if (random() > aggression) continue;
    const victim = living[Math.min(living.length - 1, Math.floor(random() * living.length))];
    const enemySpeed = Number(enemy.attributes?.speed || 8);
    const victimStats = effectiveAttributes(victim);
    const hitChance = clamp(.64 + (enemySpeed - victimStats.speed) / 110, .28, .90);
    if (random() > hitChance) {
      events.push(event(turnNumber, 'ENEMY_ACTED', enemy.id, victim.id, { enemy: enemy.name, target: victim.identity.name, hit: false, description: `${enemy.name} tomou a iniciativa contra ${victim.identity.name}, mas não conseguiu acertar.` }));
      continue;
    }
    const damage = Math.max(1, Math.round(5 + Number(enemy.attributes?.attack || 1) + danger * .8 - victimStats.resistance * .22 - Number(victimStats.defense || 0)));
    const hp = applyDamageToTarget(victim, damage);
    events.push(event(turnNumber, 'ENEMY_ACTED', enemy.id, victim.id, { enemy: enemy.name, target: victim.identity.name, hit: true, damage, description: `${enemy.name} agiu por conta própria e atingiu ${victim.identity.name}.` }));
    events.push(event(turnNumber, 'DAMAGE', enemy.id, victim.id, { amount: damage, before: hp.before, after: hp.after, hostileInitiative: true }));
    if (hp.after === 0) events.push(event(turnNumber, 'CHARACTER_DIED', enemy.id, victim.id, { name: victim.identity.name }));
  }
}

export function resolveMechanics({ campaign, characters, actions, turnNumber, random = () => crypto.randomInt(0, 16777216) / 16777216 }) {
  const actors = structuredClone(characters);
  for (const c of actors) { ensureProgression(c); c.cooldowns = Object.fromEntries(Object.entries(c.cooldowns).map(([k,v]) => [k,Math.max(0,v-1)])); }
  const world = structuredClone(campaign.world);
  world.entities ||= [];
  world.npcs ||= [];
  ensureEcosystem(world);
  const events = [];
  const outcomes = [];
  const ordered = actions.map((action) => {
    const actor = actors.find((candidate) => candidate.id === action.characterId);
    return { action, actor, priority: actor ? priorityScore(actor, action) : -999 };
  }).sort((a, b) => b.priority - a.priority || a.action.submittedAt.localeCompare(b.action.submittedAt));

  let group = 1;
  let previous = null;
  for (const entry of ordered) {
    if (previous !== null && previous - entry.priority > 2) group += 1;
    previous = entry.priority;
    const { action, actor } = entry;
    if (!actor || actor.status !== 'ALIVE') {
      outcomes.push({ actionId: action.id, characterId: action.characterId, priority: entry.priority, simultaneousGroup: group, success: false, summary: 'Não conseguiu agir.' });
      continue;
    }

    let type = classify(action.text);
    const power = [...actor.powers].sort((a,b)=>b.name.length-a.name.length).find(p => fold(action.text).includes(fold(p.name)));
    const abilityEffect = power?.effects?.[0];
    const unknownPower = !power && /(?:uso|utilizo|ativo|invoco)\s+(?:(?:minha|meu|a|o)\s+)?(?:habilidade|poder|teleport|parar o tempo|magia|feiti[cç]o|cura)/i.test(action.text);
    let blocked = '';
    if ((!power && /par[oa]r? o tempo|teleport|imortal|invenc[ií]vel|infinito/i.test(action.text)) || unknownPower || (!power && ['MAGIC','HEAL'].includes(type))) blocked = 'Habilidade não disponível na ficha. Escolha uma habilidade do painel.';
    if(power){
      if(actor.cooldowns[power.id]>0)blocked='Habilidade em recarga.';
      if(Object.entries(power.cost||{}).some(([k,v])=>!Number.isFinite(v)||v<0||actor.resources[k]<v))blocked='Recursos insuficientes para esta habilidade.';
      if(type !== 'ABSURD')type=abilityEffect?.type==='OBSERVE'?'OBSERVE':abilityEffect?.type==='HEAL'?'HEAL':abilityEffect?.type==='DEFEND'?'DEFEND':power.resource==='mana'?'MAGIC':'ATTACK';
    }
    if(world.introduction && !world.introduction.completed && ['ATTACK','MAGIC','HEAL','GATHER','ITEM'].includes(type))blocked='No limiar, converse com a entidade ou aceite a travessia.';
    const target = actionTarget(action, actors, world.entities.filter(e=>!e.location||e.location===world.location));
    let success = true;
    let summary = `${actor.identity.name} executou sua intenção.`;
    const details = { type };
    let skillSpent=false;

    if(blocked){success=false;summary=blocked;} else if (type === 'ABSURD') {
      success = false;
      summary = `${actor.identity.name} tentou algo que excede os limites estabelecidos da campanha; a tentativa não produz um efeito automático.`;
    } else if (type === 'DEFEND' || type === 'DODGE') {
      const effectName = type === 'DEFEND' ? 'DEFENDING' : 'EVADING';
      actor.effects.push({ id: newId(), name: effectName, duration: 2, attributeModifiers: type === 'DEFEND' ? { defense: 6 } : { speed: 5 }, priorityModifier: 0 });
      events.push(event(turnNumber, 'STATUS_APPLIED', actor.id, actor.id, { status: effectName, duration: 1 }));
      summary = `${actor.identity.name} assumiu uma postura de ${type === 'DEFEND' ? 'defesa' : 'esquiva'}.`;
    } else if (type === 'HEAL') {
      const cost = power?.cost?.mana || 7;
      if (!spend(actor, 'mana', cost)) {
        success = false;
        summary = `${actor.identity.name} tentou curar, mas não tinha mana suficiente.`;
      } else {
        const recipient = target?.kind === 'character' ? target.value : actor;
        const before = recipient.resources.hp;
        const stats = effectiveAttributes(actor);
        const skillMastery = power ? masteryRankFor(actor.skillMastery?.[power.id]?.xp||0).bonus : 0;
        recipient.resources.hp = clamp(before + (abilityEffect?.base || 10) + skillMastery * 2 + Math.round(stats.magic * 0.6), 0, recipient.resources.maxHp);
        events.push(event(turnNumber, 'HEAL', actor.id, recipient.id, { before, after: recipient.resources.hp, amount: recipient.resources.hp - before, manaCost: cost }));
        summary = `${recipient.identity.name} recuperou ${recipient.resources.hp - before} HP.`;
      }
    } else if (type === 'ITEM') {
      const item = actor.inventory.find((candidate) => candidate.quantity > 0 && candidate.type === 'CONSUMABLE' && candidate.effects?.some((effect) => ['HEAL','MANA','STAMINA'].includes(effect.type)));
      if (!item) {
        success = false;
        summary = `${actor.identity.name} procurou um consumível, mas não encontrou nenhum utilizável.`;
      } else {
        const effect = item.effects.find((entry) => ['HEAL','MANA','STAMINA'].includes(entry.type));
        const map = { HEAL:['hp','maxHp','HP'], MANA:['mana','maxMana','Mana'], STAMINA:['stamina','maxStamina','Stamina'] };
        const [resource,maxResource,label] = map[effect.type];
        const before = actor.resources[resource];
        actor.resources[resource] = clamp(before + Number(effect.value||0), 0, actor.resources[maxResource]);
        item.quantity -= 1;
        if (item.quantity <= 0) actor.inventory = actor.inventory.filter((candidate) => candidate.id !== item.id);
        events.push(event(turnNumber, 'ITEM_LOST', actor.id, actor.id, { item: item.name, quantity: 1 }));
        if(effect.type==='HEAL')events.push(event(turnNumber, 'HEAL', actor.id, actor.id, { before, after: actor.resources[resource], amount: actor.resources[resource] - before }));
        else events.push(event(turnNumber, 'STATUS_APPLIED', actor.id, actor.id, { resource, amount: actor.resources[resource] - before, source:item.name }));
        summary = `${actor.identity.name} usou ${item.name} e recuperou ${actor.resources[resource] - before} ${label}.`;
      }
    } else if (type === 'GATHER') {
      const resource = namedTarget(action.text, world.ecosystem.resources.filter((entry) => entry.quantity > 0))
        || world.ecosystem.resources.find((entry) => entry.quantity > 0);
      if (!resource) {
        success = false;
        summary = `${actor.identity.name} procurou recursos, mas a área precisa se regenerar antes de oferecer algo útil.`;
      } else {
        resource.quantity -= 1;
        if (resource.quantity === 0) resource.nextRespawnTurn = turnNumber + resource.respawnTurns;
        const item = gatheredItem(resource, actor, turnNumber);
        const existing = actor.inventory.find((entry) => entry.name === item.name && entry.type === item.type && entry.metadata?.source === resource.name);
        if (existing) existing.quantity += 1;
        else actor.inventory.push(item);
        events.push(event(turnNumber, 'RESOURCE_GATHERED', actor.id, resource.id, { resource: resource.name, remaining: resource.quantity }));
        events.push(event(turnNumber, 'ITEM_GAINED', actor.id, actor.id, { item: item.name, quantity: 1, source: resource.name }));
        summary = `${actor.identity.name} coletou ${item.name}. Restam ${resource.quantity} porções visíveis na área.`;
        details.item = item.name;
      }
    } else if (type === 'REST') {
      const safe = world.ecosystem.dangerLevel <= 2;
      const staminaBefore = actor.resources.stamina;
      const manaBefore = actor.resources.mana;
      const staminaGain = safe ? 14 : 6;
      const manaGain = safe ? 7 : 2;
      actor.resources.stamina = clamp(staminaBefore + staminaGain, 0, actor.resources.maxStamina);
      actor.resources.mana = clamp(manaBefore + manaGain, 0, actor.resources.maxMana);
      const recovered = [
        actor.resources.stamina - staminaBefore > 0 ? `${actor.resources.stamina - staminaBefore} Stamina` : '',
        actor.resources.mana - manaBefore > 0 ? `${actor.resources.mana - manaBefore} Mana` : '',
      ].filter(Boolean).join(' e ');
      events.push(event(turnNumber, 'RESTED', actor.id, actor.id, {
        safe, stamina: actor.resources.stamina - staminaBefore, mana: actor.resources.mana - manaBefore,
      }));
      summary = safe
        ? recovered ? `${actor.identity.name} descansou em segurança e recuperou ${recovered}.` : `${actor.identity.name} descansou em segurança, mas já estava com os recursos restaurados.`
        : recovered ? `${actor.identity.name} descansou com cautela em uma área perigosa e recuperou apenas ${recovered}.` : `${actor.identity.name} descansou com cautela, mas já estava com os recursos restaurados.`;
    } else if (type === 'INTERACT') {
      const npc = namedTarget(action.text, world.npcs.filter(n=>!n.location||n.location===world.location));
      if (!npc) {
        success=false;
        summary = `${actor.identity.name} buscou diálogo, mas ninguém conhecido respondeu de imediato.`;
      } else {
        const check=resolveActionCheck(actor,{text:action.text,attribute:'charisma',danger:Number(world.ecosystem?.dangerLevel||1),difficulty:campaign.settings.difficulty},random);
        details.check=check; events.push(event(turnNumber,'ACTION_CHECKED',actor.id,npc.id,check));
        npc.relationships ||= {};
        const before = clamp(Number(npc.relationships[actor.id] || 0), -100, 100);
        const delta=check.degree==='critical_success'?3:check.degree==='success'?2:check.degree==='partial'?1:-2;
        npc.relationships[actor.id] = clamp(before + delta, -100, 100);
        success=check.success;
        events.push(event(turnNumber, 'NPC_RELATION_CHANGED', actor.id, npc.id, { npc: npc.name, before, after: npc.relationships[actor.id], degree:check.degree, description:`A relação de ${npc.name} com ${actor.identity.name} mudou de ${before} para ${npc.relationships[actor.id]}.` }));
        if(check.degree==='failure')events.push(event(turnNumber,'COMPLICATION',actor.id,npc.id,{description:`A abordagem de ${actor.identity.name} criou atrito com ${npc.name}.`}));
        summary = check.degree==='partial' ? `${actor.identity.name} conseguiu avançar a conversa com ${npc.name}, mas com reservas.` : check.success ? `${actor.identity.name} teve uma abordagem ${check.degree==='critical_success'?'excepcionalmente ':''}eficaz com ${npc.name}.` : `${npc.name} reagiu mal à abordagem de ${actor.identity.name}.`;
      }
    } else if (type === 'ATTACK' || type === 'MAGIC') {
      const magical = type === 'MAGIC';
      const costResource = power?.resource || (magical ? 'mana' : 'stamina');
      const cost = power?.cost?.[costResource] || (magical ? 9 : 5);
      if (!target || (target.kind==='entity' && (target.value.status==='DEAD'||target.value.hp<=0))) {
        success=false;summary='Não há um alvo vivo reconhecido.';
      } else if(target.kind==='character' && !campaign.settings.allowPvp){
        success=false;summary='PvP desativado: nenhum recurso ou dano aplicado.';
      } else if(!spend(actor,costResource,cost)){
        success=false;summary='Recursos insuficientes.';
      } else {
        skillSpent=Boolean(power);
        const defender = target.kind === 'character' ? target.value : { attributes: {speed:8,perception:8,resistance:8,magic:8,defense:0,...target.value.attributes},inventory:[],equipment:{},effects:[] };
        const hit = calculateHit(actor, defender, random);
        let roll=null;
        if(campaign.settings.experimentalDice){
          const die=Math.floor(random()*20)+1;const bonus=Math.floor((effectiveAttributes(actor)[abilityEffect?.scaling||'strength']-10)/2);const difficulty=12+(campaign.settings.difficulty==='hard'?3:0);
          roll={die,bonus,total:die+bonus,difficulty,critical:die===20,fumble:die===1};hit.hit=die===20||(die!==1&&roll.total>=difficulty);roll.success=hit.hit;details.roll=roll;events.push(event(turnNumber,'DICE_ROLLED',actor.id,target.value.id,roll));
        }
        if (!hit.hit) {
          success = false;
          summary = `${actor.identity.name} errou ${magical ? 'a magia' : 'o ataque'} contra ${target.value.name || target.value.identity.name}.`;
        } else {
          const skillMastery = power ? masteryRankFor(actor.skillMastery?.[power.id]?.xp||0).bonus : 0;
          const calculated = calculateDamage(actor, defender, { base: (abilityEffect?.base || (magical ? 9 : 6)) + skillMastery * 2, scaling: abilityEffect?.scaling || (magical ? 'magic' : 'strength'), magical }, random);
          if(roll){if(calculated.critical)calculated.damage=Math.max(1,Math.round(calculated.damage/1.6));calculated.critical=roll.critical;if(roll.critical)calculated.damage=Math.round(calculated.damage*1.6);}
          const hp = applyDamageToTarget(target.value, calculated.damage);
          const targetName = target.value.name || target.value.identity.name;
          events.push(event(turnNumber, 'DAMAGE', actor.id, target.value.id, { amount: calculated.damage, before: hp.before, after: hp.after, magical, critical: calculated.critical }));
          if (hp.after === 0) events.push(event(turnNumber, 'CHARACTER_DIED', actor.id, target.value.id, { name: targetName }));
          summary = `${actor.identity.name} causou ${calculated.damage} de dano${calculated.critical ? ' crítico' : ''} em ${targetName}.`;
          details.damage = calculated.damage;
          details.critical = calculated.critical;
        }
      }
    } else if (type === 'MOVE') {
      const destination = cleanText(action.text.replace(/^.*?(?:até|para|entro em|vou a)\s+/i, ''), 80);
      summary = `${actor.identity.name} propõe deslocamento. Viagens exigem destino conectado e concordância do grupo.`;
    } else if (type === 'OBSERVE') {
      if(power)for(const[k,v]of Object.entries(power.cost))actor.resources[k]-=v;
      const check=resolveActionCheck(actor,{text:action.text,attribute:'perception',danger:Number(world.ecosystem?.dangerLevel||1),difficulty:campaign.settings.difficulty,bonus:abilityEffect?.base||0},random);
      details.check=check; success=check.success; events.push(event(turnNumber,'ACTION_CHECKED',actor.id,actor.id,check));
      const discovery=check.degree==='critical_success'?'Percebeu uma pista importante e um detalhe adicional.':check.degree==='success'?'Percebeu um detalhe útil no ambiente.':check.degree==='partial'?'Percebeu uma pista incompleta, suficiente para orientar a próxima decisão.':'Examinou o ambiente, mas não conseguiu separar pistas confiáveis do ruído.';
      if(check.success)events.push(event(turnNumber, 'DISCOVERY', actor.id, actor.id, { degree:check.degree, discovery, description:discovery }));
      else events.push(event(turnNumber,'COMPLICATION',actor.id,actor.id,{description:'A investigação não revelou informação confiável e consumiu tempo.'}));
      summary = `${actor.identity.name}: ${discovery}`;
    } else {
      const check=resolveActionCheck(actor,{text:action.text,attribute:'auto',danger:Number(world.ecosystem?.dangerLevel||2),difficulty:campaign.settings.difficulty},random);
      details.check=check; success=check.success; events.push(event(turnNumber,'ACTION_CHECKED',actor.id,target?.value?.id,check));
      if(check.degree==='critical_success')summary=`${actor.identity.name} executou a tentativa com resultado excepcional.`;
      else if(check.degree==='success')summary=`${actor.identity.name} conseguiu realizar a intenção.`;
      else if(check.degree==='partial'){summary=`${actor.identity.name} conseguiu apenas parte do que pretendia e abriu espaço para uma consequência.`;events.push(event(turnNumber,'COMPLICATION',actor.id,target?.value?.id,{description:'Sucesso parcial: o objetivo avançou, mas surgiu um custo, risco ou escolha difícil.'}));}
      else {summary=`${actor.identity.name} tentou “${cleanText(action.text,180)}”, mas a tentativa falhou pelas condições da cena.`;events.push(event(turnNumber,'COMPLICATION',actor.id,target?.value?.id,{description:'A tentativa falhou sem conceder automaticamente o efeito pedido.'}));}
    }

    if(power && !blocked && type!=='ABSURD' && (success||skillSpent)){
      if(type==='DEFEND')for(const[k,v]of Object.entries(power.cost))actor.resources[k]-=v;
      actor.cooldowns[power.id]=(power.cooldown||0)+1;
      const skillGain=gainSkillMastery(actor,power.id,success?14:7);
      events.push(event(turnNumber,'POWER_USED',actor.id,actor.id,{skillId:power.id,cost:power.cost,masteryXp:skillGain.xp,masteryRank:skillGain.after.name}));
      events.push(event(turnNumber,'SKILL_MASTERY_GAINED',actor.id,actor.id,{skillId:power.id,name:power.name,xp:skillGain.xp,rank:skillGain.after.name}));
      if(skillGain.rankUp)events.push(event(turnNumber,'SKILL_MASTERY_RANK_UP',actor.id,actor.id,{skillId:power.id,name:power.name,rank:skillGain.after.name,description:`${power.name} alcançou maestria ${skillGain.after.name}.`}));
    }
    const masteryKey=details.check?.attribute || abilityEffect?.scaling || (type==='ATTACK'?'strength':type==='MAGIC'||type==='HEAL'?'magic':type==='DEFEND'?'resistance':type==='DODGE'?'speed':type==='GATHER'?'perception':type==='INTERACT'?'charisma':null);
    if(masteryKey&&actor.masteries?.[masteryKey]){
      const masteryGain=gainAttributeMastery(actor,masteryKey,success?10:5);
      events.push(event(turnNumber,'ATTRIBUTE_MASTERY_GAINED',actor.id,actor.id,{attribute:masteryKey,xp:masteryGain.xp,rank:masteryGain.after.name}));
      if(masteryGain.rankUp)events.push(event(turnNumber,'ATTRIBUTE_MASTERY_RANK_UP',actor.id,actor.id,{attribute:masteryKey,rank:masteryGain.after.name,description:`${actor.identity.name} alcançou maestria ${masteryGain.after.name} em ${masteryKey}.`}));
    }
    events.push(event(turnNumber, 'ACTION_RESOLVED', actor.id, target?.value?.id, { actionId: action.id, success, type, summary }));
    outcomes.push({ actionId: action.id, characterId: actor.id, priority: entry.priority, simultaneousGroup: group, success, summary, details });
  }

  for (const character of actors) {
    character.effects = (character.effects || []).map((effect) => ({ ...effect, duration: Number(effect.duration || 0) - 1 })).filter((effect) => effect.duration > 0);
    character.updatedAt = nowIso();
  }

  if(!world.introduction||world.introduction.completed){
    for(const enemy of world.entities.filter(e=>e.status!=='DEAD'&&e.hp>0&&(!e.location||e.location===world.location))){
      const aggressors=actors.filter(c=>c.status==='ALIVE'&&events.some(e=>e.type==='DAMAGE'&&e.sourceId===c.id&&e.targetId===enemy.id));
      const victim=aggressors[0];if(!victim)continue;
      const damage=Math.max(1,Math.round((campaign.settings.difficulty==='hard'?11:8)+(enemy.attributes?.attack||0)-effectiveAttributes(victim).resistance*.25-(effectiveAttributes(victim).defense||0)));
      const hp=applyDamageToTarget(victim,damage);events.push(event(turnNumber,'DAMAGE',enemy.id,victim.id,{amount:damage,...hp,retaliation:true}));
    }
  }
  resolveEnemyInitiative(world, actors, events, turnNumber, random, campaign.settings || {});
  progressWorld(world,actors,actions,events,turnNumber,{random,settings:campaign.settings||{}});
  for(const c of actors){
    const outcome=outcomes.find(o=>o.characterId===c.id);const questXp=events.filter(e=>e.type==='QUEST_COMPLETED').reduce((n,e)=>n+(e.data.rewardXp||0),0);
    const earned=(outcome?.success? (campaign.settings.progressionSpeed==='fast'?20:10):0)+questXp;
    if(questXp&&!c.powers.some(p=>p.id==='echo-sense')){c.powers.push(structuredClone(STORY_SKILLS[0]));events.push(event(turnNumber,'SKILL_UNLOCKED',c.id,c.id,{skillId:'echo-sense',name:'Sentido dos Ecos'}));}
    if(earned){const levels=grantXp(c,earned);events.push(event(turnNumber,'XP_GAINED',c.id,c.id,{amount:earned,levels}));}
    c.downtimePoints=Math.min(3,Number(c.downtimePoints||0)+1);
  }
  if(!world.introduction||world.introduction.completed)advanceEcosystem(world, turnNumber, events);
  updateBestiaryKnowledge(world, events, turnNumber);

  return { characters: actors, world, outcomes, events, order: ordered.map((entry) => entry.action.id) };
}

export function sanitizeAiDirectives(raw) {
 const empty={narrative:'',summary:'',worldUpdates:{},characterUpdates:[],events:[],memoryUpdates:{factsAdd:[],factsClose:[]}};
 if(!raw||typeof raw!=='object'||typeof raw.narrative!=='string'||!raw.narrative.trim())return empty;
 const memory=raw.memory_updates||raw.memoryUpdates||{};
 return {...empty,narrative:cleanText(raw.narrative,30000),summary:cleanText(typeof raw.summary==='string'?raw.summary:'',2500),memoryUpdates:{
   factsAdd:(Array.isArray(memory.facts_add||memory.factsAdd)?(memory.facts_add||memory.factsAdd):[]).slice(0,12).filter(f=>f&&typeof f.text==='string').map(f=>({category:cleanText(f.category||'NARRATIVE_NOTE',40).toUpperCase(),text:cleanText(f.text,300),importance:clamp(f.importance,1,5),truthStatus:['FACT','CLAIM','RUMOR','HYPOTHESIS'].includes(cleanText(f.truth_status||f.truthStatus,20).toUpperCase())?cleanText(f.truth_status||f.truthStatus,20).toUpperCase():'FACT',source:cleanText(f.source||'narrator',120)})),
   factsClose:[]
 }};
}
