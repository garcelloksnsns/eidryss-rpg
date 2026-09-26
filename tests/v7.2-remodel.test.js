import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { client, register, testApplication } from './helpers.js';
import { createDefaultCharacter } from '../src/game/engine.js';
import { advanceQuestJournal, advanceWorldDirector, ensureAtlas, ensureQuestJournal, publicEventForecast } from '../src/game/world.js';

function baseWorld(){
  return {
    location:'Encruzilhada de Eidryss', time:'Amanhecer', weather:'Céu limpo',
    ecosystem:{biome:'Floresta ancestral',dangerLevel:3,ambience:'Folhas sussurram.',resources:[],factions:[]},
    entities:[],npcs:[],events:[],quests:[],flags:{},metadata:{},
  };
}

test('7.2 salva preferências de interface por usuário sem alterar outro jogador', async (t) => {
  const app=await testApplication();t.after(app.cleanup);
  const a=client(app.base),b=client(app.base);
  await register(a,7201);await register(b,7202);
  const updated=await a.request('/api/profile/preferences',{method:'PATCH',body:{performanceMode:'ultra',motionMode:'reduced',density:'compact',textScale:'large',mapDetail:'minimal',ambientEffects:false}});
  assert.equal(updated.status,200);
  assert.deepEqual(updated.data.preferences,{performanceMode:'ultra',motionMode:'reduced',density:'compact',textScale:'large',mapDetail:'minimal',ambientEffects:false});
  const profileA=await a.request('/api/profile');
  const profileB=await b.request('/api/profile');
  assert.equal(profileA.data.preferences.performanceMode,'ultra');
  assert.equal(profileA.data.preferences.mapDetail,'minimal');
  assert.equal(profileB.data.preferences.performanceMode,'auto');
  assert.equal(profileB.data.preferences.mapDetail,'rich');
});

test('Atlas Vivo 2.0 migra mapas antigos e preserva descoberta atual', () => {
  const world=baseWorld();
  world.atlas={current:'village',nodes:[{id:'village',name:'Vila customizada',known:true,visited:true,x:20,y:55}],edges:[['crossroads','village']]};
  const atlas=ensureAtlas(world);
  assert.equal(atlas.version,2);
  assert.ok(atlas.nodes.length>=10);
  assert.equal(atlas.current,'village');
  assert.equal(atlas.nodes.find(n=>n.id==='village').name,'Vila customizada');
  assert.equal(atlas.nodes.find(n=>n.id==='village').visited,true);
  assert.ok(atlas.nodes.some(n=>n.id==='sanctum'));
});

test('diretor de mundo permite reforço aleatório durante combate sem garantir evento', () => {
  const world=baseWorld();ensureAtlas(world);
  world.entities.push({id:'e1',name:'Lobo hostil',location:world.location,type:'ENEMY',hp:20,maxHp:20,status:'ALIVE',attributes:{speed:4,resistance:4,attack:1}});
  const forecast=publicEventForecast(world,{worldEventFrequency:'chaotic'});
  assert.ok(forecast.triggerChance<=90);
  assert.equal(forecast.possibilities.find(p=>p.id==='encounter').label,'Reforço inesperado');
  const actor=createDefaultCharacter('u1','c1','Ari');
  const events=[];
  const created=advanceWorldDirector(world,[actor],events,3,{random:()=>0,settings:{worldEventFrequency:'chaotic'},context:'combat'});
  assert.equal(created,'ENCOUNTER');
  const encounter=events.find(e=>e.type==='ENCOUNTER_STARTED');
  assert.equal(encounter?.data?.reinforcement,true);
  assert.equal(encounter?.data?.context,'combat');
});

test('diário estruturado acompanha objetivo e conclui missão por viagem', () => {
  const world=baseWorld();
  world.quests=[{id:'first-path',name:'Primeiro horizonte',description:'Chegue à guilda.',status:'ACTIVE',rewardXp:60}];
  ensureQuestJournal(world);
  world.location='Guilda dos Viajantes';
  const events=[];
  advanceQuestJournal(world,events,4);
  assert.equal(world.quests[0].objectives[0].completed,true);
  assert.equal(world.quests[0].status,'COMPLETED');
  assert.ok(events.some(e=>e.type==='QUEST_UPDATED'));
  assert.ok(events.some(e=>e.type==='QUEST_COMPLETED'));
});

test('remodel 7.2 expõe Atlas, radar, diário e preferências pessoais na interface', async () => {
  const source=await fs.readFile(path.resolve('public/app.js'),'utf8');
  const css=await fs.readFile(path.resolve('public/style.css'),'utf8');
  assert.match(source,/Atlas Vivo 2\.0/);
  assert.match(source,/O que pode acontecer agora/);
  assert.match(source,/Diário Vivo/);
  assert.match(source,/game-personal-settings/);
  assert.match(source,/performanceMode/);
  assert.match(source,/Cinemático/);
  assert.match(source,/Ultra leve/);
  assert.match(css,/data-quality="ultra"/);
  assert.match(css,/\.atlas-v2-canvas/);
  assert.match(css,/\.quest-card-v2/);
  assert.match(css,/\.personal-settings-sheet/);
});

test('7.2 usa revisão 720 em HTML, service worker e servidor', async () => {
  const [html,sw,app,config]=await Promise.all([
    fs.readFile(path.resolve('public/index.html'),'utf8'),
    fs.readFile(path.resolve('public/sw.js'),'utf8'),
    fs.readFile(path.resolve('public/app.js'),'utf8'),
    fs.readFile(path.resolve('src/core/config.js'),'utf8'),
  ]);
  assert.match(html,/style\.css\?v=720/);assert.match(html,/app\.js\?v=720/);
  assert.match(sw,/eidryss-static-v720/);assert.match(app,/sw\.js\?v=720/);
  assert.match(config,/clientRevision: 720/);assert.match(config,/appVersion: '7\.2\.0'/);
});
