import { assert } from '../core/errors.js';
import { clamp } from '../core/utils.js';

export const MASTERY_RANKS = [
  { id:'novice', name:'Iniciante', threshold:0, bonus:0, icon:'·' },
  { id:'trained', name:'Treinado', threshold:40, bonus:1, icon:'I' },
  { id:'expert', name:'Especialista', threshold:120, bonus:2, icon:'II' },
  { id:'master', name:'Mestre', threshold:300, bonus:3, icon:'III' },
  { id:'legendary', name:'Lendário', threshold:650, bonus:4, icon:'IV' },
  { id:'transcendent', name:'Transcendente', threshold:1200, bonus:5, icon:'V' },
];

const PATH_NAMES = {
  warrior:['Berserker','Campeão','Senhor da Guerra'], swordsman:['Duelista','Lâmina Arcana','Mestre da Katana'],
  mage:['Elementalista','Arcanista','Mago do Vazio'], archer:['Patrulheiro','Olho de Águia','Arqueiro Fantasma'],
  assassin:['Dançarino Sombrio','Espião','Ceifador Silencioso'], priest:['Oráculo','Templário','Hierofante'],
  knight:['Paladino','Sentinela','Cavaleiro Negro'], summoner:['Pactuário','Guardião Espiritual','Conjurador de Legiões'],
  alchemist:['Transmutador','Médico de Campo','Bombardeiro Hermético'], artificer:['Engenheiro Rúnico','Armeiro Arcano','Mecanista Astral'],
  druid:['Guardião Verde','Metamorfo','Xamã Primordial'], monk:['Punho Sereno','Caminhante do Vento','Asceta de Ferro'],
  occultist:['Hexer','Médium','Arauto do Abismo'], bard:['Menestrel de Guerra','Diplomata','Virtuose Encantador'],
  runist:['Geômetra','Selador','Escriba Celestial'], beastmaster:['Falcoeiro','Guardião de Feras','Alfa da Matilha'],
  necromancer:['Senhor dos Ossos','Ceifador de Almas','Pastor do Véu'], sorcerer:['Sangue Dracônico','Tempestário','Coração Caótico'],
  rogue:['Trapaceiro','Acrobata','Mestre das Sombras'], gunslinger:['Atirador de Elite','Duelista de Pólvora','Caçador de Recompensas'],
  shaman:['Voz Ancestral','Guardião Totêmico','Andarilho Espiritual'], spellblade:['Lâmina Rúnica','Cavaleiro Elemental','Duelista do Éter'],
  chronomancer:['Tecelão de Instantes','Oráculo Temporal','Quebrador de Ciclos'], illusionist:['Tecelão de Sonhos','Mestre dos Espelhos','Arquiteto de Miragens'],
};


const ATTRIBUTE_NAMES={strength:'Força',resistance:'Resistência',speed:'Velocidade',intelligence:'Inteligência',perception:'Percepção',magic:'Magia',luck:'Sorte',charisma:'Carisma',attack:'Ataque',defense:'Defesa',initiative:'Iniciativa'};
const attributeName=(key)=>ATTRIBUTE_NAMES[key]||key;

