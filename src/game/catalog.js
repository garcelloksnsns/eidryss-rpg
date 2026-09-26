import { assert } from '../core/errors.js';
import { clamp, cleanText, newId } from '../core/utils.js';
import { buildClassPaths, ensureAdvancedProgression, syncPathSkills } from './progression.js';

export const ATTRIBUTES = { strength: 'Força', resistance: 'Vitalidade', speed: 'Agilidade', intelligence: 'Inteligência', perception: 'Percepção', magic: 'Afinidade mágica', luck: 'Sorte', charisma: 'Carisma' };
const definitions = [
  {id:'warrior',name:'Guerreiro',icon:'⚔',description:'Vanguarda resistente; golpes físicos poderosos.',primary:'strength',resource:'stamina',specializations:['Berserker','Campeão'],skills:[['Golpe Determinado','DAMAGE'],['Impacto Quebrador','DAMAGE'],['Postura Inabalável','DEFEND'],['Investida do Colosso','DAMAGE']]},
  {id:'swordsman',name:'Espadachim',icon:'✧',description:'Técnica, precisão e duelos.',primary:'speed',resource:'stamina',specializations:['Duelista','Lâmina Arcana'],skills:[['Corte Crescente','DAMAGE'],['Passo da Lâmina','DAMAGE'],['Guarda de Duelo','DEFEND'],['Mil Cortes','DAMAGE']]},
  {id:'mage',name:'Mago',icon:'✺',description:'Feitiços à distância; exige mana e planejamento.',primary:'magic',resource:'mana',specializations:['Elementalista','Arcanista'],skills:[['Lança Astral','DAMAGE'],['Orbe Elemental','DAMAGE'],['Barreira Arcana','DEFEND'],['Ruptura do Éter','DAMAGE']]},
  {id:'archer',name:'Arqueiro',icon:'➶',description:'Percepção, mobilidade e ataques precisos.',primary:'perception',resource:'stamina',specializations:['Patrulheiro','Olho de Águia'],skills:[['Disparo Preciso','DAMAGE'],['Marca do Caçador','OBSERVE'],['Tiro Perfurante','DAMAGE'],['Chuva de Flechas','DAMAGE']]},
  {id:'assassin',name:'Assassino',icon:'☾',description:'Agilidade, infiltração e ataques oportunos.',primary:'speed',resource:'stamina',specializations:['Dançarino Sombrio','Espião'],skills:[['Ataque das Sombras','DAMAGE'],['Olhar do Predador','OBSERVE'],['Passo Fantasma','DEFEND'],['Execução Crepuscular','DAMAGE']]},
  {id:'priest',name:'Sacerdote',icon:'✚',description:'Cura, fé e proteção do grupo.',primary:'magic',resource:'mana',specializations:['Oráculo','Templário'],skills:[['Luz Restauradora','HEAL'],['Benção Guardiã','DEFEND'],['Círculo Vital','HEAL'],['Milagre da Aurora','HEAL']]},
  {id:'knight',name:'Cavaleiro',icon:'♜',description:'Defesa disciplinada, resistência e proteção.',primary:'resistance',resource:'stamina',specializations:['Paladino','Sentinela'],skills:[['Guarda Solene','DEFEND'],['Golpe de Escudo','DAMAGE'],['Muralha Jurada','DEFEND'],['Marcha do Bastião','DAMAGE']]},
  {id:'summoner',name:'Invocador',icon:'❖',description:'Manifestações espirituais de duração limitada.',primary:'intelligence',resource:'mana',specializations:['Pactuário','Guardião Espiritual'],skills:[['Familiar Astral','DAMAGE'],['Olhos do Familiar','OBSERVE'],['Vínculo Protetor','DEFEND'],['Avatar do Pacto','DAMAGE']]},
  {id:'alchemist',name:'Alquimista',icon:'⚗',description:'Misturas, catalisadores e suporte adaptável.',primary:'intelligence',resource:'mana',specializations:['Transmutador','Médico de Campo'],skills:[['Frasco Cáustico','DAMAGE'],['Elixir Revigorante','HEAL'],['Análise de Reagentes','OBSERVE'],['Grande Transmutação','DAMAGE']]},
  {id:'artificer',name:'Artífice',icon:'⚙',description:'Engenhocas, runas mecânicas e preparação.',primary:'intelligence',resource:'stamina',specializations:['Engenheiro Rúnico','Armeiro Arcano'],skills:[['Dispositivo de Impacto','DAMAGE'],['Sensor de Campo','OBSERVE'],['Placa Reativa','DEFEND'],['Canhão Rúnico','DAMAGE']]},
  {id:'druid',name:'Druida',icon:'♧',description:'Natureza, restauração e leitura do ambiente.',primary:'magic',resource:'mana',specializations:['Guardião Verde','Metamorfo'],skills:[['Espinhos Vivos','DAMAGE'],['Seiva Restauradora','HEAL'],['Voz da Mata','OBSERVE'],['Ira da Floresta','DAMAGE']]},
  {id:'monk',name:'Monge',icon:'◉',description:'Disciplina corporal, foco e contra-ataques.',primary:'speed',resource:'stamina',specializations:['Punho Sereno','Caminhante do Vento'],skills:[['Punho Ressonante','DAMAGE'],['Respiração Firme','DEFEND'],['Leitura de Movimento','OBSERVE'],['Sequência Celeste','DAMAGE']]},
  {id:'occultist',name:'Ocultista',icon:'☿',description:'Pactos, símbolos proibidos e risco calculado.',primary:'magic',resource:'mana',specializations:['Hexer','Médium'],skills:[['Marca Abissal','DAMAGE'],['Sussurro do Véu','OBSERVE'],['Selo de Contenção','DEFEND'],['Eclipse Ritual','DAMAGE']]},
  {id:'bard',name:'Bardo',icon:'♫',description:'Presença, inspiração, manipulação social e suporte.',primary:'charisma',resource:'mana',specializations:['Menestrel de Guerra','Diplomata'],skills:[['Acorde Cortante','DAMAGE'],['Balada Restauradora','HEAL'],['Leitura de Plateia','OBSERVE'],['Hino Inquebrável','DEFEND']]},
  {id:'runist',name:'Runista',icon:'ᚱ',description:'Inscrições mágicas, preparação e controle.',primary:'intelligence',resource:'mana',specializations:['Geômetra','Selador'],skills:[['Runa de Ruptura','DAMAGE'],['Runa de Vigília','OBSERVE'],['Runa de Guarda','DEFEND'],['Matriz de Selos','DAMAGE']]},
  {id:'beastmaster',name:'Domador',icon:'🐾',description:'Vínculo com criaturas, rastreio e combate coordenado.',primary:'perception',resource:'stamina',specializations:['Falcoeiro','Guardião de Feras'],skills:[['Investida Coordenada','DAMAGE'],['Faro Compartilhado','OBSERVE'],['Proteção Instintiva','DEFEND'],['Caçada de Matilha','DAMAGE']]},
  {id:'necromancer',name:'Necromante',icon:'☠',description:'Magia funerária, lacaios temporários e drenagem de vitalidade.',primary:'magic',resource:'mana',specializations:['Senhor dos Ossos','Ceifador de Almas'],skills:[['Toque Fúnebre','DAMAGE'],['Escuta dos Mortos','OBSERVE'],['Manto Sepulcral','DEFEND'],['Legião Efêmera','DAMAGE']]},
  {id:'sorcerer',name:'Feiticeiro',icon:'✹',description:'Poder mágico instintivo, explosivo e difícil de conter.',primary:'magic',resource:'mana',specializations:['Sangue Dracônico','Tempestário'],skills:[['Rajada Instintiva','DAMAGE'],['Pulso Arcano','OBSERVE'],['Pele de Mana','DEFEND'],['Cataclismo Interior','DAMAGE']]},
  {id:'rogue',name:'Ladino',icon:'♠',description:'Truques, oportunismo, mobilidade e perícia fora de combate.',primary:'speed',resource:'stamina',specializations:['Trapaceiro','Acrobata'],skills:[['Golpe Sujo','DAMAGE'],['Mãos Ligeiras','OBSERVE'],['Evasão Improvisada','DEFEND'],['Reviravolta','DAMAGE']]},
  {id:'gunslinger',name:'Pistoleiro',icon:'✷',description:'Combate à distância com foco em ritmo, mira e munição narrativa.',primary:'perception',resource:'stamina',specializations:['Atirador de Elite','Duelista de Pólvora'],skills:[['Tiro Medido','DAMAGE'],['Olho de Mira','OBSERVE'],['Passo de Recuo','DEFEND'],['Barragem Relâmpago','DAMAGE']]},
  {id:'shaman',name:'Xamã',icon:'☯',description:'Espíritos, presságios, cura ritual e leitura do território.',primary:'magic',resource:'mana',specializations:['Voz Ancestral','Guardião Totêmico'],skills:[['Dardo Espiritual','DAMAGE'],['Presságio dos Ventos','OBSERVE'],['Totem Guardião','DEFEND'],['Coro Ancestral','HEAL']]},
  {id:'spellblade',name:'Cavaleiro Mágico',icon:'⚔️',description:'Mistura espada e arcano para alternar pressão física e mágica.',primary:'strength',resource:'mana',specializations:['Lâmina Rúnica','Cavaleiro Elemental'],skills:[['Corte Encantado','DAMAGE'],['Leitura de Fluxo','OBSERVE'],['Égide Arcana','DEFEND'],['Ruptura de Mana','DAMAGE']]},
  {id:'chronomancer',name:'Cronomante',icon:'⌛',description:'Manipula janelas de tempo sem apagar consequências já resolvidas.',primary:'intelligence',resource:'mana',specializations:['Tecelão de Instantes','Oráculo Temporal'],skills:[['Fenda de Instante','DAMAGE'],['Eco do Próximo Segundo','OBSERVE'],['Atraso Temporal','DEFEND'],['Hora Zero','DAMAGE']]},
  {id:'illusionist',name:'Ilusionista',icon:'◐',description:'Engano sensorial, distração, infiltração e controle de atenção.',primary:'charisma',resource:'mana',specializations:['Tecelão de Sonhos','Mestre dos Espelhos'],skills:[['Estilhaço Falso','DAMAGE'],['Olhos do Espelho','OBSERVE'],['Duplo Fantasma','DEFEND'],['Labirinto Prismático','DAMAGE']]},
];

