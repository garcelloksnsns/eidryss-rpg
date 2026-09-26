import { newId } from '../core/utils.js';

const ENCOUNTERS = [
  { name: 'Goblin Saqueador', description: 'Um goblin armado com lâmina curta e uma mochila cheia de bugigangas observa o grupo de trás da vegetação.', baseHp: 34, speed: 10, resistance: 7, attack: 2 },
  { name: 'Lobo Cinzento', description: 'Um lobo grande demais para ser comum surge entre as sombras, farejando o ar antes de mostrar as presas.', baseHp: 42, speed: 13, resistance: 8, attack: 3 },
  { name: 'Slime Arcano', description: 'Uma massa translúcida atravessada por pequenos relâmpagos violetas pulsa no caminho como se estivesse procurando calor.', baseHp: 38, speed: 7, resistance: 10, attack: 3 },
  { name: 'Bandido Desgarrado', description: 'Uma figura de capuz gasto bloqueia parte da passagem com uma arma improvisada e olhos atentos às bolsas do grupo.', baseHp: 48, speed: 10, resistance: 9, attack: 4 },
  { name: 'Espírito do Bosque', description: 'Uma silhueta feita de névoa e folhas toma forma entre as árvores, inquieta com a presença dos viajantes.', baseHp: 52, speed: 11, resistance: 11, attack: 4 },
];


const CREATURE_KNOWLEDGE = {
  'Goblin Batedor': { family:'Goblin', habitat:'Estradas e bordas de floresta', behavior:'Cauteloso e oportunista', traits:['Visão no escuro','Foge quando isolado'], weaknesses:['Pressão coordenada','Ataques de impacto'], resistances:['Emboscadas simples'] },
  'Goblin Saqueador': { family:'Goblin', habitat:'Florestas e rotas comerciais', behavior:'Agressivo quando possui vantagem', traits:['Improvisa armas','Busca itens brilhantes'], weaknesses:['Pressão coordenada','Controle de espaço'], resistances:['Intimidação fraca'] },
  'Lobo Cinzento': { family:'Fera', habitat:'Florestas e trilhas', behavior:'Caça em movimento e testa a defesa', traits:['Olfato aguçado','Alta mobilidade'], weaknesses:['Barreiras','Fogo controlado'], resistances:['Ataques lentos'] },
  'Slime Arcano': { family:'Slime', habitat:'Áreas saturadas de mana', behavior:'Segue fontes de calor e magia', traits:['Corpo amorfo','Carga arcana'], weaknesses:['Frio','Impactos concentrados'], resistances:['Cortes superficiais'] },
  'Bandido Desgarrado': { family:'Humanoide', habitat:'Estradas pouco vigiadas', behavior:'Observa recursos antes de atacar', traits:['Táticas improvisadas','Conhece rotas'], weaknesses:['Desarme','Pressão psicológica'], resistances:['Blefes óbvios'] },
  'Espírito do Bosque': { family:'Espírito', habitat:'Florestas antigas', behavior:'Reage a intrusos e desequilíbrios', traits:['Forma etérea','Afinidade natural'], weaknesses:['Magia purificadora','Símbolos de vínculo'], resistances:['Ataques físicos comuns'] },
  'Lobo dos Ecos': { family:'Fera mágica', habitat:'Bosque dos Ecos', behavior:'Ataca em investidas curtas', traits:['Eco-localização mágica','Mobilidade'], weaknesses:['Silêncio mágico','Barreiras'], resistances:['Ilusões sonoras simples'] },
  'Guardião Lunar': { family:'Construto antigo', habitat:'Ruínas da Lua', behavior:'Protege território e selos', traits:['Corpo ritualístico','Disciplina absoluta'], weaknesses:['Runas expostas','Ruptura de foco mágico'], resistances:['Medo','Veneno'] },
};

