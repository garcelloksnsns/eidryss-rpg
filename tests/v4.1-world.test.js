import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultCharacter, resolveMechanics } from '../src/game/engine.js';
import { initializeIsekai, progressWorld } from '../src/game/world.js';
import { buildNarrativePrompt, NarrativeService } from '../src/game/narrative.js';
import { createCampaignMemory } from '../src/game/memory.js';

test('diretor do mundo cria encontro autoritativo e persistente sem depender da IA', () => {
  const world={location:'Estrada',npcs:[],entities:[],quests:[],events:[],ecosystem:{dangerLevel:3,biome:'Floresta'}};
  initializeIsekai(world,'arrival');
  const actors=[createDefaultCharacter('u','c','Lina')]; actors[0].status='ALIVE'; actors[0].level=3;
  const events=[];
  progressWorld(world,actors,[{characterId:actors[0].id,text:'Observo o caminho.'}],events,4,{random:()=>0,settings:{worldEventFrequency:'high',difficulty:'normal'}});
  assert.equal(world.entities.length>0,true);
  assert.equal(events.some(event=>event.type==='ENCOUNTER_STARTED'),true);
  assert.equal(world.director.lastEventTurn,4);
  assert.equal(world.events.length>0,true);
});

test('inimigo recém-surgido não causa dano no mesmo turno do encontro', () => {
  const character=createDefaultCharacter('u','c','Lina');
  const campaign={settings:{allowPvp:false,worldEventFrequency:'high',difficulty:'normal'},world:{location:'Estrada',entities:[],npcs:[],quests:[],events:[],ecosystem:{dangerLevel:3}}};
  initializeIsekai(campaign.world,'arrival');
  const result=resolveMechanics({campaign,characters:[character],actions:[{id:'a',characterId:character.id,text:'Observo o ambiente.',submittedAt:'2026-01-01'}],turnNumber:1,random:()=>0});
  assert.equal(result.characters[0].resources.hp,100);
  assert.equal(result.events.some(event=>event.type==='ENCOUNTER_STARTED'),true);
});

test('prompt cinematográfico exige cena longa e inclui acontecimentos do mundo', () => {
  const character=createDefaultCharacter('u','c','Lina');
  const campaign={name:'Mundo Vivo',description:'Teste',settings:{tone:'Isekai',allowPvp:false,worldRules:'',narrativeDepth:'cinematic',worldEventFrequency:'high'},world:{location:'Bosque',entities:[],npcs:[],quests:[],events:[],ecosystem:{},director:{tension:65,threads:[]}},memory:createCampaignMemory('Teste','')};
  const mechanics={characters:[character],world:{...campaign.world,events:[{turn:2,kind:'AMBIENT',title:'Sinos além da névoa',description:'Sinos ecoaram na mata.'}]},outcomes:[],events:[{type:'WORLD_EVENT',sourceId:null,targetId:null,data:{description:'Sinos ecoaram na mata.'}}]};
  const prompt=buildNarrativePrompt({campaign,turn:{number:2},characters:[character],actions:[],mechanics});
  assert.match(prompt,/520 a 900 palavras/);
  assert.match(prompt,/Sinos ecoaram na mata/);
  assert.match(prompt,/NARRATIVA VIVA/);
});

test('Gemini usa orçamento maior no modo épico e teste de conexão continua curto', async (t) => {
  const originalFetch=globalThis.fetch; const bodies=[]; t.after(()=>{globalThis.fetch=originalFetch;});
  globalThis.fetch=async(_url,options)=>{bodies.push(JSON.parse(options.body));return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"narrative":"ok"}'}]}}]}),{status:200});};
  const service=new NarrativeService({geminiApiKey:'',geminiModel:'gemini-3.8-flash',aiTimeoutMs:1000});
  const character=createDefaultCharacter('u','c','Lina');
  const base={campaign:{name:'Teste',settings:{aiProvider:'gemini',aiModel:'gemini-3.8-flash',tone:'Isekai',allowPvp:false,worldRules:'',narrativeDepth:'epic'},world:{location:'Bosque',npcs:[],entities:[],events:[]},memory:createCampaignMemory('','')},characters:[character],actions:[],mechanics:{characters:[character],world:{location:'Bosque',npcs:[],entities:[],events:[]},outcomes:[],events:[]}};
  await service.generate({...base,turn:{number:8}},{apiKey:'segredo',model:'gemini-3.8-flash'});
  await service.generate({...base,turn:{number:0}},{apiKey:'segredo',model:'gemini-3.8-flash'});
  assert.equal(bodies[0].generationConfig.maxOutputTokens,8192);
  assert.equal(bodies[1].generationConfig.maxOutputTokens,700);
});