const UNLOCK_LEVELS = [1,3,6,10];
export const CLASSES = definitions.map((def) => ({
  id:def.id,name:def.name,icon:def.icon,description:def.description,identity:def.description,
  combatStyle:def.resource==='mana'?'Mágico':'Físico',primaryAttributes:[def.primary,'resistance'],
  initialAttributes:{strength:10,speed:10,resistance:10,intelligence:10,perception:10,magic:10,luck:10,charisma:10,initiative:0,defense:0,attack:0,[def.primary]:14},
  resources:[def.resource],initialSkills:[`${def.id}-1`],futureSkills:UNLOCK_LEVELS.slice(1).map(level=>`${def.id}-${level}`),specializations:def.specializations,specializationLevel:5,paths:buildClassPaths(def),
  skills:UNLOCK_LEVELS.map((unlockLevel,i)=>{const [name,effect]=def.skills[i];return {id:`${def.id}-${unlockLevel}`,classId:def.id,name,description:`${effect==='HEAL'?'Restaura vida ou estabiliza um aliado':effect==='DEFEND'?'Cria uma vantagem defensiva por um turno':effect==='OBSERVE'?'Investiga a cena e amplia a chance de obter informação confiável':'Atinge um alvo reconhecido'}; respeita alcance, custo, oposição e resultado do servidor.`,level:1,range:def.resource==='mana'||['archer','beastmaster'].includes(def.id)?'Mesma cena, alvo visível':'Curto alcance na mesma cena',category:effect==='DAMAGE'?'Ofensiva':effect==='HEAL'?'Suporte':effect==='OBSERVE'?'Exploração':'Defesa',type:'ACTIVE',effect,cost:{[def.resource]:8+i*3},resource:def.resource,cooldown:1+Math.floor(i/2),unlockLevel,requirements:{level:unlockLevel,classId:def.id},unlockCondition:`Nível ${unlockLevel} na classe ${def.name}`,evolutions:i<UNLOCK_LEVELS.length-1?[`${def.id}-${UNLOCK_LEVELS[i+1]}`]:[],effects:[{type:effect,base:8+i*5,scaling:def.primary}],priority:i,passive:false,maxRank:3};})
}));
export const ITEMS = [
 {templateId:'potion',name:'Poção de Vida',icon:'⚗',description:'Recupera até 25 HP. Usar consome sua ação.',type:'CONSUMABLE',rarity:'COMMON',value:15,effects:[{type:'HEAL',value:25}],attributes:{}},
 {templateId:'sword',name:'Espada de Viajante',icon:'⚔',description:'Lâmina equilibrada. +2 ataque quando equipada.',type:'WEAPON',slot:'weapon',rarity:'COMMON',value:30,requirements:{level:1},effects:[],attributes:{attack:2}},
 {templateId:'robe',name:'Manto do Limiar',icon:'♧',description:'Tecido reforçado. +2 defesa quando equipado.',type:'ARMOR',slot:'armor',rarity:'COMMON',value:25,requirements:{level:1},effects:[],attributes:{defense:2}},
 {templateId:'sigil',name:'Selo da Travessia',icon:'❖',description:'Prova de seu encontro com a entidade do limiar.',type:'QUEST',rarity:'RARE',value:0,effects:[],attributes:{}},
];
export function makeItem(id,quantity=1){const item=ITEMS.find(x=>x.templateId===id);assert(item,'UNKNOWN_ITEM','Item não pertence ao catálogo.');return {...structuredClone(item),id:newId(),quantity};}