const PATH_ARCHETYPES = [
  {
    id:'assault', label:'Ofensivo', description:'Transforma a identidade da classe em pressão, risco e finalização.',
    milestones:(primary, secondary)=>[
      {level:5, title:'Despertar ofensivo', modifiers:{[primary]:2}, description:`+2 em ${attributeName(primary)} e libera a técnica de caminho.`},
      {level:10, title:'Ritmo de batalha', modifiers:{attack:1, luck:1}, description:'+1 Ataque e +1 Sorte.'},
      {level:15, title:'Assinatura lendária', modifiers:{[primary]:1, attack:1}, description:'A identidade ofensiva atinge sua forma avançada.'},
    ],
    skillEffect:'DAMAGE', scaling:'primary', resourceBias:'class',
  },
  {
    id:'guardian', label:'Defensivo', description:'Prioriza sobrevivência, controle de espaço e proteção do grupo.',
    milestones:(primary, secondary)=>[
      {level:5, title:'Postura guardiã', modifiers:{resistance:2}, description:'+2 Vitalidade e libera a técnica de caminho.'},
      {level:10, title:'Linha inquebrável', modifiers:{defense:2}, description:'+2 Defesa derivada.'},
      {level:15, title:'Bastião vivo', modifiers:{resistance:1,[primary]:1}, description:'Fortalece resistência e atributo principal.'},
    ],
    skillEffect:'DEFEND', scaling:'resistance', resourceBias:'stamina',
  },
  {
    id:'versatile', label:'Tático', description:'Expande exploração, mobilidade, suporte e soluções fora do combate.',
    milestones:(primary, secondary)=>[
      {level:5, title:'Leitura de campo', modifiers:{[secondary]:2}, description:`+2 em ${attributeName(secondary)} e libera a técnica de caminho.`},
      {level:10, title:'Adaptação', modifiers:{initiative:1,perception:1}, description:'+1 Iniciativa e +1 Percepção.'},
      {level:15, title:'Versatilidade absoluta', modifiers:{charisma:1,luck:1}, description:'+1 Carisma e +1 Sorte.'},
    ],
    skillEffect:'OBSERVE', scaling:'secondary', resourceBias:'class',
  },
];

export const TALENTS = [
  {id:'precision',branch:'Combate',icon:'◎',name:'Precisão',description:'Aprimora leitura de abertura e mira.',maxRank:3,modifiers:{perception:1}},
  {id:'iron-body',branch:'Combate',icon:'⬟',name:'Corpo de Ferro',description:'Condicionamento para suportar impacto.',maxRank:3,modifiers:{resistance:1}},
  {id:'tempo',branch:'Combate',icon:'⚡',name:'Ritmo de Combate',description:'Reação e iniciativa sob pressão.',maxRank:3,modifiers:{initiative:1}},
  {id:'execution',branch:'Combate',icon:'✦',name:'Finalizador',description:'Treino para transformar vantagens em dano.',maxRank:3,modifiers:{attack:1}},
  {id:'arcane-flow',branch:'Arcano',icon:'◈',name:'Fluxo Arcano',description:'Controle fino de energia sobrenatural.',maxRank:3,modifiers:{magic:1}},
  {id:'arcane-study',branch:'Arcano',icon:'⌘',name:'Estudo Hermético',description:'Conhecimento técnico de magia e artefatos.',maxRank:3,modifiers:{intelligence:1}},
  {id:'will-anchor',branch:'Arcano',icon:'◇',name:'Âncora da Vontade',description:'Disciplina para manter feitiços sob pressão.',maxRank:3,modifiers:{magic:1,resistance:1},costPerRank:2},
  {id:'fieldcraft',branch:'Exploração',icon:'⌖',name:'Sobrevivência',description:'Melhora leitura de trilhas e ambiente.',maxRank:3,modifiers:{perception:1}},
  {id:'fleet-foot',branch:'Exploração',icon:'➜',name:'Passo Veloz',description:'Mobilidade para exploração e fuga.',maxRank:3,modifiers:{speed:1}},
  {id:'maker',branch:'Exploração',icon:'⚙',name:'Artesão',description:'Aptidão prática para projetos e crafting.',maxRank:3,modifiers:{intelligence:1}},
  {id:'presence',branch:'Social',icon:'♛',name:'Presença',description:'Autoridade, empatia e negociação.',maxRank:3,modifiers:{charisma:1}},
  {id:'fortune',branch:'Social',icon:'☘',name:'Fortuna',description:'Aumenta a margem para coincidências favoráveis.',maxRank:3,modifiers:{luck:1}},
];

function secondaryFor(def={}) {
  if (def.primary === 'speed') return 'perception';
  if (def.primary === 'magic') return 'intelligence';
  if (def.primary === 'intelligence') return 'perception';
  if (def.primary === 'perception') return 'speed';
  if (def.primary === 'charisma') return 'perception';
  if (def.primary === 'resistance') return 'strength';
  return def.resource === 'mana' ? 'magic' : 'speed';
}

