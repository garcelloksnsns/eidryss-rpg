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
  const occupied=new Set(Object.keys(world.activeScenes||{}));const here=(world.entities||[]).filter(entity=>!entity.location||occupied.has(entity.location)||entity.location===world.location);
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

function recordWorldEvent(world, turn, kind, title, description, location = null, scope = 'LOCAL') {
  world.events ||= [];
  const entry = { id: newId(), turn, kind, title, description, location, scope };
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
  director.localScenes = director.localScenes && typeof director.localScenes === 'object' ? director.localScenes : {};
  director.clocks = Array.isArray(director.clocks) && director.clocks.length ? director.clocks : [
    { id:'clock-seals', title:'Instabilidade dos Selos', kind:'WORLD', progress:0, segments:8, status:'ACTIVE', visibility:'PUBLIC', description:'Antigos selos do vale perdem estabilidade enquanto ninguém investiga a origem.' },
    { id:'clock-routes', title:'Rotas Inquietas', kind:'FACTION', progress:0, segments:6, status:'ACTIVE', visibility:'PUBLIC', description:'Criaturas e viajantes mudam de rota à medida que a região fica mais perigosa.' },
  ];
  return director;
}

export function ensureAtlas(world){
 if(!world.atlas)world.atlas={current:'crossroads',nodes:[
 {id:'crossroads',name:world.location||'Encruzilhada de Eidryss',region:'Vale de Aurora',biome:'Floresta ancestral',terrain:'woodland',kind:'Estrada',icon:'crossroads',known:true,visited:true,x:50,y:76,features:['marco de pedra','nascente']},
 {id:'village',name:'Vila de Aurora',region:'Vale de Aurora',biome:'Campos',terrain:'plains',kind:'Vila',icon:'village',known:true,visited:false,x:24,y:52,features:['muralha baixa','mercado','ponte do Alvorecer']},
 {id:'guild',name:'Guilda dos Viajantes',region:'Vale de Aurora',biome:'Cidade',terrain:'urban',kind:'Guilda',icon:'guild',known:false,visited:false,x:20,y:22,features:['salão da guilda','mural de missões']},
 {id:'grove',name:'Bosque dos Ecos',region:'Vale de Aurora',biome:'Floresta mágica',terrain:'forest',kind:'Bosque',icon:'forest',known:true,visited:false,x:72,y:48,features:['árvores ecoantes','rio Lúmen']},
 {id:'ruins',name:'Ruínas da Lua',region:'Vale de Aurora',biome:'Ruínas',terrain:'mountain',kind:'Masmorra',icon:'ruins',known:false,visited:false,x:77,y:18,features:['torres quebradas','selo lunar']},
 ],edges:[['crossroads','village'],['crossroads','grove'],['village','guild'],['grove','ruins']]};
 const atlas=world.atlas;
 atlas.nodes=Array.isArray(atlas.nodes)?atlas.nodes:[];
 atlas.edges=Array.isArray(atlas.edges)?atlas.edges:[];
 const defaults={crossroads:{terrain:'woodland',icon:'crossroads',features:['marco de pedra','nascente']},village:{terrain:'plains',icon:'village',features:['mercado','ponte do Alvorecer']},guild:{terrain:'urban',icon:'guild',features:['salão da guilda','mural de missões']},grove:{terrain:'forest',icon:'forest',features:['árvores ecoantes','rio Lúmen']},ruins:{terrain:'mountain',icon:'ruins',features:['torres quebradas','selo lunar']}};
 for(const node of atlas.nodes){const base=defaults[node.id]||{};node.terrain ||= base.terrain||'wilds';node.icon ||= base.icon||'place';node.features=Array.isArray(node.features)?node.features:structuredClone(base.features||[]);node.geography ||= {elevation:node.terrain==='mountain'?'high':'low',water:node.id==='grove'?['rio Lúmen']:[]};}
 const routeDefaults={
  'crossroads:village':{direction:'noroeste',distance:6,terrain:'estrada campestre',road:true,river:'Riacho do Alvorecer',bridge:{name:'Ponte do Alvorecer',status:'INTACT'},danger:1,travelTime:1,requirements:[]},
  'crossroads:grove':{direction:'nordeste',distance:8,terrain:'trilha de floresta',road:false,river:null,bridge:null,danger:2,travelTime:2,requirements:[]},
  'village:guild':{direction:'norte',distance:5,terrain:'estrada pavimentada',road:true,river:null,bridge:null,danger:1,travelTime:1,requirements:[]},
  'grove:ruins':{direction:'norte',distance:9,terrain:'desfiladeiro úmido',road:false,river:'Rio Lúmen',bridge:{name:'Ponte Lunar',status:'BROKEN'},obstacleAtKm:3.2,danger:4,travelTime:3,requirements:['bridge_or_crossing']},
 };
 atlas.routes=Array.isArray(atlas.routes)?atlas.routes:[];
 for(const [from,to] of atlas.edges){if(atlas.routes.some(route=>(route.from===from&&route.to===to)||(route.from===to&&route.to===from)))continue;const key=routeDefaults[`${from}:${to}`]?`${from}:${to}`:`${to}:${from}`;atlas.routes.push({id:`route-${from}-${to}`,from,to,blocked:false,obstacles:[],...(routeDefaults[key]||{direction:'desconhecida',distance:5,terrain:'trilha',road:false,river:null,bridge:null,danger:2,travelTime:1,requirements:[]})});}
 return atlas;
}