function creatureKey(name='') { return String(name).trim().toLocaleLowerCase('pt-BR'); }
function knowledgeFor(entity={}) { return entity.codex || CREATURE_KNOWLEDGE[entity.name] || { family:entity.type||'Criatura', habitat:'Desconhecido', behavior:entity.behavior||'Ainda não compreendido', traits:[], weaknesses:[], resistances:[] }; }
function tierFrom(entry){ const points=Number(entry.encounters||0)+Number(entry.observations||0)*2+Number(entry.defeats||0)*3; return points>=10?4:points>=6?3:points>=3?2:1; }
function roughStat(value){ const n=Number(value||0); return n>=16?'muito alto':n>=12?'alto':n>=8?'moderado':'baixo'; }

export function ensureBestiary(world){
  world.bestiary = Array.isArray(world.bestiary) ? world.bestiary : [];
  return world.bestiary;
}

export function updateBestiaryKnowledge(world, events=[], turn=0){
  const bestiary=ensureBestiary(world);
  const here=(world.entities||[]).filter(entity=>!entity.location||entity.location===world.location);
  for(const entity of here){
    const key=creatureKey(entity.name); let entry=bestiary.find(item=>item.key===key);
    const meta=knowledgeFor(entity);
    if(!entry){entry={key,name:entity.name,description:entity.description||'',family:meta.family||entity.type||'Criatura',habitat:meta.habitat||'Desconhecido',behavior:meta.behavior||entity.behavior||'Desconhecido',traits:[...(meta.traits||[])],weaknesses:[...(meta.weaknesses||[])],resistances:[...(meta.resistances||[])],encounters:0,observations:0,defeats:0,seenTurns:[],observedTurns:[],defeatTurns:[],lastSeenTurn:turn};bestiary.push(entry);}
    if(!entry.seenTurns.includes(turn)){entry.seenTurns.push(turn);entry.encounters+=1;entry.lastSeenTurn=turn;}
    const observed=events.some(event=>event.type==='DISCOVERY'&&event.sourceId);
    if(observed&&!entry.observedTurns.includes(turn)){entry.observedTurns.push(turn);entry.observations+=1;}
    const defeatedThisTurn=events.some(event=>event.targetId===entity.id&&(event.type==='CHARACTER_DIED'||(event.type==='DAMAGE'&&Number(event.data?.after)===0)));
    if(defeatedThisTurn&&!entry.defeatTurns.includes(turn)){entry.defeatTurns.push(turn);entry.defeats+=1;}
    entry.seenTurns=entry.seenTurns.slice(-40);entry.observedTurns=entry.observedTurns.slice(-40);entry.defeatTurns=entry.defeatTurns.slice(-20);
  }
  world.bestiary=bestiary.slice(-80); return world.bestiary;
}

export function publicBestiary(world){
  return ensureBestiary(world).map(entry=>{const tier=tierFrom(entry);const entity=(world.entities||[]).find(e=>creatureKey(e.name)===entry.key);const attrs=entity?.attributes||{};const points=Number(entry.encounters||0)+Number(entry.observations||0)*2+Number(entry.defeats||0)*3;const next=tier===1?3:tier===2?6:tier===3?10:10;return {key:entry.key,name:entry.name,description:entry.description,family:entry.family,habitat:entry.habitat,tier,points,nextTier:tier<4?next:null,encounters:entry.encounters,observations:entry.observations,defeats:entry.defeats,behavior:tier>=2?entry.behavior:null,traits:tier>=2?entry.traits.slice(0,tier>=4?6:2):[],weaknesses:tier>=3?entry.weaknesses.slice(0,tier>=4?6:1):[],resistances:tier>=3?entry.resistances.slice(0,tier>=4?6:1):[],stats:tier>=2?{speed:tier>=4?Number(attrs.speed||0):roughStat(attrs.speed),resistance:tier>=4?Number(attrs.resistance||0):roughStat(attrs.resistance),attack:tier>=4?Number(attrs.attack||0):roughStat(attrs.attack)}:null};});
}