const GENERATED_ITEM_TYPES = new Set(['WEAPON','ARMOR','CONSUMABLE','MATERIAL','QUEST','ACCESSORY']);
const GENERATED_ITEM_RARITIES = new Set(['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']);
const GENERATED_ITEM_ATTRIBUTES = ['attack','defense','strength','resistance','speed','intelligence','perception','magic','luck','charisma'];
const RARITY_STAT_CAP = {COMMON:2,UNCOMMON:3,RARE:4,EPIC:5,LEGENDARY:6};

export function makeGeneratedItem(raw = {}, { request = '', level = 1 } = {}) {
  const safeLevel = clamp(Math.trunc(Number(level || 1)), 1, 50);
  const fallbackName = cleanText(request, 80) || 'Item singular';
  const name = cleanText(raw.name || fallbackName, 80) || fallbackName;
  const requestedType = cleanText(raw.type || 'MATERIAL', 30).toUpperCase();
  const type = GENERATED_ITEM_TYPES.has(requestedType) ? requestedType : 'MATERIAL';
  const requestedRarity = cleanText(raw.rarity || 'COMMON', 30).toUpperCase();
  const rarity = GENERATED_ITEM_RARITIES.has(requestedRarity) ? requestedRarity : 'COMMON';
  const icon = cleanText(raw.icon || ({WEAPON:'⚔',ARMOR:'♜',CONSUMABLE:'⚗',MATERIAL:'◇',QUEST:'❖',ACCESSORY:'✦'}[type] || '◇'), 12);
  const description = cleanText(raw.description || `${name}, criado especialmente para esta campanha.`, 600);
  const slot = type === 'WEAPON' ? 'weapon' : type === 'ARMOR' ? 'armor' : type === 'ACCESSORY' ? 'accessory' : '';
  const perStatCap = Math.max(1, Math.min(RARITY_STAT_CAP[rarity], 2 + Math.floor((safeLevel - 1) / 5)));
  let remainingBudget = perStatCap * 2;
  const attributes = {};
  if (slot) {
    for (const key of GENERATED_ITEM_ATTRIBUTES) {
      if (remainingBudget <= 0) break;
      const requested = Math.max(0, Math.trunc(Number(raw.attributes?.[key] || 0)));
      if (!requested) continue;
      const granted = Math.min(requested, perStatCap, remainingBudget);
      if (granted > 0) {
        attributes[key] = granted;
        remainingBudget -= granted;
      }
    }
  }
  const effects = [];
  if (type === 'CONSUMABLE') {
    const heal = (Array.isArray(raw.effects) ? raw.effects : []).find((effect) => cleanText(effect?.type, 20).toUpperCase() === 'HEAL');
    if (heal) effects.push({ type: 'HEAL', value: clamp(Math.trunc(Number(heal.value || 0)), 1, Math.min(100, 20 + safeLevel * 5)) });
  }
  const quantity = clamp(Math.trunc(Number(raw.quantity || 1)), 1, 20);
  const requirementLevel = clamp(Math.trunc(Number(raw.requirements?.level || safeLevel)), 1, Math.min(50, safeLevel + 5));
  return {
    id: newId(),
    name,
    icon,
    description,
    type,
    slot: slot || undefined,
    rarity,
    value: clamp(Math.trunc(Number(raw.value || 0)), 0, 10_000),
    weight: Number(clamp(Number(raw.weight || (type === 'WEAPON' ? 2 : type === 'ARMOR' ? 3 : 0.2)), 0, 100).toFixed(2)),
    quantity,
    requirements: slot ? { level: requirementLevel } : undefined,
    effects,
    attributes,
    metadata: { source: 'host-ai', request: cleanText(request, 500), generated: true },
  };
}
export function ensureProgression(c){c.level ||=1;c.experience ||=0;c.attributePoints ??=0;c.coins ??=75;c.skillPoints ??=0;c.cooldowns ||= {};c.specialization ||= '';c.titles ||= [];c.downtimePoints ??=1;c.progressionVersion ||=1;ensureAdvancedProgression(c,Object.keys(ATTRIBUTES));return c;}
export function chooseClass(c,id){const cls=CLASSES.find(x=>x.id===id);assert(cls,'INVALID_CLASS','Escolha uma classe disponível.');ensureProgression(c);c.classId=id;c.identity.class=cls.name;c.attributes=structuredClone(cls.initialAttributes);c.powers=cls.skills.filter(s=>s.unlockLevel<=c.level).map(s=>structuredClone(s));c.cooldowns={};c.classChosen=true;c.pathId='';c.specialization='';return c;}
export function xpRequired(level){return level*100;}
export function grantXp(c,amount){ensureProgression(c);c.experience+=Math.max(0,Math.min(10000,Math.trunc(amount)));const previous=c.level;while(c.experience>=xpRequired(c.level)&&c.level<50){c.experience-=xpRequired(c.level);c.level++;c.attributePoints+=3;c.skillPoints++;if(c.level%2===0)c.talentPoints=(c.talentPoints||0)+1;c.resources.maxHp+=5;c.resources.hp=Math.min(c.resources.maxHp,c.resources.hp+5);}const cls=CLASSES.find(x=>x.id===c.classId);for(const s of cls?.skills||[]){if(s.unlockLevel<=c.level&&!c.powers.some(p=>p.id===s.id))c.powers.push(structuredClone(s));}syncPathSkills(c,cls);return c.level-previous;}
export function allocate(c,allocation){ensureProgression(c);assert(allocation&&typeof allocation==='object'&&!Array.isArray(allocation),'INVALID_POINTS','Informe os atributos.');let total=0;for(const [k,v]of Object.entries(allocation)){assert(Object.hasOwn(ATTRIBUTES,k)&&Number.isSafeInteger(v)&&v>=0&&v<=100,'INVALID_POINTS','Pontos inválidos.');total+=v;}assert(total>0&&total<=c.attributePoints,'INSUFFICIENT_POINTS','Pontos insuficientes.');for(const[k,v]of Object.entries(allocation))c.attributes[k]+=v;c.attributePoints-=total;const hp=(allocation.resistance||0)*3,mp=(allocation.intelligence||0)*2;c.resources.maxHp+=hp;c.resources.hp+=hp;c.resources.maxMana+=mp;c.resources.mana+=mp;}
export function train(c,id){ensureProgression(c);const s=c.powers.find(x=>x.id===id);assert(s&&s.classId===c.classId,'UNKNOWN_SKILL','Habilidade indisponível.');assert(c.skillPoints>0&&(s.level||1)<3,'SKILL_LOCKED','Sem pontos ou habilidade no nível máximo.');s.level=(s.level||1)+1;s.effects[0].base+=3;c.skillPoints--;}

export const STORY_SKILLS=[{id:'echo-sense',name:'Sentido dos Ecos',description:'Técnica aprendida ao alcançar a Guilda. Observar com ela recebe +4 no teste de percepção.',level:1,type:'ACTIVE',category:'Exploração',resource:'mana',cost:{mana:4},cooldown:1,unlockLevel:1,unlockCondition:'Concluir Quatro almas, um novo horizonte',effects:[{type:'OBSERVE',base:4}],evolutions:[],maxRank:1}];