export function routeBetween(atlas,fromId,toId){return (atlas.routes||[]).find(route=>(route.from===fromId&&route.to===toId)||(route.from===toId&&route.to===fromId))||null;}

export function canTraverseRoute(route,actor={},actionText=''){
 if(!route)return {allowed:false,reason:'Não existe uma rota canônica entre os locais.'};
 if(route.blocked)return {allowed:false,reason:route.blockReason||'A passagem está bloqueada.'};
 const requirements=Array.isArray(route.requirements)?route.requirements:[];
 if(requirements.includes('bridge_or_crossing')&&route.bridge?.status!=='INTACT'){
  const text=String(actionText).toLocaleLowerCase('pt-BR');
  const possessions=[...(actor.inventory||[]).map(item=>item.name),...(actor.powers||[]).map(power=>power.name)].join(' ').toLocaleLowerCase('pt-BR');
  const hasMethod=/barco|bote|ponte portátil|voo|voar|levita|nadar|teleporte/.test(`${text} ${possessions}`);
  if(!hasMethod)return {allowed:false,reason:`${route.bridge?.name||'A ponte'} está destruída. É necessário barco, voo, travessia segura ou reparar a passagem.`,obstacle:'BROKEN_BRIDGE'};
 }
 return {allowed:true,reason:'Rota transitável.'};
}