export function buildClassPaths(def={}) {
  const names = PATH_NAMES[def.id] || [...(def.specializations||[]), `Ascendente ${def.name||''}`].slice(0,3);
  const secondary = secondaryFor(def);
  return PATH_ARCHETYPES.map((archetype,index)=>{
    const name=names[index]||`${def.name} ${index+1}`;
    const resource=archetype.resourceBias==='class'?(def.resource||'stamina'):archetype.resourceBias;
    const scaling=archetype.scaling==='primary'?(def.primary||'strength'):archetype.scaling==='secondary'?secondary:archetype.scaling;
    return {
      id:`${def.id}-path-${archetype.id}`, name, archetype:archetype.id, style:archetype.label,
      description:`${archetype.description} Caminho de ${name}.`, unlockLevel:5,
      milestones:archetype.milestones(def.primary||'strength',secondary),
      grantedSkills:[
        {id:`${def.id}-path-${archetype.id}-5`,classId:def.id,pathId:`${def.id}-path-${archetype.id}`,name:`${name}: Despertar`,description:`Técnica exclusiva do caminho ${name}.`,type:'ACTIVE',category:archetype.skillEffect==='DAMAGE'?'Ofensiva':archetype.skillEffect==='DEFEND'?'Defesa':'Exploração',effect:archetype.skillEffect,resource,cost:{[resource]:12},cooldown:2,unlockLevel:5,requirements:{level:5,classId:def.id,pathId:`${def.id}-path-${archetype.id}`},effects:[{type:archetype.skillEffect,base:18,scaling}],priority:2,passive:false,maxRank:3},
        {id:`${def.id}-path-${archetype.id}-12`,classId:def.id,pathId:`${def.id}-path-${archetype.id}`,name:`Apogeu: ${name}`,description:`Forma avançada exclusiva de ${name}; exige domínio do caminho.`,type:'ACTIVE',category:archetype.skillEffect==='DAMAGE'?'Ofensiva':archetype.skillEffect==='DEFEND'?'Defesa':'Exploração',effect:archetype.skillEffect,resource,cost:{[resource]:20},cooldown:3,unlockLevel:12,requirements:{level:12,classId:def.id,pathId:`${def.id}-path-${archetype.id}`},effects:[{type:archetype.skillEffect,base:30,scaling}],priority:3,passive:false,maxRank:3},
      ],
    };
  });
}

export function masteryRankFor(xp=0) {
  const value=Math.max(0,Number(xp||0));
  let rank=MASTERY_RANKS[0];
  for(const candidate of MASTERY_RANKS) if(value>=candidate.threshold) rank=candidate;
  return rank;
}

export function nextMasteryRank(xp=0) {
  const value=Math.max(0,Number(xp||0));
  return MASTERY_RANKS.find(rank=>rank.threshold>value)||null;
}

export function ensureAdvancedProgression(character, attributeKeys=[]) {
  character.masteries ||= {};
  for(const key of attributeKeys) character.masteries[key] ||= {xp:0,uses:0};
  character.skillMastery ||= {};
  character.talents ||= {};
  character.talentPoints ??= Math.max(0,Math.floor((Number(character.level||1)-1)/2));
  character.pathId ||= '';
  character.progressionVersion = Math.max(2,Number(character.progressionVersion||1));
  return character;
}

export function masteryBonus(character,key) {
  return masteryRankFor(character?.masteries?.[key]?.xp||0).bonus;
}

export function gainAttributeMastery(character,key,amount=8) {
  ensureAdvancedProgression(character,[key]);
  const record=character.masteries[key];
  const before=masteryRankFor(record.xp);
  record.xp=Math.max(0,Math.round(Number(record.xp||0)+Math.max(0,Number(amount||0))));
  record.uses=Math.max(0,Number(record.uses||0))+1;
  const after=masteryRankFor(record.xp);
  return {key,before,after,xp:record.xp,rankUp:before.id!==after.id};
}

