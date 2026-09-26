import { cleanText, newId, nowIso } from '../core/utils.js';

export function createCampaignMemory(description = '', worldRules = '') {
  const canon = [cleanText(description, 2_000), cleanText(worldRules, 3_000)].filter(Boolean);
  return {
    version: 1,
    canon,
    grandSummary: '',
    chapters: [],
    recentSummaries: [],
    facts: [],
    npcMemories: {},
    lastUpdatedAt: nowIso(),
  };
}

export function ensureCampaignMemory(campaign) {
  if (!campaign.memory || typeof campaign.memory !== 'object') campaign.memory = createCampaignMemory(campaign.description, campaign.settings?.worldRules);
  campaign.memory.version ||= 1;
  campaign.memory.canon = Array.isArray(campaign.memory.canon) ? campaign.memory.canon : [campaign.description].filter(Boolean);
  campaign.memory.grandSummary ||= '';
  campaign.memory.chapters = Array.isArray(campaign.memory.chapters) ? campaign.memory.chapters : [];
  campaign.memory.recentSummaries = Array.isArray(campaign.memory.recentSummaries) ? campaign.memory.recentSummaries : [];
  campaign.memory.facts = Array.isArray(campaign.memory.facts) ? campaign.memory.facts : [];
  campaign.memory.npcMemories = campaign.memory.npcMemories && typeof campaign.memory.npcMemories === 'object' ? campaign.memory.npcMemories : {};
  for (const npc of campaign.world?.npcs || []) {
    const record = campaign.memory.npcMemories[npc.id] ||= {
      name: cleanText(npc.name, 100), privatePersonality: cleanText(npc.personality || npc.privateProfile?.personality || 'Personalidade ainda não definida.', 800),
      privateGoals: cleanText(npc.privateProfile?.goals || '', 800), facts: [], interactions: [], updatedAt: nowIso(),
    };
    record.name ||= cleanText(npc.name, 100);
    record.privatePersonality ||= cleanText(npc.personality || 'Personalidade ainda não definida.', 800);
    record.facts = Array.isArray(record.facts) ? record.facts : [];
    record.interactions = Array.isArray(record.interactions) ? record.interactions : [];
  }
  return campaign.memory;
}

export function memoryContext(campaign, actions = []) {
  const memory = ensureCampaignMemory(campaign);
  const text=actions.map(a=>a.text).join(' ').toLocaleLowerCase();
  const relevant=(campaign.world?.npcs||[]).filter(n=>!n.location||n.location===campaign.world.location||text.includes(n.name.toLocaleLowerCase()));
  const ids=new Set(relevant.map(n=>n.id));
  const terms=text.split(/\W+/).filter(t=>t.length>4).slice(0,30);
  const score=f=>(f.importance||0)+terms.filter(t=>f.text.toLocaleLowerCase().includes(t)).length*3;
  return {
    canon: memory.canon.map(x=>cleanText(x,3000)).slice(0,3), grand_summary:cleanText(memory.grandSummary,3000),
    recent_chapters: memory.chapters.slice(-2).map(c=>({...c,summary:cleanText(c.summary,1500)})),
    recent_turns:memory.recentSummaries.slice(-3).map(t=>({...t,summary:cleanText(t.summary,800)})),
    active_facts:memory.facts.filter(f=>f.active!==false).sort((a,b)=>score(b)-score(a)).slice(0,24),
    private_npc_memory:Object.entries(memory.npcMemories).filter(([id])=>ids.has(id)).slice(0,6).map(([id,n])=>({npc_id:id,name:n.name,private_personality:n.privatePersonality,private_goals:n.privateGoals,
      durable_facts:n.facts.slice(-8),promises:n.promises||[],recent_interactions:n.interactions.slice(-5),
      relevant_old_interactions:(n.archive||[]).filter(i=>terms.some(t=>i.text.toLocaleLowerCase().includes(t))).slice(-4),
      knowledge:relevant.find(x=>x.id===id)?.knowledge||[],secrets:relevant.find(x=>x.id===id)?.secrets||[]
    })),
  };
}