function foldDirection(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
const OPPOSITE={norte:'sul',sul:'norte',leste:'oeste',oeste:'leste',nordeste:'sudoeste',noroeste:'sudeste',sudeste:'noroeste',sudoeste:'nordeste'};
function directionFrom(route,nodeId){return route.from===nodeId?foldDirection(route.direction):OPPOSITE[foldDirection(route.direction)]||foldDirection(route.direction);}
function directionIn(text=''){const value=foldDirection(text);return ['nordeste','noroeste','sudeste','sudoeste','norte','sul','leste','oeste'].find(direction=>new RegExp(`\\b${direction}\\b`).test(value))||null;}

export function resolveTravelIntent(world,actor,actionText=''){
 const atlas=ensureAtlas(world);const value=foldDirection(actionText);const currentTravel=actor.travel&&atlas.routes.find(route=>route.id===actor.travel.routeId);
 if(currentTravel&&/continu|frente|sigo|avanc|viaj|vou|ando|caminh|estrada|trilha|rio/.test(value))return {route:currentTravel,fromId:actor.travel.fromId,toId:actor.travel.toId,destination:atlas.nodes.find(node=>node.id===actor.travel.toId),continuing:true};
 const current=atlas.nodes.find(node=>node.id===actor.locationId||node.name===(actor.location||actor.position))||atlas.nodes.find(node=>node.id===atlas.current);
 if(!current)return null;
 const routes=atlas.routes.filter(route=>route.from===current.id||route.to===current.id);const known=new Set(actor.knownLocationIds||[]);
 const named=atlas.nodes.find(node=>(known.has(node.id)||node.known)&&value.includes(foldDirection(node.name)));
 let route=named?routes.find(candidate=>candidate.from===named.id||candidate.to===named.id):null;
 const requestedDirection=directionIn(value);
 if(!route&&requestedDirection)route=routes.find(candidate=>directionFrom(candidate,current.id)===requestedDirection);
 if(!route&&/rio acima/.test(value))route=routes.find(candidate=>candidate.river&&directionFrom(candidate,current.id).includes('norte'))||routes.find(candidate=>candidate.river);
 if(!route&&/rio abaixo|seguindo? o rio|seguir o rio/.test(value))route=routes.find(candidate=>candidate.river);
 if(!route&&/ponte/.test(value))route=routes.find(candidate=>candidate.bridge);
 if(!route&&/estrada/.test(value))route=routes.find(candidate=>candidate.road);
 if(!route&&/trilha|floresta|bosque/.test(value))route=routes.find(candidate=>/trilha|floresta/.test(foldDirection(candidate.terrain))||/floresta|bosque/.test(foldDirection(atlas.nodes.find(node=>node.id===(candidate.from===current.id?candidate.to:candidate.from))?.biome)));
 if(!route&&/montanha|subir/.test(value))route=routes.find(candidate=>/montanha|desfiladeiro/.test(foldDirection(candidate.terrain))||atlas.nodes.find(node=>node.id===(candidate.from===current.id?candidate.to:candidate.from))?.terrain==='mountain');
 if(!route&&/frente|continu/.test(value)&&routes.length===1)route=routes[0];
 if(!route)return null;const toId=route.from===current.id?route.to:route.from;
 return {route,fromId:current.id,toId,destination:atlas.nodes.find(node=>node.id===toId),continuing:false,direction:directionFrom(route,current.id)};
}

function travelAllowance(actor,route,world){
 const speed=Number(actor.attributes?.speed||actor.attributes?.agility||10);let distance=3.2+(speed-10)*.12;
 if(/montanha|desfiladeiro|pântano/.test(foldDirection(route.terrain)))distance*=.72;
 if(/chuva|tempestade|neve/.test(foldDirection(world.weather)))distance*=.78;
 if((actor.inventory||[]).some(item=>/montaria|cavalo|corcel/.test(foldDirection(item.name))))distance*=1.65;
 if(Number(route.travelTime||2)<=1&&Number(route.distance||0)<=6)distance=Math.max(distance,Number(route.distance||0));
 return Math.max(.8,Number(distance.toFixed(2)));
}

function hasCrossingMethod(route,actor,text){return canTraverseRoute({...route,blocked:false},actor,text).allowed;}

export function buildActiveScenes(world,actors=[],turn=0){
 const scenes={};
 for(const actor of actors.filter(item=>item.status==='ALIVE')){const location=actor.travel?`Rota ${actor.travel.routeId} · ${actor.zone||'trecho'}`:actor.location||actor.position||world.location;(scenes[location]||={location,routeId:actor.travel?.routeId||null,zone:actor.zone||'centro',characterIds:[],npcIds:[],entityIds:[],lastActiveTurn:turn}).characterIds.push(actor.id);}
 for(const scene of Object.values(scenes)){
  scene.npcIds=(world.npcs||[]).filter(npc=>npc.status!=='DEAD'&&(scene.routeId?npc.travel?.routeId===scene.routeId&&npc.zone===scene.zone:!npc.location||npc.location===scene.location)).map(npc=>npc.id);
  scene.entityIds=(world.entities||[]).filter(entity=>entity.status!=='DEAD'&&(scene.routeId?entity.travel?.routeId===scene.routeId&&entity.zone===scene.zone:!entity.location||entity.location===scene.location)).map(entity=>entity.id);
  const node=ensureAtlas(world).nodes.find(item=>item.name===scene.location);scene.nodeId=node?.id||null;scene.region=node?.region||'';scene.biome=node?.biome||world.ecosystem?.biome||'';
 }
 world.activeScenes=scenes;return scenes;
}

export function advanceStructuredQuests(world,actors,events,turn){
 const atlas=ensureAtlas(world);
 for(const quest of (world.quests||[]).filter(item=>item.status==='ACTIVE')){
  quest.objectives=Array.isArray(quest.objectives)?quest.objectives:[];
  for(const objective of quest.objectives.filter(item=>!item.completed)){
   const required=Math.max(1,Number(objective.required||1));let gain=0;
   if(objective.type==='REACH_LOCATION')gain=actors.some(actor=>{const node=atlas.nodes.find(item=>item.name===(actor.location||actor.position));return node?.id===objective.targetId||node?.name===objective.targetId;})?required:0;
   else if(objective.type==='TALK_NPC')gain=events.filter(event=>event.type==='NPC_RELATION_CHANGED'&&event.targetId===objective.targetId).length;
   else if(objective.type==='DEFEAT_TARGET')gain=events.filter(event=>event.type==='CHARACTER_DIED'&&event.targetId===objective.targetId).length;
   else if(objective.type==='COLLECT_ITEM')gain=events.filter(event=>event.type==='ITEM_GAINED'&&(event.targetId===objective.targetId||event.data?.item===objective.targetId)).reduce((sum,event)=>sum+Number(event.data?.quantity||1),0);
   else if(objective.type==='DISCOVER')gain=events.filter(event=>event.type==='DISCOVERY'&&(event.targetId===objective.targetId||event.data?.locationId===objective.targetId||event.data?.name===objective.targetId)).length;
   objective.progress=Math.min(required,Number(objective.progress||0)+gain);objective.completed=objective.progress>=required;
  }
  if(quest.objectives.length&&quest.objectives.every(objective=>objective.completed)){quest.status='COMPLETED';quest.completedTurn=turn;const achiever=events.find(event=>event.type==='CHARACTER_MOVED'||event.type==='NPC_RELATION_CHANGED'||event.type==='ITEM_GAINED')?.sourceId||null;events.push({id:newId(),type:'QUEST_COMPLETED',turnNumber:turn,sourceId:achiever,targetId:quest.id,data:{questId:quest.id,name:quest.name,rewardXp:Number(quest.reward?.xp||quest.rewardXp||0),description:`Os requisitos de ${quest.name} foram cumpridos.`}});}
 }
}

export function initializeIsekai(world,mode='divine'){
 ensureAtlas(world);ensureWorldDirector(world);world.introduction={mode,phase:mode==='arrival'?'world':mode==='origin'?'origin':'divine',votes:[],completed:mode==='arrival'};
 if(mode!=='arrival'){
 world.location=mode==='origin'?'Último dia no mundo anterior':'Santuário do Limiar';
 world.npcs.push({id:newId(),name:'Aurelia',description:'Uma entidade de olhos dourados entre constelações imóveis.',personality:'Paciente, enigmática e respeitosa da liberdade dos viajantes.',values:['livre-arbítrio','equilíbrio entre mundos'],goals:['Preparar o grupo para restaurar os selos do vale.'],fears:['Que a travessia repita uma antiga ruptura.'],interests:['escolhas mortais','juramentos'],occupation:'guardiã do limiar',homeLocation:'Santuário do Limiar',currentLocation:'Santuário do Limiar',faction:'Círculo do Limiar',disposition:'SERENE',speechStyle:'Calma, simbólica e direta quando explica regras.',privateProfile:{goals:'Preparar o grupo para restaurar os selos do vale.'},secrets:['Seu poder não alcança diretamente o vale.'],knowledge:['As regras de classes e a travessia'],memory:[],relationships:{},location:'Santuário do Limiar',status:'ALIVE',role:'deity'});
 }
 world.quests.push({id:'first-path',name:'Quatro almas, um novo horizonte',description:'Atravessem o limiar e alcancem a Guilda dos Viajantes.',origin:'Aurelia',objectives:[{id:'reach-guild',type:'REACH_LOCATION',targetId:'guild',required:1,progress:0,completed:false}],location:'Guilda dos Viajantes',npcId:null,risk:'LOW',status:'ACTIVE',reward:{xp:60},rewardXp:60,consequences:[]});
}

export function publicAtlas(world,currentLocation='',knownLocationIds=[]){const a=ensureAtlas(world);const explicit=new Set(knownLocationIds||[]);const ids=explicit.size?explicit:new Set(a.nodes.filter(n=>n.known).map(n=>n.id));const personal=a.nodes.find(n=>n.name===currentLocation)?.id||a.current;ids.add(personal);return {current:personal,nodes:a.nodes.filter(n=>ids.has(n.id)),edges:a.edges.filter(([x,y])=>ids.has(x)&&ids.has(y)),routes:(a.routes||[]).filter(route=>ids.has(route.from)&&ids.has(route.to)).map(route=>structuredClone(route))};}

function startStoryThread(world, turn, events, random, location = world.location) {
  const director = ensureWorldDirector(world);
  const activeTitles = new Set(director.threads.filter((thread) => thread.status === 'ACTIVE').map((thread) => thread.title));
  const available = STORY_HOOKS.filter((hook) => !activeTitles.has(hook.title));
  if (!available.length) return false;
  const hook = pick(available, random);
  const thread = { id: newId(), title: hook.title, description: hook.description, location, status: 'ACTIVE', createdTurn: turn, lastTouchedTurn: turn, clues: [] };
  director.threads.push(thread);
  director.threads = director.threads.slice(-12);
  recordWorldEvent(world, turn, 'STORY', hook.title, hook.description, location);
  events.push({ id:newId(), type:'STORY_THREAD_STARTED', turnNumber:turn, sourceId:null, targetId:null, data:{ threadId:thread.id, name:hook.title, location, description:hook.description } });
  return true;
}

function createVisitor(world, turn, events, random, location = world.location) {
  const template = pick(VISITORS, random);
  if ((world.npcs || []).some((npc) => npc.status !== 'DEAD' && npc.name === template.name && npc.location === location)) return false;
  const npc = {
    id:newId(), name:template.name, role:template.role, description:template.description, personality:template.personality,
    values:['sobrevivência','reciprocidade'], goals:[template.goal], fears:[], interests:['rotas','histórias de viajantes'], occupation:template.role,
    homeLocation:location, currentLocation:location, faction:null, disposition:'NEUTRAL', speechStyle:'Natural e coerente com sua personalidade.',
    privateProfile:{ goals:template.goal }, secrets:[], knowledge:[location], memory:[], relationships:{}, location, status:'ALIVE', inventory:[], abilities:[], arrivedTurn:turn,
  };
  world.npcs.push(npc);
  world.knownNpcIds ||= [];
  if (!world.knownNpcIds.includes(npc.id)) world.knownNpcIds.push(npc.id);
  const description = `${npc.name} chegou a ${location}. ${npc.description}`;
  recordWorldEvent(world, turn, 'NPC', `Chegada de ${npc.name}`, description, location);
  events.push({ id:newId(), type:'NPC_ARRIVED', turnNumber:turn, sourceId:npc.id, targetId:null, data:{ npc:npc.name, role:npc.role, location, description } });
  return true;
}

function createEncounter(world, actors, turn, events, random, settings, location = world.location) {
  const aliveHere = (world.entities || []).filter((entity) => entity.status !== 'DEAD' && entity.hp > 0 && (!entity.location || entity.location === location));
  if (aliveHere.length >= 2) return false;
  const template = pick(ENCOUNTERS, random);
  const living = actors.filter((character) => character.status === 'ALIVE');
  const averageLevel = living.length ? living.reduce((sum, character) => sum + Number(character.level || 1), 0) / living.length : 1;
  const danger = Number(world.ecosystem?.dangerLevel || 2);
  const hard = settings?.difficulty === 'hard' ? 1.18 : 1;
  const hp = Math.max(20, Math.round((template.baseHp + averageLevel * 10 + danger * 4) * hard));
  const entity = {
    id:newId(), name:template.name, location, type:'ENEMY', description:template.description,
    hp, maxHp:hp, status:'ALIVE', spawnTurn:turn, behavior:'AGGRESSIVE', threat:Math.max(1,Math.round(averageLevel + danger / 2)),
    attributes:{ speed:template.speed + Math.floor(averageLevel / 4), resistance:template.resistance + Math.floor(averageLevel / 3), attack:template.attack + Math.floor(averageLevel / 3) },
    codex: structuredClone(CREATURE_KNOWLEDGE[template.name] || {}),
  };
  world.entities.push(entity);
  const description = `${entity.name} surgiu em ${location}. ${entity.description}`;
  recordWorldEvent(world, turn, 'ENCOUNTER', `Novo encontro: ${entity.name}`, description, location);
  events.push({ id:newId(), type:'ENCOUNTER_STARTED', turnNumber:turn, sourceId:entity.id, targetId:null, data:{ name:entity.name, location, threat:entity.threat, description } });
  return true;
}

function createAmbientEvent(world, turn, events, random, location = world.location) {
  const ambient = pick(AMBIENT_EVENTS, random);
  recordWorldEvent(world, turn, 'AMBIENT', ambient.title, ambient.description, location);
  events.push({ id:newId(), type:'WORLD_EVENT', turnNumber:turn, sourceId:null, targetId:null, data:{ name:ambient.title, location, description:ambient.description } });
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
  const scenes=buildActiveScenes(world,actors,turn);const createdKinds=[];
  for(const scene of Object.values(scenes).slice(0,4)){
    const local=director.localScenes[scene.location]||={turnsSinceEvent:0,lastEventTurn:0,recentKinds:[],tension:Math.min(60,director.tension)};
    local.turnsSinceEvent+=1;local.tension=Math.min(100,Number(local.tension||0)+Math.ceil(profile.tension/2));
    const quietPressure=Math.min(.16,local.turnsSinceEvent*.025);const sceneChance=Math.min(.68,profile.chance*.58+local.tension/520+quietPressure);
    if(random()>sceneChance)continue;
    const localActors=actors.filter(actor=>(actor.location||actor.position||world.location)===scene.location&&actor.status==='ALIVE');
    const livingHostiles=(world.entities||[]).filter(entity=>entity.status!=='DEAD'&&entity.hp>0&&(!entity.location||entity.location===scene.location));
    const recent=new Set(local.recentKinds.slice(-2));const choices=[];
    if(!livingHostiles.length&&!recent.has('ENCOUNTER'))choices.push('ENCOUNTER','ENCOUNTER');
    if((world.npcs||[]).filter(npc=>npc.status!=='DEAD'&&(!npc.location||npc.location===scene.location)).length<4&&!recent.has('NPC'))choices.push('NPC');
    if(director.threads.filter(thread=>thread.status==='ACTIVE'&&thread.location===scene.location).length<2&&!recent.has('STORY'))choices.push('STORY');
    choices.push('AMBIENT','AMBIENT');let kind=pick(choices,random);let created=false;
    if(kind==='ENCOUNTER')created=createEncounter(world,localActors,turn,events,random,settings,scene.location);
    else if(kind==='NPC')created=createVisitor(world,turn,events,random,scene.location);
    else if(kind==='STORY')created=startStoryThread(world,turn,events,random,scene.location);
    else created=createAmbientEvent(world,turn,events,random,scene.location);
    if(!created){kind='AMBIENT';created=createAmbientEvent(world,turn,events,random,scene.location);}
    if(created){local.turnsSinceEvent=0;local.lastEventTurn=turn;local.tension=Math.max(6,local.tension-32);local.recentKinds=[...local.recentKinds,kind].slice(-5);createdKinds.push({location:scene.location,kind});}
    if(createdKinds.length>=2)break;
  }
  if(createdKinds.length){director.turnsSinceEvent=0;director.lastEventTurn=turn;director.tension=Math.max(8,director.tension-24);for(const entry of createdKinds)pushRecentKind(director,entry.kind);}
  buildActiveScenes(world,actors,turn);return createdKinds.length?createdKinds:null;
}

export function progressWorld(world,actors,actions,events,turn,options={}){
 world.knownNpcIds ||= [];
 ensureWorldDirector(world);
 for(const actor of actors){const hadPersonalAtlas=Array.isArray(actor.knownLocationIds);actor.knownLocationIds=hadPersonalAtlas?actor.knownLocationIds:ensureAtlas(world).nodes.filter(node=>node.known).map(node=>node.id);const current=ensureAtlas(world).nodes.find(node=>node.name===(actor.location||actor.position||world.location));if(current&&!actor.knownLocationIds.includes(current.id))actor.knownLocationIds.push(current.id);}
 const intro=world.introduction;const atlas=ensureAtlas(world);
 if(intro&&!intro.completed){
 const words=/atravess|aceito|pronto|seguir|portal|avanç|avanc/i;
 for(const a of actions)if(words.test(a.text)&&!intro.votes.includes(a.characterId))intro.votes.push(a.characterId);
 if(actors.filter(c=>c.status==='ALIVE').every(c=>intro.votes.includes(c.id))){
 intro.votes=[];
 if(intro.phase==='origin'){intro.phase='divine';world.location='Santuário do Limiar';}
 else {intro.phase='world';intro.completed=true;world.location=atlas.nodes[0].name;for(const c of actors){c.position=world.location;c.location=world.location;c.knownLocationIds=[...new Set([...(c.knownLocationIds||[]),atlas.nodes[0].id])];}}
 events.push({id:newId(),type:'INTRO_ADVANCED',turnNumber:turn,data:{phase:intro.phase,location:world.location}});
 }return;
 }
 const travel=actions.map(a=>{const actor=actors.find(c=>c.id===a.characterId);return {a,actor,intent:actor?resolveTravelIntent(world,actor,a.text):null};}).filter(x=>x.actor&&x.intent&&/viaj|vou|vamos|sigo|ir para|avanç|avanc|ando|caminh|norte|sul|leste|oeste|estrada|trilha|rio|ponte|floresta|montanha|frente/i.test(x.a.text));
 let travelled=false;const steps=[];
 for(const move of travel){
  const {route,fromId,toId,destination}=move.intent;const distance=Number(route.distance||1);const oldProgress=move.intent.continuing?Number(move.actor.travel?.progressKm||0):0;const allowance=travelAllowance(move.actor,route,world);let newProgress=Math.min(distance,oldProgress+allowance);let blocked=null;
  const obstacleAt=Number(route.obstacleAtKm||distance*.45);if(route.requirements?.includes('bridge_or_crossing')&&route.bridge?.status!=='INTACT'&&!hasCrossingMethod(route,move.actor,move.a.text)&&newProgress>=obstacleAt){newProgress=obstacleAt;blocked=canTraverseRoute(route,move.actor,move.a.text);}
  const absolute=value=>fromId===route.from?value:distance-value;steps.push({...move,route,fromId,toId,destination,distance,oldProgress,newProgress,oldAbsolute:absolute(oldProgress),newAbsolute:absolute(newProgress),blocked,meetingAt:null});
 }
 for(let i=0;i<steps.length;i++)for(let j=i+1;j<steps.length;j++){
  const a=steps[i],b=steps[j];if(a.route.id!==b.route.id||a.fromId===b.fromId)continue;
  const crossed=(a.oldAbsolute<=b.oldAbsolute&&a.newAbsolute>=b.newAbsolute)||(b.oldAbsolute<=a.oldAbsolute&&b.newAbsolute>=a.newAbsolute);if(!crossed)continue;
  const meetingAt=Number(((a.newAbsolute+b.newAbsolute)/2).toFixed(3));a.meetingAt=meetingAt;b.meetingAt=meetingAt;
  events.push({id:newId(),type:'WORLD_EVENT',scope:'NEARBY',radiusKm:.25,turnNumber:turn,sourceId:a.actor.id,targetId:b.actor.id,data:{kind:'ROUTE_MEETING',routeId:a.route.id,atKm:meetingAt,description:`${a.actor.identity?.name||'Dois viajantes'} e ${b.actor.identity?.name||'outro viajante'} se encontraram no mesmo trecho da rota.`}});
 }
 for(const step of steps){
  const actorName=step.actor.identity?.name||'Um viajante';travelled=true;const progress=step.meetingAt!==null?(step.fromId===step.route.from?step.meetingAt:step.distance-step.meetingAt):step.newProgress;
  step.actor.travel={routeId:step.route.id,fromId:step.fromId,toId:step.toId,progressKm:Number(progress.toFixed(2)),distanceKm:step.distance,direction:directionFrom(step.route,step.fromId),startedTurn:step.actor.travel?.startedTurn||turn};step.actor.zone=step.meetingAt!==null?`encontro-${turn}`:`trecho-${Math.floor((step.meetingAt??step.newAbsolute)*2)}`;step.actor.position=`Em viagem: ${step.route.terrain} (${progress.toFixed(1)}/${step.distance} km)`;
  if(step.meetingAt!==null){events.push({id:newId(),type:'TRAVEL_PROGRESS',scope:'NEARBY',radiusKm:.25,turnNumber:turn,sourceId:step.actor.id,targetId:step.route.id,data:{routeId:step.route.id,progressKm:progress,distanceKm:step.distance,metCharacterIds:steps.filter(other=>other!==step&&other.meetingAt===step.meetingAt).map(other=>other.actor.id),description:`${actorName} encontrou outros viajantes no caminho.`}});continue;}
  if(step.blocked){events.push({id:newId(),type:'TRAVEL_BLOCKED',scope:'LOCAL',turnNumber:turn,sourceId:step.actor.id,targetId:step.route.id,data:{from:step.fromId,to:step.toId,routeId:step.route.id,progressKm:progress,distanceKm:step.distance,reason:step.blocked.reason,obstacle:step.blocked.obstacle||'OBSTACLE',description:`${actorName} alcançou ${step.route.bridge?.name||'um obstáculo'}, mas não conseguiu atravessar: ${step.blocked.reason}`}});continue;}
  if(progress<step.distance){events.push({id:newId(),type:'TRAVEL_PROGRESS',scope:'NEARBY',turnNumber:turn,sourceId:step.actor.id,targetId:step.route.id,data:{routeId:step.route.id,from:step.fromId,to:step.toId,progressKm:progress,distanceKm:step.distance,terrain:step.route.terrain,description:`${actorName} avançou ${Number(progress-step.oldProgress).toFixed(1)} km pela ${step.route.terrain}.`}});continue;}
  const node=step.destination;delete step.actor.travel;step.actor.zone='centro';step.actor.location=node.name;step.actor.locationId=node.id;step.actor.position=node.name;step.actor.knownNpcIds=Array.isArray(step.actor.knownNpcIds)?step.actor.knownNpcIds:[];step.actor.knownLocationIds=Array.isArray(step.actor.knownLocationIds)?step.actor.knownLocationIds:[];if(!step.actor.knownLocationIds.includes(node.id))step.actor.knownLocationIds.push(node.id);node.visited=true;atlas.current=node.id;
  for(const [a,b]of atlas.edges){if(a===node.id||b===node.id){const neighbor=a===node.id?b:a;if(!step.actor.knownLocationIds.includes(neighbor))step.actor.knownLocationIds.push(neighbor);const legacyNode=atlas.nodes.find(candidate=>candidate.id===neighbor);if(legacyNode)legacyNode.known=true;}}
  events.push({id:newId(),type:'CHARACTER_MOVED',scope:'NEARBY',turnNumber:turn,sourceId:step.actor.id,targetId:node.id,data:{from:step.fromId,to:node.name,routeId:step.route.id,direction:directionFrom(step.route,step.fromId),distance:step.route.distance,terrain:step.route.terrain,travelTime:step.route.travelTime,description:`${actorName} concluiu a viagem até ${node.name} pela ${step.route.terrain}.`}});events.push({id:newId(),type:'DISCOVERY',scope:'LOCAL',turnNumber:turn,sourceId:step.actor.id,data:{name:node.name,locationId:node.id,description:`${actorName} alcançou ${node.name}.`}});
  if(!node.encounterCreated){node.encounterCreated=true;if(node.id==='village'||node.id==='guild'){const isMira=node.id==='village';world.npcs.push({id:newId(),name:isMira?'Mira':'Orin',description:isMira?'Uma artesã com roupas marcadas de tinta.':'O veterano que recebe viajantes na guilda.',personality:isMira?'Acolhedora, prática e protetora da vila.':'Exigente, paciente e atento às promessas.',values:isMira?['comunidade','trabalho bem feito']:['responsabilidade','coragem'],goals:[isMira?'Manter a vila abastecida.':'Preparar aventureiros sem enviá-los para uma morte inútil.'],fears:[isMira?'Ver a vila isolada.':'Repetir uma expedição desastrosa.'],interests:[isMira?'artesanato':'relatos de campo'],occupation:isMira?'artesã':'mestre de recepção',homeLocation:node.name,currentLocation:node.name,faction:isMira?'Vila de Aurora':'Guilda dos Viajantes',disposition:'NEUTRAL',speechStyle:isMira?'Prática e calorosa.':'Direta, calma e exigente.',knowledge:[node.name],secrets:[],location:node.name,locationId:node.id,relationships:{},memory:[],status:'ALIVE'});}if(node.id==='grove'||node.id==='ruins'){const enemyName=node.id==='grove'?'Lobo dos Ecos':'Guardião Lunar';world.entities.push({id:newId(),name:enemyName,location:node.name,locationId:node.id,zone:'centro',type:'ENEMY',description:'Uma presença hostil guarda a passagem.',hp:node.id==='grove'?65:140,maxHp:node.id==='grove'?65:140,status:'ALIVE',spawnTurn:turn,behavior:'AGGRESSIVE',attributes:{speed:10,resistance:12,attack:node.id==='ruins'?5:1},codex:structuredClone(CREATURE_KNOWLEDGE[enemyName]||{})});}}
  for(const npc of world.npcs||[])if(!npc.location||npc.location===node.name)if(!step.actor.knownNpcIds.includes(npc.id))step.actor.knownNpcIds.push(npc.id);
 }
 const routeGroups=new Map();for(const actor of actors.filter(item=>item.travel)){const key=`${actor.travel.routeId}:${actor.zone||'trecho'}`;if(!routeGroups.has(key))routeGroups.set(key,[]);routeGroups.get(key).push(actor);}world.routeEvents=Array.isArray(world.routeEvents)?world.routeEvents:[];
 for(const [key,travellers] of routeGroups){const route=atlas.routes.find(item=>item.id===travellers[0].travel.routeId);if(!route||world.routeEvents.some(item=>item.key===key&&item.turn===turn))continue;const chance=Math.min(.28,.04+Number(route.danger||1)*.035);if((options.random||Math.random)()>chance)continue;const template=pick(ENCOUNTERS,options.random||Math.random);const lead=travellers[0],absolute=lead.travel.fromId===route.from?lead.travel.progressKm:Number(route.distance||0)-lead.travel.progressKm;const entity={id:newId(),name:template.name,description:template.description,type:'ENEMY',location:`Rota ${route.id}`,zone:lead.zone,travel:{routeId:route.id,fromId:route.from,toId:route.to,progressKm:Number(absolute.toFixed(2)),distanceKm:Number(route.distance||0)},hp:template.baseHp,maxHp:template.baseHp,status:'ALIVE',spawnTurn:turn,behavior:'AGGRESSIVE',attributes:{speed:template.speed,resistance:template.resistance,attack:template.attack},codex:structuredClone(CREATURE_KNOWLEDGE[template.name]||{})};world.entities.push(entity);const eventId=newId();events.push({id:eventId,type:'ENCOUNTER_STARTED',scope:'NEARBY',radiusKm:.55,turnNumber:turn,sourceId:entity.id,targetId:lead.id,data:{entityId:entity.id,name:entity.name,routeId:route.id,travellerIds:travellers.map(item=>item.id),description:`${entity.name} surgiu no mesmo trecho da ${route.terrain}.`}});world.routeEvents.push({key,turn,eventId,entityId:entity.id});
 }
 world.routeEvents=world.routeEvents.slice(-30);
 advanceStructuredQuests(world,actors,events,turn);
 buildActiveScenes(world,actors,turn);
 if (options.settings && !travelled) advanceWorldDirector(world, actors, events, turn, options);
 else if (travelled) { const director=ensureWorldDirector(world); director.turnsSinceEvent=Math.max(0,director.turnsSinceEvent-1); }
 buildActiveScenes(world,actors,turn);
}
