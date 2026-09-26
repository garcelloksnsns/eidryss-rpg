import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultCharacter } from '../src/game/engine.js';
import { buildSceneProjection, visibleEventsForCharacter } from '../src/game/perception.js';
import { ensureAtlas, progressWorld, resolveTravelIntent } from '../src/game/world.js';
import { sanitizeNarrativeBundle } from '../src/game/narrative.js';
import { client, register, testApplication } from './helpers.js';

function world(){const value={location:'Encruzilhada de Eidryss',time:'Tarde',weather:'Céu limpo',entities:[],npcs:[],quests:[],events:[],flags:{},ecosystem:{biome:'Campos',dangerLevel:1,resources:[],factions:[]}};ensureAtlas(value);return value;}
function actor(user,id,name,location='Vila de Aurora'){const value=createDefaultCharacter(user,'campaign',name);value.id=id;value.location=location;value.position=location;value.zone='centro';value.knownLocationIds=['crossroads','village','guild','grove','ruins'];return value;}

test('mesmo inimigo possui uma ação canônica e uma posição para todos os observadores',()=>{
 const w=world(),a=actor('u1','a','A'),b=actor('u2','b','B');const wolf={id:'wolf-17',name:'Lobo',location:'Vila de Aurora',zone:'centro',hp:12,maxHp:30,status:'ALIVE'};w.entities.push(wolf);
 const events=[{id:'evt-wolf',type:'ENEMY_ACTED',turnNumber:2,sourceId:wolf.id,targetId:a.id,data:{action:'RETREAT',from:'praça',to:'porta norte',hpAfter:12,description:'O lobo recuou uma vez para a porta norte.'}}];const projection=buildSceneProjection(w,[a,b],events,2,{a:'u1',b:'u2'});
 assert.equal(projection.scenes.length,1);assert.deepEqual(visibleEventsForCharacter(projection,'a').map(e=>e.id),['evt-wolf']);assert.deepEqual(visibleEventsForCharacter(projection,'b').map(e=>e.id),['evt-wolf']);assert.equal(w.entities[0].lastAction.eventId,'evt-wolf');assert.equal(projection.canonicalEvents.filter(e=>e.sourceId==='wolf-17').length,1);
});

test('evento global conserva o mesmo eventId em todas as cenas',()=>{
 const w=world(),a=actor('u1','a','A','Vila de Aurora'),b=actor('u2','b','B','Bosque dos Ecos'),c=actor('u3','c','C','Guilda dos Viajantes');const event={id:'global-eclipse-01',type:'WORLD_EVENT',scope:'GLOBAL',data:{description:'O sol desapareceu atrás de um eclipse violeta.'}};const projection=buildSceneProjection(w,[a,b,c],[event],9);
 assert.equal(projection.scenes.length,3);for(const scene of projection.scenes)assert.deepEqual(scene.visibleEventIds,['global-eclipse-01']);
});

test('evento próximo alcança personagens próximos e não o distante',()=>{
 const w=world(),a=actor('u1','a','A','Vila de Aurora'),b=actor('u2','b','B','Vila de Aurora'),c=actor('u3','c','C','Bosque dos Ecos');a.zone='portão';b.zone='portão';const event={id:'explosion-1',type:'WORLD_EVENT',scope:'NEARBY',radiusKm:.8,sourceId:a.id,data:{description:'Uma explosão sacudiu o portão.'}};const projection=buildSceneProjection(w,[a,b,c],[event],4);
 assert.deepEqual(new Set(projection.canonicalEvents[0].observerCharacterIds),new Set(['a','b']));assert.equal(visibleEventsForCharacter(projection,'c').length,0);
});

test('resposta narrativa rejeita sceneId, eventId e destinatário inventados',()=>{
 const projection={turnId:'turn-1',scenes:[{sceneId:'scene-real',visibleEventIds:['event-real']}],canonicalEvents:[{id:'event-real'}]};const base={turn_id:'turn-1',scenes:[{scene_id:'scene-real',narrative:'Cena válida.',referenced_event_ids:['event-real']}],private_fragments:[],summary:'ok',memory_updates:{facts_add:[],facts_close:[]},npc_dialogues:[]};assert.equal(sanitizeNarrativeBundle(base,projection,[]).valid,true);assert.equal(sanitizeNarrativeBundle({...base,scenes:[{...base.scenes[0],scene_id:'scene-falsa'}]},projection,[]).valid,false);assert.equal(sanitizeNarrativeBundle({...base,scenes:[{...base.scenes[0],referenced_event_ids:['evento-inventado']}]},projection,[]).valid,false);assert.equal(sanitizeNarrativeBundle({...base,private_fragments:[{recipient_user_id:'intruso',text:'segredo',summary:'',referenced_event_ids:[]}]},projection,[{userId:'u1',events:[]}]).valid,false);
});

test('direção encontra rota, ponte quebrada bloqueia no obstáculo e não teletransporta',()=>{
 const w=world(),traveler=actor('u','a','A','Bosque dos Ecos');const intent=resolveTravelIntent(w,traveler,'Continuo andando para o norte.');assert.equal(intent.route.id,'route-grove-ruins');
 const events=[];progressWorld(w,[traveler],[{characterId:'a',text:'Continuo andando para o norte.'}],events,1,{settings:{worldEventFrequency:'low'},random:()=>.99});
 assert.equal(traveler.location,'Bosque dos Ecos');assert.equal(traveler.travel.routeId,'route-grove-ruins');assert.ok(traveler.travel.progressKm>0&&traveler.travel.progressKm<3.2);progressWorld(w,[traveler],[{characterId:'a',text:'Continuo pela trilha para frente.'}],events,2,{settings:{worldEventFrequency:'low'},random:()=>.99});assert.equal(traveler.travel.progressKm,3.2);assert.ok(events.some(event=>event.type==='TRAVEL_BLOCKED'&&event.data.obstacle==='BROKEN_BRIDGE'));
});

