import { cleanText, newId } from '../core/utils.js';

export const EVENT_SCOPES = Object.freeze(['PERSONAL', 'LOCAL', 'NEARBY', 'REGIONAL', 'GLOBAL']);

const PERSONAL_TYPES = new Set([
  'ACTION_CHECKED', 'ATTRIBUTE_MASTERY_GAINED', 'ATTRIBUTE_MASTERY_RANK_UP',
  'SKILL_MASTERY_GAINED', 'SKILL_MASTERY_RANK_UP', 'POWER_USED', 'XP_GAINED',
  'NPC_RELATION_CHANGED',
]);
const NEARBY_TYPES = new Set(['CHARACTER_MOVED', 'TRAVEL_PROGRESS', 'TRAVEL_BLOCKED', 'ENCOUNTER_STARTED']);
const REGIONAL_TYPES = new Set(['WORLD_CLOCK_COMPLETED']);

function fold(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function nodeFor(world, location) {
  return (world.atlas?.nodes || []).find((node) => node.id === location || node.name === location) || null;
}

function routeFor(world, routeId) {
  return (world.atlas?.routes || []).find((route) => route.id === routeId) || null;
}

function reverseDirection(direction = '') {
  return ({ norte:'sul', sul:'norte', leste:'oeste', oeste:'leste', nordeste:'sudoeste', noroeste:'sudeste', sudeste:'noroeste', sudoeste:'nordeste' })[fold(direction)] || direction;
}

export function spatialState(world, actor = {}) {
  const travel = actor.travel && routeFor(world, actor.travel.routeId) ? actor.travel : null;
  if (travel) {
    const route = routeFor(world, travel.routeId);
    const fromStart = travel.fromId === route.from ? Number(travel.progressKm || 0) : Number(route.distance || 0) - Number(travel.progressKm || 0);
    return {
      kind: 'ROUTE', routeId: route.id, fromId: travel.fromId, toId: travel.toId,
      progressKm: Number(travel.progressKm || 0), absoluteKm: Number(fromStart.toFixed(3)),
      distanceKm: Number(route.distance || 0), zone: actor.zone || `trecho-${Math.floor(fromStart * 2)}`,
    };
  }
  const node = nodeFor(world, actor.locationId || actor.location || actor.position || world.location);
  return { kind:'NODE', nodeId:node?.id || null, location:node?.name || actor.location || actor.position || world.location, zone:actor.zone || 'centro' };
}

function spatialKey(world, actor) {
  const spatial = spatialState(world, actor);
  if (spatial.kind === 'ROUTE') return `route:${spatial.routeId}:${spatial.zone}`;
  return `node:${spatial.nodeId || fold(spatial.location)}:${spatial.zone}`;
}

function regionOf(world, actor) {
  const spatial = spatialState(world, actor);
  if (spatial.kind === 'NODE') return nodeFor(world, spatial.nodeId || spatial.location)?.region || '';
  const route = routeFor(world, spatial.routeId);
  return nodeFor(world, route?.from)?.region || nodeFor(world, route?.to)?.region || '';
}

function distanceBetween(world, left, right) {
  const a = spatialState(world, left); const b = spatialState(world, right);
  if (a.kind === 'NODE' && b.kind === 'NODE') {
    if (a.nodeId === b.nodeId && a.zone === b.zone) return 0;
    if (a.nodeId === b.nodeId) return .25;
    const route = (world.atlas?.routes || []).find((item) => [item.from,item.to].includes(a.nodeId) && [item.from,item.to].includes(b.nodeId));
    return route ? Number(route.distance || 999) : Infinity;
  }
  if (a.kind === 'ROUTE' && b.kind === 'ROUTE' && a.routeId === b.routeId) return Math.abs(a.absoluteKm - b.absoluteKm);
  const routeState = a.kind === 'ROUTE' ? a : b.kind === 'ROUTE' ? b : null;
  const nodeState = a.kind === 'NODE' ? a : b.kind === 'NODE' ? b : null;
  if (routeState && nodeState) {
    const route = routeFor(world, routeState.routeId);
    if (nodeState.nodeId === route?.from) return routeState.absoluteKm;
    if (nodeState.nodeId === route?.to) return Math.max(0, Number(route.distance || 0) - routeState.absoluteKm);
  }
  return Infinity;
}

function eventScope(event) {
  const explicit = String(event.scope || event.visibilityScope || event.data?.scope || '').toUpperCase();
  if (EVENT_SCOPES.includes(explicit)) return explicit;
  if (event.visibility === 'PRIVATE' || event.privateUserId || event.data?.privateCharacterId || PERSONAL_TYPES.has(event.type)) return 'PERSONAL';
  if (event.type === 'WORLD_EVENT' && event.data?.global) return 'GLOBAL';
  if (REGIONAL_TYPES.has(event.type)) return 'REGIONAL';
  if (NEARBY_TYPES.has(event.type)) return 'NEARBY';
  return 'LOCAL';
}

function sourceActor(world, characters, event) {
  return characters.find((character) => character.id === event.sourceId)
    || (world.entities || []).find((entity) => entity.id === event.sourceId)
    || (world.npcs || []).find((npc) => npc.id === event.sourceId)
    || { locationId:event.locationId || event.data?.locationId, location:event.location || event.data?.location || world.location, zone:event.zone || event.data?.zone, travel:event.data?.spatial?.kind === 'ROUTE' ? event.data.spatial : null };
}

function recipientsForEvent(world, characters, event, userByCharacter = {}) {
  const scope = event.scope;
  if (scope === 'PERSONAL') {
    const ids = new Set([event.data?.privateCharacterId, event.sourceId, event.targetId].filter((id) => characters.some((character) => character.id === id)));
    if (event.privateUserId) for (const [characterId,userId] of Object.entries(userByCharacter)) if (userId === event.privateUserId) ids.add(characterId);
    return [...ids];
  }
  const origin = sourceActor(world, characters, event);
  if (scope === 'GLOBAL') return characters.filter((character) => character.status === 'ALIVE').map((character) => character.id);
  if (scope === 'REGIONAL') return characters.filter((character) => character.status === 'ALIVE' && regionOf(world, character) === regionOf(world, origin)).map((character) => character.id);
  if (scope === 'LOCAL') return characters.filter((character) => character.status === 'ALIVE' && spatialKey(world, character) === spatialKey(world, origin)).map((character) => character.id);
  const limit = scope === 'NEARBY' ? Number(event.radiusKm || event.data?.radiusKm || .8) : .3;
  return characters.filter((character) => character.status === 'ALIVE' && distanceBetween(world, origin, character) <= limit).map((character) => character.id);
}

function canonicalDescription(event) {
  return cleanText(event.canonicalFact || event.data?.canonicalFact || event.data?.description || event.data?.summary || event.type, 900);
}

export function canonicalizeEvents(world, characters, events, turnNumber, userByCharacter = {}) {
  for (const character of characters) {
    const spatial = spatialState(world, character);
    character.locationId = spatial.kind === 'NODE' ? spatial.nodeId : character.locationId || null;
    character.spatial = spatial;
  }
  const entities = [...(world.entities || []), ...(world.npcs || [])];
  for (const entity of entities) {
    const spatial = spatialState(world, entity);
    entity.locationId = spatial.kind === 'NODE' ? spatial.nodeId : entity.locationId || null;
    entity.spatial = spatial;
    entity.currentScene = spatialKey(world, entity);
    const action = [...events].reverse().find((event) => event.sourceId === entity.id && ['ENEMY_ACTED','CHARACTER_MOVED','DAMAGE','HEAL'].includes(event.type));
    if (action) entity.lastAction = { turn:turnNumber, eventId:action.id, type:action.type, targetId:action.targetId || null };
  }
  return events.map((original) => {
    const event = original;
    event.id ||= newId(); event.eventId = event.id; event.turnNumber ||= turnNumber;
    event.scope = eventScope(event);
    event.canonicalFact = canonicalDescription(event);
    event.spatial = spatialState(world, sourceActor(world, characters, event));
    event.observerCharacterIds = recipientsForEvent(world, characters, event, userByCharacter);
    return event;
  });
}

export function buildSceneProjection(world, characters, events, turnNumber, userByCharacter = {}) {
  const canonicalEvents = canonicalizeEvents(world, characters, events, turnNumber, userByCharacter);
  const groups = new Map(); const membership = {};
  for (const character of characters.filter((item) => item.status === 'ALIVE')) {
    const key = spatialKey(world, character);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(character);
  }
  const scenes = [...groups.entries()].map(([key, participants]) => {
    const spatial = spatialState(world, participants[0]);
    const sceneId = `scene_${fold(key).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
    for (const participant of participants) membership[participant.id] = sceneId;
    const visibleEvents = canonicalEvents.filter((event) => event.observerCharacterIds.some((id) => participants.some((character) => character.id === id)));
    return {
      sceneId, key, turn:turnNumber, spatial,
      locationId:spatial.nodeId || null,
      location:spatial.location || (routeFor(world, spatial.routeId)?.terrain || 'Em viagem'),
      region:regionOf(world, participants[0]),
      participantCharacterIds:participants.map((character) => character.id),
      participantUserIds:participants.map((character) => userByCharacter[character.id]).filter(Boolean),
      visibleEventIds:visibleEvents.map((event) => event.id),
    };
  });
  world.activeScenes = Object.fromEntries(scenes.map((scene) => [scene.sceneId, scene]));
  return { turnNumber, scenes, membership, canonicalEvents };
}

export function propagateSharedKnowledge(world, characters, projection) {
  for (const event of projection.canonicalEvents.filter((item) => item.type === 'DISCOVERY' && item.scope !== 'PERSONAL')) {
    for (const character of characters.filter((item) => event.observerCharacterIds.includes(item.id))) {
      character.knownLocationIds = Array.isArray(character.knownLocationIds) ? character.knownLocationIds : [];
      character.knownFacts = Array.isArray(character.knownFacts) ? character.knownFacts : [];
      if (event.data?.locationId && !character.knownLocationIds.includes(event.data.locationId)) character.knownLocationIds.push(event.data.locationId);
      if (event.canonicalFact && !character.knownFacts.some((fact) => (fact.text || fact) === event.canonicalFact)) character.knownFacts.push({ turn:event.turnNumber, eventId:event.id, text:event.canonicalFact });
    }
  }
}

export function relevantGeography(world, scene) {
  const atlas = world.atlas || { nodes:[], routes:[] };
  const nodeId = scene.spatial?.nodeId;
  if (!nodeId) {
    const route = routeFor(world, scene.spatial?.routeId);
    return route ? [{ routeId:route.id, direction:scene.spatial.fromId === route.from ? route.direction : reverseDirection(route.direction), distanceKm:route.distance, progressKm:scene.spatial.progressKm, terrain:route.terrain, river:route.river || null, bridge:route.bridge || null, obstacles:route.obstacles || [] }] : [];
  }
  return (atlas.routes || []).filter((route) => route.from === nodeId || route.to === nodeId).map((route) => {
    const destinationId = route.from === nodeId ? route.to : route.from;
    const destination = nodeFor(world, destinationId);
    return { routeId:route.id, direction:route.from === nodeId ? route.direction : reverseDirection(route.direction), destinationId, destination:destination?.name || destinationId, distanceKm:route.distance, terrain:route.terrain, road:Boolean(route.road), river:route.river || null, bridge:route.bridge || null, blocked:Boolean(route.blocked), obstacles:route.obstacles || [], requirements:route.requirements || [] };
  });
}

export function visibleEventsForCharacter(projection, characterId) {
  return projection.canonicalEvents.filter((event) => event.observerCharacterIds.includes(characterId));
}