const VISITORS = [
  { name: 'Selene, mercadora errante', role: 'merchant', description: 'Uma comerciante de manto azul-escuro conduz uma pequena mochila dimensional cheia de mercadorias comuns.', personality: 'Perspicaz, bem-humorada e sempre interessada em histórias raras.', goal: 'Encontrar rotas seguras e histórias que possam valer dinheiro.' },
  { name: 'Kael, batedor da guilda', role: 'scout', description: 'Um jovem batedor com capa marcada pelo brasão da Guilda dos Viajantes aparece com poeira nas botas.', personality: 'Prático, alerta e desconfiado de coincidências.', goal: 'Mapear ameaças recentes e descobrir por que criaturas estão mudando de rota.' },
  { name: 'Noa, curandeira viajante', role: 'healer', description: 'Uma curandeira de bolsa pesada e mãos cobertas por fitas de oração caminha sozinha pela estrada.', personality: 'Gentil, firme e pouco tolerante com imprudência.', goal: 'Chegar à próxima vila e ajudar feridos pelo caminho.' },
  { name: 'Iven, pesquisador arcano', role: 'scholar', description: 'Um pesquisador carregando pergaminhos, cristais e um caderno de campo se aproxima observando o ambiente.', personality: 'Curioso, distraído e empolgado com fenômenos mágicos.', goal: 'Registrar anomalias do vale sem se tornar vítima delas.' },
  { name: 'Rhea, aventureira ferida', role: 'adventurer', description: 'Uma aventureira com a armadura arranhada surge apoiando o peso em uma espada embainhada.', personality: 'Orgulhosa, resistente e relutante em pedir ajuda.', goal: 'Descobrir o destino de seus companheiros desaparecidos.' },
];

const AMBIENT_EVENTS = [
  { title: 'Sinos além da névoa', description: 'Sinos distantes ecoam de uma direção onde o mapa não registra nenhuma construção. O som desaparece antes que seja possível localizar a origem.' },
  { title: 'Pegadas recentes', description: 'Pegadas ainda úmidas cruzam a rota atual. Algumas parecem humanas; outras são largas demais para qualquer viajante comum.' },
  { title: 'Luz entre as árvores', description: 'Uma luz azulada acompanha o grupo por alguns instantes entre as árvores e some sempre que alguém tenta encará-la diretamente.' },
  { title: 'Carroça abandonada', description: 'Uma pequena carroça aparece fora da estrada, com marcas de arrasto e nenhuma pessoa por perto. Nada indica há quanto tempo foi deixada ali.' },
  { title: 'Símbolo desconhecido', description: 'Um símbolo entalhado recentemente numa pedra chama atenção. O desenho não corresponde a nenhuma marca já conhecida pelo grupo.' },
  { title: 'Mudança no ar', description: 'O ar esfria de repente e a mana ambiente parece se concentrar por alguns segundos antes de voltar ao normal.' },
];

const STORY_HOOKS = [
  { title: 'Os selos estão enfraquecendo', description: 'Sinais encontrados na região sugerem que algo está perturbando antigos selos mágicos espalhados pelo Vale de Aurora.' },
  { title: 'Viajantes desaparecidos', description: 'Rumores e rastros apontam para viajantes desaparecendo nas rotas entre a vila e as áreas de floresta mais densa.' },
  { title: 'A marca do eclipse', description: 'O mesmo símbolo em forma de eclipse começa a surgir em pedras, objetos e relatos sem que ninguém conheça sua origem.' },
  { title: 'Criaturas fora de território', description: 'Animais e monstros estão abandonando seus habitats habituais, como se algo maior os estivesse expulsando.' },
];