test('jogadores em sentidos opostos se encontram numa única rota',()=>{
 const w=world(),a=actor('u1','a','A','Encruzilhada de Eidryss'),b=actor('u2','b','B','Vila de Aurora');const events=[];progressWorld(w,[a,b],[{characterId:'a',text:'Viajo para Vila de Aurora.'},{characterId:'b',text:'Viajo para Encruzilhada de Eidryss.'}],events,3,{settings:{worldEventFrequency:'low'},random:()=>.99});
 assert.equal(a.travel.routeId,b.travel.routeId);assert.equal(a.zone,b.zone);const meetings=events.filter(event=>event.data?.kind==='ROUTE_MEETING');assert.equal(meetings.length,1);assert.deepEqual(new Set([meetings[0].sourceId,meetings[0].targetId]),new Set(['a','b']));
});

test('encontro de rota é criado uma vez para viajantes no mesmo trecho',()=>{
 const w=world(),a=actor('u1','a','A','Bosque dos Ecos'),b=actor('u2','b','B','Bosque dos Ecos');const events=[];progressWorld(w,[a,b],[{characterId:'a',text:'Sigo para sudoeste.'},{characterId:'b',text:'Sigo para sudoeste.'}],events,5,{settings:{worldEventFrequency:'normal'},random:()=>0});const encounters=events.filter(event=>event.type==='ENCOUNTER_STARTED'&&event.data?.routeId);assert.equal(encounters.length,1);assert.deepEqual(new Set(encounters[0].data.travellerIds),new Set(['a','b']));assert.equal(w.entities.filter(entity=>entity.travel?.routeId==='route-crossroads-grove').length,1);
});

async function campaign(t,narrative){const app=await testApplication({narrative});t.after(app.cleanup);const owner=client(app.base),friend=client(app.base);await register(owner,7501);await register(friend,7502);const created=await owner.request('/api/campaigns',{method:'POST',body:{name:'Janelas Canônicas',description:'Teste',maxPlayers:4,minPlayers:2,introMode:'arrival',aiProvider:'gemini'}});const id=created.data.campaign.id;await friend.request('/api/campaigns/join',{method:'POST',body:{code:created.data.campaign.joinCode}});await owner.request(`/api/campaigns/${id}/start`,{method:'POST'});return {app,owner,friend,id};}
function bundle(context,{secret=false}={}){return {turn_id:context.turn.id,scenes:context.mechanics.projection.scenes.map((scene,index)=>({scene_id:scene.sceneId,narrative:`Narrativa da cena ${index+1}: ${scene.location}.`,referenced_event_ids:scene.visibleEventIds})),private_fragments:secret?context.mechanics.secretPhases.map(phase=>({recipient_user_id:phase.userId,text:`Fragmento privado de ${phase.userId}.`,summary:'Segredo resolvido.',referenced_event_ids:phase.events.map(event=>event.id)})):[],summary:'Todas as cenas avançaram na mesma realidade.',memory_updates:{facts_add:[],facts_close:[]},npc_dialogues:[],provider:'mock'};}

test('cenas separadas recebem narrativas diferentes em uma única requisição',async t=>{
 let calls=0;const narrative={availability:()=>({gemini:true}),generate:async context=>{calls++;return bundle(context);}};const {app,owner,friend,id}=await campaign(t,narrative);await app.store.mutate(state=>{const chars=state.characters.filter(c=>c.campaignId===id);chars[0].location='Vila de Aurora';chars[0].position=chars[0].location;chars[1].location='Bosque dos Ecos';chars[1].position=chars[1].location;});await friend.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Observo o bosque.'}});await owner.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Observo a vila.'}});assert.equal(calls,1);const mine=(await owner.request(`/api/campaigns/${id}/state`)).data.lastResult,theirs=(await friend.request(`/api/campaigns/${id}/state`)).data.lastResult;assert.notEqual(mine.sceneId,theirs.sceneId);assert.notEqual(mine.narrative,theirs.narrative);
});

test('segredo volta na mesma requisição e nunca aparece para outro jogador',async t=>{
 let calls=0,secretCalls=0;const narrative={availability:()=>({gemini:true}),generate:async context=>{calls++;return bundle(context,{secret:true});},generateSecret:async()=>{secretCalls++;throw new Error('não deveria chamar fallback');}};const {owner,friend,id}=await campaign(t,narrative);await friend.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Aguardo na praça.'}});await owner.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Observo a fonte.',secretText:'Escondo a chave sob a fonte.'}});assert.equal(calls,1);assert.equal(secretCalls,0);const mine=(await owner.request(`/api/campaigns/${id}/state`)).data,theirs=(await friend.request(`/api/campaigns/${id}/state`)).data;assert.match(mine.lastResult.secretNarrative,/Fragmento privado/);assert.equal(theirs.lastResult.secretNarrative,'');assert.equal(JSON.stringify(await friend.request(`/api/campaigns/${id}/history`)).includes('Fragmento privado'),false);
});