export function gainSkillMastery(character,skillId,amount=10) {
  ensureAdvancedProgression(character);
  const record=character.skillMastery[skillId] ||= {xp:0,uses:0};
  const before=masteryRankFor(record.xp);
  record.xp=Math.max(0,Math.round(Number(record.xp||0)+Math.max(0,Number(amount||0))));
  record.uses=Math.max(0,Number(record.uses||0))+1;
  const after=masteryRankFor(record.xp);
  return {skillId,before,after,xp:record.xp,rankUp:before.id!==after.id};
}

export function talentModifiers(character) {
  const result={};
  for(const talent of TALENTS){
    const rank=clamp(Math.trunc(Number(character?.talents?.[talent.id]||0)),0,talent.maxRank);
    if(!rank)continue;
    for(const[key,value]of Object.entries(talent.modifiers||{}))result[key]=(result[key]||0)+Number(value||0)*rank;
  }
  return result;
}

export function spendTalent(character,talentId) {
  ensureAdvancedProgression(character);
  const talent=TALENTS.find(item=>item.id===talentId);
  assert(talent,'UNKNOWN_TALENT','Talento inexistente.');
  const current=clamp(Math.trunc(Number(character.talents[talent.id]||0)),0,talent.maxRank);
  assert(current<talent.maxRank,'TALENT_MAXED','Talento já está no nível máximo.');
  const cost=Number(talent.costPerRank||1);
  assert(character.talentPoints>=cost,'INSUFFICIENT_TALENT_POINTS','Pontos de talento insuficientes.');
  character.talentPoints-=cost;
  character.talents[talent.id]=current+1;
  return {talent,rank:current+1};
}

export function choosePath(character,pathId,cls) {
  ensureAdvancedProgression(character);
  assert(cls&&character.classId===cls.id,'PATH_LOCKED','O caminho precisa pertencer à sua classe.');
  assert(Number(character.level||1)>=5,'PATH_LOCKED','Caminhos são liberados no nível 5.');
  assert(!character.pathId,'PATH_LOCKED','O caminho já foi escolhido para este personagem.');
  const path=(cls.paths||[]).find(item=>item.id===pathId);
  assert(path,'PATH_LOCKED','Caminho indisponível.');
  character.pathId=path.id;
  character.specialization=path.name;
  syncPathSkills(character,cls);
  return path;
}

export function syncPathSkills(character,cls) {
  if(!character?.pathId||!cls)return [];
  const path=(cls.paths||[]).find(item=>item.id===character.pathId);
  if(!path)return [];
  const added=[];
  for(const skill of path.grantedSkills||[]){
    if(Number(character.level||1)>=Number(skill.unlockLevel||1)&&!(character.powers||[]).some(power=>power.id===skill.id)){
      character.powers.push(structuredClone(skill));added.push(skill.id);
    }
  }
  return added;
}

export function pathModifiers(character,cls) {
  if(!character?.pathId||!cls)return {};
  const path=(cls.paths||[]).find(item=>item.id===character.pathId);
  if(!path)return {};
  const result={};
  for(const milestone of path.milestones||[]){
    if(Number(character.level||1)<Number(milestone.level||0))continue;
    for(const[key,value]of Object.entries(milestone.modifiers||{}))result[key]=(result[key]||0)+Number(value||0);
  }
  return result;
}

export function derivedStats(character, effective = character?.attributes || {}) {
  const a=effective||{};
  return {
    physicalPower:Math.max(0,Math.round((Number(a.strength||0)*1.2)+Number(a.attack||0)*4+Number(a.speed||0)*.25)),
    arcanePower:Math.max(0,Math.round((Number(a.magic||0)*1.25)+Number(a.intelligence||0)*.45)),
    guard:Math.max(0,Math.round(Number(a.resistance||0)*1.15+Number(a.defense||0)*4)),
    initiative:Math.max(0,Math.round(Number(a.speed||0)+Number(a.perception||0)*.35+Number(a.initiative||0)*2)),
    accuracy:Math.max(0,Math.round(Number(a.perception||0)+Number(a.speed||0)*.35)),
    influence:Math.max(0,Math.round(Number(a.charisma||0)*1.2+Number(a.luck||0)*.25)),
    exploration:Math.max(0,Math.round(Number(a.perception||0)*.8+Number(a.intelligence||0)*.45+Number(a.luck||0)*.2)),
  };
}