function pick(list, random = Math.random) {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

function pushRecentKind(director, kind) {
  director.recentKinds.push(kind);
  director.recentKinds = director.recentKinds.slice(-5);
}

function recordWorldEvent(world, turn, kind, title, description) {
  world.events ||= [];
  const entry = { id: newId(), turn, kind, title, description };
  world.events.push(entry);
  world.events = world.events.slice(-30);
  return entry;
}

export function ensureWorldDirector(world) {
  world.director ||= {};
  const director = world.director;
  director.version ||= 1;
  director.tension = Math.max(0, Math.min(100, Number(director.tension ?? 18)));
  director.turnsSinceEvent = Math.max(0, Math.trunc(Number(director.turnsSinceEvent ?? 0)));
  director.lastEventTurn = Math.max(0, Math.trunc(Number(director.lastEventTurn ?? 0)));
  director.recentKinds = Array.isArray(director.recentKinds) ? director.recentKinds.slice(-5) : [];
  director.threads = Array.isArray(director.threads) ? director.threads : [];
  director.clocks = Array.isArray(director.clocks) && director.clocks.length ? director.clocks : [
    { id:'clock-seals', title:'Instabilidade dos Selos', kind:'WORLD', progress:0, segments:8, status:'ACTIVE', visibility:'PUBLIC', description:'Antigos selos do vale perdem estabilidade enquanto ninguém investiga a origem.' },
    { id:'clock-routes', title:'Rotas Inquietas', kind:'FACTION', progress:0, segments:6, status:'ACTIVE', visibility:'PUBLIC', description:'Criaturas e viajantes mudam de rota à medida que a região fica mais perigosa.' },
  ];
  return director;
}

export function ensureAtlas(world){
 if(world.atlas)return world.atlas;
 world.atlas={current:'crossroads',nodes:[
 {id:'crossroads',name:world.location||'Encruzilhada de Eidryss',region:'Vale de Aurora',biome:'Floresta ancestral',kind:'Estrada',known:true,visited:true,x:50,y:76},
 {id:'village',name:'Vila de Aurora',region:'Vale de Aurora',biome:'Campos',kind:'Vila',known:true,visited:false,x:24,y:52},
 {id:'guild',name:'Guilda dos Viajantes',region:'Vale de Aurora',biome:'Cidade',kind:'Guilda',known:false,visited:false,x:20,y:22},
 {id:'grove',name:'Bosque dos Ecos',region:'Vale de Aurora',biome:'Floresta mágica',kind:'Bosque',known:true,visited:false,x:72,y:48},
 {id:'ruins',name:'Ruínas da Lua',region:'Vale de Aurora',biome:'Ruínas',kind:'Masmorra',known:false,visited:false,x:77,y:18},
 ],edges:[['crossroads','village'],['crossroads','grove'],['village','guild'],['grove','ruins']]};return world.atlas;
}

export function initializeIsekai(world,mode='divine'){
 ensureAtlas(world);ensureWorldDirector(world);world.introduction={mode,phase:mode==='arrival'?'world':mode==='origin'?'origin':'divine',votes:[],completed:mode==='arrival'};
 if(mode!=='arrival'){
 world.location=mode==='origin'?'Último dia no mundo anterior':'Santuário do Limiar';
 world.npcs.push({id:newId(),name:'Aurelia',description:'Uma entidade de olhos dourados entre constelações imóveis.',personality:'Paciente, enigmática e respeitosa da liberdade dos viajantes.',privateProfile:{goals:'Preparar o grupo para restaurar os selos do vale.'},secrets:['Seu poder não alcança diretamente o vale.'],knowledge:['As regras de classes e a travessia'],memory:[],relationships:{},location:'Santuário do Limiar',status:'ALIVE',role:'deity'});
 }
 world.quests.push({id:'first-path',name:'Quatro almas, um novo horizonte',description:'Atravessem o limiar e alcancem a Guilda dos Viajantes.',status:'ACTIVE',rewardXp:60});
}

export function publicAtlas(world){const a=ensureAtlas(world);const ids=new Set(a.nodes.filter(n=>n.known).map(n=>n.id));return {current:a.current,nodes:a.nodes.filter(n=>ids.has(n.id)),edges:a.edges.filter(([x,y])=>ids.has(x)&&ids.has(y))};}

function startStoryThread(world, turn, events, random) {
  const director = ensureWorldDirector(world);
  const activeTitles = new Set(director.threads.filter((thread) => thread.status === 'ACTIVE').map((thread) => thread.title));
  const available = STORY_HOOKS.filter((hook) => !activeTitles.has(hook.title));
  if (!available.length) return false;
  const hook = pick(available, random);
  const thread = { id: newId(), title: hook.title, description: hook.description, status: 'ACTIVE', createdTurn: turn, lastTouchedTurn: turn, clues: [] };
  director.threads.push(thread);
  director.threads = director.threads.slice(-12);
  recordWorldEvent(world, turn, 'STORY', hook.title, hook.description);
  events.push({ id:newId(), type:'STORY_THREAD_STARTED', turnNumber:turn, sourceId:null, targetId:null, data:{ threadId:thread.id, name:hook.title, description:hook.description } });
  return true;
}

function createVisitor(world, turn, events, random) {
  const template = pick(VISITORS, random);
  if ((world.npcs || []).some((npc) => npc.status !== 'DEAD' && npc.name === template.name && npc.location === world.location)) return false;
  const npc = {
    id:newId(), name:template.name, role:template.role, description:template.description, personality:template.personality,
    privateProfile:{ goals:template.goal }, secrets:[], knowledge:[world.location], memory:[], relationships:{}, location:world.location, status:'ALIVE', inventory:[], abilities:[], arrivedTurn:turn,
  };
  world.npcs.push(npc);
  world.knownNpcIds ||= [];
  if (!world.knownNpcIds.includes(npc.id)) world.knownNpcIds.push(npc.id);
  const description = `${npc.name} chegou a ${world.location}. ${npc.description}`;
  recordWorldEvent(world, turn, 'NPC', `Chegada de ${npc.name}`, description);
  events.push({ id:newId(), type:'NPC_ARRIVED', turnNumber:turn, sourceId:npc.id, targetId:null, data:{ npc:npc.name, role:npc.role, location:world.location, description } });
  return true;
}

function createEncounter(world, actors, turn, events, random, settings) {
  const aliveHere = (world.entities || []).filter((entity) => entity.status !== 'DEAD' && entity.hp > 0 && (!entity.location || entity.location === world.location));
  if (aliveHere.length >= 2) return false;
  const template = pick(ENCOUNTERS, random);
  const living = actors.filter((character) => character.status === 'ALIVE');
  const averageLevel = living.length ? living.reduce((sum, character) => sum + Number(character.level || 1), 0) / living.length : 1;
  const danger = Number(world.ecosystem?.dangerLevel || 2);
  const hard = settings?.difficulty === 'hard' ? 1.18 : 1;
  const hp = Math.max(20, Math.round((template.baseHp + averageLevel * 10 + danger * 4) * hard));
  const entity = {
    id:newId(), name:template.name, location:world.location, type:'ENEMY', description:template.description,
    hp, maxHp:hp, status:'ALIVE', spawnTurn:turn, behavior:'AGGRESSIVE', threat:Math.max(1,Math.round(averageLevel + danger / 2)),
    attributes:{ speed:template.speed + Math.floor(averageLevel / 4), resistance:template.resistance + Math.floor(averageLevel / 3), attack:template.attack + Math.floor(averageLevel / 3) },
    codex: structuredClone(CREATURE_KNOWLEDGE[template.name] || {}),
  };
  world.entities.push(entity);
  const description = `${entity.name} surgiu em ${world.location}. ${entity.description}`;
  recordWorldEvent(world, turn, 'ENCOUNTER', `Novo encontro: ${entity.name}`, description);
  events.push({ id:newId(), type:'ENCOUNTER_STARTED', turnNumber:turn, sourceId:entity.id, targetId:null, data:{ name:entity.name, location:world.location, threat:entity.threat, description } });
  return true;
}

function createAmbientEvent(world, turn, events, random) {
  const ambient = pick(AMBIENT_EVENTS, random);
  recordWorldEvent(world, turn, 'AMBIENT', ambient.title, ambient.description);
  events.push({ id:newId(), type:'WORLD_EVENT', turnNumber:turn, sourceId:null, targetId:null, data:{ name:ambient.title, location:world.location, description:ambient.description } });
  return true;
}

function advanceWorldClock(world, events, turn, random, settings = {}) {
  const director = ensureWorldDirector(world);
  const active = director.clocks.filter((clock) => clock.status === 'ACTIVE');
  if (!active.length) return null;
  const base = { low:.12, normal:.22, high:.34, chaotic:.46 }[settings.worldEventFrequency || 'normal'] ?? .22;
  const chance = Math.min(.72, base + director.tension / 500);
  if (random() > chance) return null;
  const clock = pick(active, random);
  const before = Number(clock.progress || 0);
  const step = random() < .12 ? 2 : 1;
  clock.progress = Math.min(Number(clock.segments || 6), before + step);
  clock.lastAdvancedTurn = turn;
  events.push({ id:newId(), type:'WORLD_CLOCK_ADVANCED', turnNumber:turn, sourceId:null, targetId:clock.id, data:{ clockId:clock.id, title:clock.title, before, after:clock.progress, segments:clock.segments, description:`${clock.title}: ${clock.progress}/${clock.segments}.` } });
  if (clock.progress >= clock.segments) {
    clock.status = 'COMPLETED';
    clock.completedTurn = turn;
    events.push({ id:newId(), type:'WORLD_CLOCK_COMPLETED', turnNumber:turn, sourceId:null, targetId:clock.id, data:{ clockId:clock.id, title:clock.title, description:`O relógio “${clock.title}” foi concluído e agora pode alterar o mundo.` } });
  }
  return clock;
}

export function advanceWorldDirector(world, actors, events, turn, { random = Math.random, settings = {} } = {}) {
  if (world.introduction && !world.introduction.completed) return null;
  const director = ensureWorldDirector(world);
  const profile = {
    low:{ chance:0.14, tension:6 },
    normal:{ chance:0.30, tension:9 },
    high:{ chance:0.50, tension:12 },
    chaotic:{ chance:0.68, tension:16 },
  }[settings.worldEventFrequency || 'normal'] || { chance:0.30, tension:9 };

  director.turnsSinceEvent += 1;
  director.tension = Math.min(100, director.tension + profile.tension + Number(world.ecosystem?.dangerLevel || 0));
  advanceWorldClock(world, events, turn, random, settings);
  const quietPressure = Math.min(.22, director.turnsSinceEvent * .035);
  const chance = Math.min(.90, profile.chance + director.tension / 360 + quietPressure);
  if (random() > chance) return null;

  const livingHostiles = (world.entities || []).filter((entity) => entity.status !== 'DEAD' && entity.hp > 0 && (!entity.location || entity.location === world.location));
  const recent = new Set(director.recentKinds.slice(-2));
  const options = [];
  if (!livingHostiles.length && !recent.has('ENCOUNTER')) options.push('ENCOUNTER','ENCOUNTER','ENCOUNTER');
  if ((world.npcs || []).filter((npc) => npc.status !== 'DEAD' && (!npc.location || npc.location === world.location)).length < 4 && !recent.has('NPC')) options.push('NPC','NPC');
  if (director.threads.filter((thread) => thread.status === 'ACTIVE').length < 4 && !recent.has('STORY')) options.push('STORY');
  options.push('AMBIENT','AMBIENT');
  let kind = pick(options, random);
  let created = false;
  if (kind === 'ENCOUNTER') created = createEncounter(world, actors, turn, events, random, settings);
  else if (kind === 'NPC') created = createVisitor(world, turn, events, random);
  else if (kind === 'STORY') created = startStoryThread(world, turn, events, random);
  else created = createAmbientEvent(world, turn, events, random);
  if (!created) { kind = 'AMBIENT'; created = createAmbientEvent(world, turn, events, random); }

  if (created) {
    director.turnsSinceEvent = 0;
    director.lastEventTurn = turn;
    director.tension = Math.max(8, director.tension - 42);
    pushRecentKind(director, kind);
  }
  return kind;
}

export function progressWorld(world,actors,actions,events,turn,options={}){
 world.knownNpcIds ||= [];
 ensureWorldDirector(world);
 for(const npc of world.npcs||[])if((!npc.location||npc.location===world.location)&&!world.knownNpcIds.includes(npc.id))world.knownNpcIds.push(npc.id);
 const intro=world.introduction;const atlas=ensureAtlas(world);
 if(intro&&!intro.completed){
 const words=/atravess|aceito|pronto|seguir|portal|avanç|avanc/i;
 for(const a of actions)if(words.test(a.text)&&!intro.votes.includes(a.characterId))intro.votes.push(a.characterId);
 if(actors.filter(c=>c.status==='ALIVE').every(c=>intro.votes.includes(c.id))){
 intro.votes=[];
 if(intro.phase==='origin'){intro.phase='divine';world.location='Santuário do Limiar';}
 else {intro.phase='world';intro.completed=true;world.location=atlas.nodes[0].name;for(const c of actors)c.position=world.location;}
 events.push({id:newId(),type:'INTRO_ADVANCED',turnNumber:turn,data:{phase:intro.phase,location:world.location}});
 }return;
 }
 const travel=actions.map(a=>({a,node:atlas.nodes.find(n=>n.known&&a.text.toLocaleLowerCase().includes(n.name.toLocaleLowerCase()))})).filter(x=>x.node&&/viaj|vou|vamos|sigo|ir para|avanç|avanc/i.test(x.a.text));
 const node=travel[0]?.node;
 let travelled=false;
 if(node&&node.id!==atlas.current&&travel.length===actors.filter(c=>c.status==='ALIVE').length&&travel.every(x=>x.node.id===node.id)&&atlas.edges.some(([a,b])=>[a,b].includes(atlas.current)&&[a,b].includes(node.id))){atlas.current=node.id;node.visited=true;world.location=node.name;world.ecosystem.biome=node.biome;for(const c of actors)c.position=node.name;for(const [a,b]of atlas.edges){if(a===node.id||b===node.id)atlas.nodes.find(n=>n.id===(a===node.id?b:a)).known=true;}events.push({id:newId(),type:'DISCOVERY',turnNumber:turn,data:{name:node.name}});travelled=true;
 if(!node.encounterCreated){
 node.encounterCreated=true;
 if(node.id==='village'||node.id==='guild')world.npcs.push({id:newId(),name:node.id==='village'?'Mira':'Orin',description:node.id==='village'?'Uma artesã com roupas marcadas de tinta.':'O veterano que recebe viajantes na guilda.',personality:node.id==='village'?'Acolhedora, prática e protetora da vila.':'Exigente, paciente e atento às promessas.',knowledge:[node.name],location:node.name,relationships:{},memory:[],status:'ALIVE'});
 if(node.id==='grove'||node.id==='ruins'){const enemyName=node.id==='grove'?'Lobo dos Ecos':'Guardião Lunar';world.entities.push({id:newId(),name:enemyName,location:node.name,type:'ENEMY',description:'Uma presença hostil guarda a passagem.',hp:node.id==='grove'?65:140,maxHp:node.id==='grove'?65:140,status:'ALIVE',spawnTurn:turn,behavior:'AGGRESSIVE',attributes:{speed:10,resistance:12,attack:node.id==='ruins'?5:1},codex:structuredClone(CREATURE_KNOWLEDGE[enemyName]||{})});}
 }
 if(node.id==='guild'){const q=world.quests.find(q=>q.id==='first-path');if(q?.status==='ACTIVE'){q.status='COMPLETED';events.push({id:newId(),type:'QUEST_COMPLETED',turnNumber:turn,data:{name:q.name,rewardXp:q.rewardXp}});}}
 }
 if (options.settings && !travelled) advanceWorldDirector(world, actors, events, turn, options);
 else if (travelled) { const director=ensureWorldDirector(world); director.turnsSinceEvent=Math.max(0,director.turnsSinceEvent-1); }
}
