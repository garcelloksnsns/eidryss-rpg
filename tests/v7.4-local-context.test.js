import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { client, register, testApplication } from './helpers.js';
import { createDefaultCharacter } from '../src/game/engine.js';
import { advanceCampaignMemory, createCampaignMemory } from '../src/game/memory.js';
import { buildSelectiveContext } from '../src/game/narrative.js';
import { buildActiveScenes, canTraverseRoute, ensureAtlas, routeBetween } from '../src/game/world.js';

function mockNarrative(){return {availability:()=>({gemini:true}),generate:async()=>({narrative:'Cena pública simulada.',summary:'Turno simulado.',world_updates:{location:'',time:'',weather:'',flags:[]},character_updates:[],events:[],npc_dialogues:[],memory_updates:{facts_add:[],facts_close:[]},provider:'mock'}),generateSecret:async context=>({narrative:`Segredo: ${context.action.text}`,summary:'Segredo resolvido.',npc_dialogues:[],provider:'mock'})};}

function baseWorld(){return {location:'Cidade Global',time:'Tarde',weather:'Brisa',entities:[],npcs:[],quests:[],events:[],flags:{},ecosystem:{biome:'Campos',dangerLevel:2,resources:[],factions:[]}};}

test('memória de NPC usa a localização do personagem e não o local global',()=>{
 const actor=createDefaultCharacter('u','c','Luiz');actor.location='Vila de Aurora';actor.position=actor.location;
 const npc={id:'mira',name:'Mira',location:'Vila de Aurora',personality:'Prática',relationships:{},knowledge:[]};const world={...baseWorld(),location:'Bosque dos Ecos',npcs:[npc]};
 const campaign={id:'c',description:'',settings:{worldRules:''},world,memory:createCampaignMemory()};
 advanceCampaignMemory(campaign,{turnNumber:2,summary:'Luiz falou com Mira.',actions:[{characterId:actor.id,text:'Converso com Mira sobre a ponte.'}],events:[],characters:[actor]});
 assert.equal(campaign.memory.npcMemories.mira.interactions.length,1);assert.equal(campaign.memory.npcMemories.mira.interactions[0].characterId,actor.id);
});

test('cenas locais agrupam jogadores e geografia bloqueia ponte destruída sem meio real',()=>{
 const world=baseWorld();const atlas=ensureAtlas(world);const a=createDefaultCharacter('u1','c','A');const b=createDefaultCharacter('u2','c','B');const c=createDefaultCharacter('u3','c','C');a.location='Bosque dos Ecos';b.location='Vila de Aurora';c.location='Vila de Aurora';
 const scenes=buildActiveScenes(world,[a,b,c],4);assert.deepEqual(new Set(Object.keys(scenes)),new Set(['Bosque dos Ecos','Vila de Aurora']));assert.equal(scenes['Vila de Aurora'].characterIds.length,2);
 const route=routeBetween(atlas,'grove','ruins');assert.equal(route.bridge.status,'BROKEN');assert.equal(canTraverseRoute(route,a,'Viajo para as ruínas.').allowed,false);a.inventory.push({name:'Bote dobrável'});assert.equal(canTraverseRoute(route,a,'Uso o bote e atravesso.').allowed,true);
});

test('Context Builder injeta apenas poder, item, NPC e cena referenciados',()=>{
 const actor=createDefaultCharacter('u','c','Lina');actor.location='Vila de Aurora';actor.position=actor.location;actor.powers=[{id:'eclipse',name:'Corte do Eclipse',description:'Corte focado.',cost:{stamina:5},cooldown:1,effects:[{type:'DAMAGE'}]},{id:'unused',name:'Tempestade Inútil',description:'Não citada.',cost:{mana:8},cooldown:2,effects:[]}];actor.inventory=[{id:'map',name:'Mapa antigo',type:'QUEST',quantity:1,effects:[],attributes:{}},{id:'unused-item',name:'Martelo distante',type:'WEAPON',quantity:1,effects:[],attributes:{}}];actor.cooldowns={};actor.equipment={};
 const remote=Array.from({length:30},(_,i)=>({id:`remote-${i}`,name:`REMOTO_${i}`,location:'Cidade Adormecida',relationships:{}}));const world={...baseWorld(),npcs:[{id:'mira',name:'Mira',location:'Vila de Aurora',description:'Sacerdotisa local.',relationships:{}},...remote],atlas:{current:'village',nodes:[{id:'village',name:'Vila de Aurora',known:true,biome:'Campos',terrain:'plains',features:['rio ao norte']},{id:'remote',name:'Cidade Adormecida',known:true,biome:'Ruínas'}],edges:[],routes:[]}};
 const campaign={name:'Teste',description:'',settings:{tone:'Sandbox',worldRules:'',allowPvp:false,narrativeDepth:'balanced'},world,memory:createCampaignMemory()};const actions=[{characterId:actor.id,text:'Uso Corte do Eclipse enquanto mostro o Mapa antigo para Mira.'}];const mechanics={characters:[actor],world,outcomes:[],events:[]};const payload=buildSelectiveContext({campaign,turn:{number:1},characters:[actor],actions,mechanics});const text=JSON.stringify(payload);
 assert.match(text,/Corte do Eclipse/);assert.match(text,/Mapa antigo/);assert.match(text,/Mira/);assert.equal(text.includes('Tempestade Inútil'),false);assert.equal(text.includes('Martelo distante'),false);assert.equal(text.includes('REMOTO_29'),false);
});

test('export normal redige segredo alheio, bruto preserva e salvar cria checkpoint',async t=>{
 const app=await testApplication({narrative:mockNarrative()});t.after(app.cleanup);const owner=client(app.base),friend=client(app.base);await register(owner,7401);await register(friend,7402);
 const created=await owner.request('/api/campaigns',{method:'POST',body:{name:'Atlas Vivo',description:'Teste',maxPlayers:4,minPlayers:2,introMode:'arrival',aiProvider:'gemini'}});const id=created.data.campaign.id;await friend.request('/api/campaigns/join',{method:'POST',body:{code:created.data.campaign.joinCode}});await owner.request(`/api/campaigns/${id}/start`,{method:'POST'});
 await owner.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Observo a praça.'}});await friend.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Aguardo.',secretText:'Escondo a chave sob a fonte.'}});
 const normal=await owner.request(`/api/campaigns/${id}/export`);const raw=await owner.request(`/api/campaigns/${id}/export/raw`);assert.equal(normal.data.privacy,'REDACTED');assert.match(JSON.stringify(normal.data),/AÇÃO PRIVADA/);assert.equal(JSON.stringify(normal.data).includes('Escondo a chave'),false);assert.match(JSON.stringify(raw.data),/Escondo a chave/);
 const saved=await owner.request(`/api/campaigns/${id}/save`,{method:'POST'});assert.equal(saved.data.checkpointCreated,true);const checkpoints=await fs.readdir(path.join(app.directory,'db.json.checkpoints'));assert.ok(checkpoints.some(name=>name.endsWith('.json')));
});