function eventFacts(events, turnNumber) {
  const persistent = new Set(['CHARACTER_DIED', 'ITEM_GAINED', 'ITEM_LOST', 'QUEST_STARTED', 'QUEST_COMPLETED', 'DISCOVERY', 'RESOURCE_GATHERED', 'NPC_RELATION_CHANGED', 'NPC_ARRIVED', 'ENCOUNTER_STARTED', 'STORY_THREAD_STARTED', 'WORLD_EVENT', 'WORLD_CLOCK_COMPLETED']);
  return events.filter((event) => persistent.has(event.type)).map((event) => ({
    id: newId(), category: event.type, text: cleanText(event.data?.description || event.data?.name || event.data?.item || event.data?.resource || event.data?.npc || JSON.stringify(event.data || {}), 300),
    turn: turnNumber, importance: event.type === 'CHARACTER_DIED' || event.type.startsWith('QUEST_') || event.type === 'WORLD_CLOCK_COMPLETED' ? 5 : 3, truthStatus:'FACT', source:'server-event', active: true, createdAt: nowIso(),
  })).filter((fact) => fact.text);
}

export function advanceCampaignMemory(campaign, { turnNumber, summary, memoryUpdates = {}, events = [], actions = [] }) {
  const memory = ensureCampaignMemory(campaign);
  memory.archive ||= [];
  const cleanSummary = cleanText(summary, 2_000);
  memory.recentSummaries.push({ turn: turnNumber, summary: cleanSummary });

  while (memory.recentSummaries.length > 5) {
    const chunk = memory.recentSummaries.splice(0, Math.min(5, memory.recentSummaries.length - 1));
    memory.chapters.push({
      fromTurn: chunk[0].turn,
      toTurn: chunk.at(-1).turn,
      summary: cleanText(chunk.map((item) => `T${item.turn}: ${item.summary}`).join(' '), 3_500),
    });
  }
  while (memory.chapters.length > 10) {
    const old = memory.chapters.splice(0, 3);
    memory.archive.push(...old);
    memory.grandSummary = [memory.grandSummary, ...old.map(chapter=>`Turnos ${chapter.fromTurn}-${chapter.toTurn}: ${chapter.summary}`)].filter(Boolean).join(' ').slice(-7000);
  }

  const aiFacts = (Array.isArray(memoryUpdates.factsAdd) ? memoryUpdates.factsAdd : []).slice(0, 20).map((fact) => ({
    id: newId(), category: cleanText(fact.category || 'STORY', 40).toUpperCase(), text: cleanText(fact.text, 300),
    turn: turnNumber, importance: Math.max(1, Math.min(5, Number(fact.importance) || 2)), truthStatus:['FACT','CLAIM','RUMOR','HYPOTHESIS'].includes(String(fact.truthStatus||'').toUpperCase())?String(fact.truthStatus).toUpperCase():'FACT', source:cleanText(fact.source||'narrator',120), active: true, createdAt: nowIso(),
  })).filter((fact) => fact.text);
  const candidates = [...eventFacts(events, turnNumber), ...aiFacts];
  for (const fact of candidates) {
    const normalized = fact.text.toLocaleLowerCase('pt-BR');
    if (!memory.facts.some((existing) => existing.active !== false && existing.text.toLocaleLowerCase('pt-BR') === normalized)) memory.facts.push(fact);
  }
  for (const closeText of (Array.isArray(memoryUpdates.factsClose) ? memoryUpdates.factsClose : []).slice(0, 20)) {
    const needle = cleanText(closeText, 300).toLocaleLowerCase('pt-BR');
    const fact = memory.facts.find((item) => item.active !== false && item.text.toLocaleLowerCase('pt-BR').includes(needle));
    if (fact) fact.active = false;
  }
  for (const npc of campaign.world?.npcs || []) {
    const record = memory.npcMemories[npc.id];
    if (!record) continue;
    const npcName = cleanText(npc.name, 100).toLocaleLowerCase('pt-BR');
    const references = actions.filter(action => (!npc.location||npc.location===campaign.world.location) && (cleanText(action.text,2000).toLocaleLowerCase('pt-BR').includes(npcName)||events.some(e=>e.targetId===npc.id&&e.sourceId===action.characterId)));
    for (const action of references.slice(-4)) {
      record.interactions.push({ turn: turnNumber, characterId: action.characterId, text: cleanText(action.text, 500), createdAt: nowIso() });
    }
    const related = events.filter((event) => event.type === 'NPC_RELATION_CHANGED' && (event.targetId === npc.id || event.sourceId === npc.id));
    for (const event of related.slice(-4)) {
      const text = cleanText(event.data?.description || event.data?.fact || JSON.stringify(event.data || {}), 400);
      if (text && !record.facts.includes(text)) record.facts.push(text);
    }
    record.archive ||= [];
    if(record.interactions.length>20)record.archive.push(...record.interactions.splice(0,record.interactions.length-20));
    record.lastInteraction=references.length?turnNumber:record.lastInteraction;
    record.updatedAt = nowIso();
  }
  memory.lastUpdatedAt = nowIso();
  return memory;
}
