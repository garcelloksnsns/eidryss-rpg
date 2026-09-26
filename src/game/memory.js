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
    regionMemories: {},
    personalFacts: {},
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
  campaign.memory.regionMemories = campaign.memory.regionMemories && typeof campaign.memory.regionMemories === 'object' ? campaign.memory.regionMemories : {};
  campaign.memory.personalFacts = campaign.memory.personalFacts && typeof campaign.memory.personalFacts === 'object' ? campaign.memory.personalFacts : {};
  for (const npc of campaign.world?.npcs || []) {
    const record = campaign.memory.npcMemories[npc.id] ||= {
      name: cleanText(npc.name, 100), privatePersonality: cleanText(npc.personality || npc.privateProfile?.personality || 'Personalidade ainda não definida.', 800),
      privateGoals: cleanText((npc.goals||[]).join('; ') || npc.privateProfile?.goals || '', 800), facts: [], privateFacts:{}, interactions: [], updatedAt: nowIso(),
    };
    record.name ||= cleanText(npc.name, 100);
    record.privatePersonality ||= cleanText(npc.personality || 'Personalidade ainda não definida.', 800);
    record.facts = Array.isArray(record.facts) ? record.facts : [];
    record.privateFacts = record.privateFacts && typeof record.privateFacts === 'object' ? record.privateFacts : {};
    record.interactions = Array.isArray(record.interactions) ? record.interactions : [];
  }
  return campaign.memory;
}

export function memoryContext(campaign, actions = [], characters = []) {
  const memory = ensureCampaignMemory(campaign);
  const text=actions.map(a=>a.text).join(' ').toLocaleLowerCase();
  const byId=new Map((characters||[]).map(character=>[character.id,character]));
  const activeLocations=new Set(actions.map(action=>{const actor=byId.get(action.characterId);return actor?.location||actor?.position;}).filter(Boolean));
  if(!activeLocations.size)for(const character of characters||[])if(character.status==='ALIVE')activeLocations.add(character.location||character.position||campaign.world?.location);
  const relevant=(campaign.world?.npcs||[]).filter(n=>!n.location||activeLocations.has(n.location)||text.includes(n.name.toLocaleLowerCase()));
  const ids=new Set(relevant.map(n=>n.id));
  const terms=text.split(/\W+/).filter(t=>t.length>4).slice(0,30);
  const score=f=>(f.importance||0)+terms.filter(t=>f.text.toLocaleLowerCase().includes(t)).length*3;
  return {
    canon: memory.canon.map(x=>cleanText(x,3000)).slice(0,3), grand_summary:cleanText(memory.grandSummary,3000),
    recent_chapters: memory.chapters.slice(-2).map(c=>({...c,summary:cleanText(c.summary,1500)})),
    recent_turns:memory.recentSummaries.slice(-3).map(t=>({...t,summary:cleanText(t.summary,800)})),
    active_facts:memory.facts.filter(f=>f.active!==false&&(!f.location||activeLocations.has(f.location)||terms.some(t=>f.text.toLocaleLowerCase().includes(t)))).sort((a,b)=>score(b)-score(a)).slice(0,14),
    local_memory:[...activeLocations].slice(0,4).map(location=>({location,events:(memory.regionMemories[location]||[]).slice(-6)})),
    personal_memory:[...new Set(actions.map(action=>action.characterId))].slice(0,4).map(characterId=>({character_id:characterId,facts:(memory.personalFacts[characterId]||[]).slice(-8)})),
    private_npc_memory:Object.entries(memory.npcMemories).filter(([id])=>ids.has(id)).slice(0,6).map(([id,n])=>({npc_id:id,name:n.name,private_personality:n.privatePersonality,private_goals:n.privateGoals,
      durable_facts:n.facts.slice(-8),personal_facts:[...new Set(actions.map(action=>action.characterId))].flatMap(characterId=>(n.privateFacts?.[characterId]||[]).slice(-4)),promises:n.promises||[],recent_interactions:n.interactions.filter(interaction=>!interaction.private||actions.some(action=>action.characterId===interaction.characterId)).slice(-5),
      relevant_old_interactions:(n.archive||[]).filter(i=>terms.some(t=>i.text.toLocaleLowerCase().includes(t))).slice(-4),
      identity:(()=>{const npc=relevant.find(x=>x.id===id)||{};return {values:(npc.values||[]).slice(0,4),goals:(npc.goals||[]).slice(0,3),fears:(npc.fears||[]).slice(0,3),occupation:npc.occupation||npc.role||'',faction:npc.faction||'',disposition:npc.disposition||'',speech_style:npc.speechStyle||''};})(),
      knowledge:relevant.find(x=>x.id===id)?.knowledge||[],secrets:relevant.find(x=>x.id===id)?.secrets||[]
    })),
  };
}

function eventFacts(events, turnNumber) {
  const persistent = new Set(['CHARACTER_DIED', 'ITEM_GAINED', 'ITEM_LOST', 'QUEST_STARTED', 'QUEST_COMPLETED', 'DISCOVERY', 'RESOURCE_GATHERED', 'NPC_RELATION_CHANGED', 'NPC_ARRIVED', 'ENCOUNTER_STARTED', 'STORY_THREAD_STARTED', 'WORLD_EVENT', 'WORLD_CLOCK_COMPLETED']);
  return events.filter((event) => persistent.has(event.type)).map((event) => ({
    id: newId(), category: event.type, text: cleanText(event.data?.description || event.data?.name || event.data?.item || event.data?.resource || event.data?.npc || JSON.stringify(event.data || {}), 300),
    turn: turnNumber, location:event.data?.location||null, privateCharacterId:event.data?.privateCharacterId||null, importance: event.type === 'CHARACTER_DIED' || event.type.startsWith('QUEST_') || event.type === 'WORLD_CLOCK_COMPLETED' ? 5 : 3, truthStatus:'FACT', source:'server-event', active: true, createdAt: nowIso(),
  })).filter((fact) => fact.text);
}

export function advanceCampaignMemory(campaign, { turnNumber, summary, memoryUpdates = {}, events = [], actions = [], characters = [] }) {
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
    const references = actions.filter(action => {const actor=characters.find(character=>character.id===action.characterId);const location=actor?.location||actor?.position||campaign.world.location;return (!npc.location||npc.location===location) && (cleanText(action.text,2000).toLocaleLowerCase('pt-BR').includes(npcName)||events.some(e=>e.targetId===npc.id&&e.sourceId===action.characterId));});
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
  for(const event of events){
    const actor=characters.find(character=>character.id===event.sourceId);const targetNpc=(campaign.world?.npcs||[]).find(npc=>npc.id===event.targetId);const location=event.data?.location||actor?.location||actor?.position||targetNpc?.location||null;
    const note=cleanText(event.data?.description||event.data?.name||'',360);if(location&&note){memory.regionMemories[location]=[...(memory.regionMemories[location]||[]),{turn:turnNumber,type:event.type,text:note}].slice(-24);}
    if(event.data?.privateCharacterId&&note){const id=event.data.privateCharacterId;memory.personalFacts[id]=[...(memory.personalFacts[id]||[]),{turn:turnNumber,type:event.type,text:note}].slice(-30);}
  }
  memory.lastUpdatedAt = nowIso();
  return memory;
}
