import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { client, register, testApplication } from './helpers.js';
import { createDefaultCharacter } from '../src/game/engine.js';
import { buildNarrativePrompt } from '../src/game/narrative.js';

function mainNarrative(context){return {narrative:`Cena compartilhada T${context.turn.number}.`,summary:'O grupo avançou.',world_updates:{location:'',time:'',weather:'',flags:[]},character_updates:[],events:[],npc_dialogues:[],memory_updates:{facts_add:[],facts_close:[]},provider:'gemini'};}
function secretNarrative(context){return {narrative:`Cena privada de ${context.character.identity.name}: ${context.outcome?.summary||'tentativa resolvida'}`,summary:context.outcome?.summary||'Segredo resolvido.',npc_dialogues:[],provider:'gemini'};}

async function runningCampaign(t,narrative){
  const app=await testApplication({narrative});t.after(app.cleanup);
  const owner=client(app.base),friend=client(app.base);await register(owner,7301);await register(friend,7302);
  const created=await owner.request('/api/campaigns',{method:'POST',body:{name:'Caminhos Velados',description:'Teste privado.',maxPlayers:4,minPlayers:2,introMode:'arrival',aiProvider:'gemini'}});const id=created.data.campaign.id;
  await friend.request('/api/campaigns/join',{method:'POST',body:{code:created.data.campaign.joinCode}});await owner.request(`/api/campaigns/${id}/start`,{method:'POST'});
  return {app,owner,friend,id};
}

test('ação secreta chama cena compacta extra e permanece invisível aos demais',async t=>{
  let mainCalls=0,secretCalls=0;const narrative={availability:()=>({gemini:true}),generate:async context=>{mainCalls++;return mainNarrative(context);},generateSecret:async context=>{secretCalls++;return secretNarrative(context);}};
  const {app,owner,friend,id}=await runningCampaign(t,narrative);
  await friend.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Observo a praça.'}});
  const sent=await owner.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Converso normalmente.\nAção secreta: sigo Eira sem contar ao grupo.'}});
  assert.equal(sent.data.resolved,true);assert.equal(mainCalls,1);assert.equal(secretCalls,1);
  const mine=(await owner.request(`/api/campaigns/${id}/state`)).data;const theirs=(await friend.request(`/api/campaigns/${id}/state`)).data;
  assert.match(mine.lastResult.secretNarrative,/Cena privada/);assert.equal(theirs.lastResult.secretNarrative,'');
  const myHistory=(await owner.request(`/api/campaigns/${id}/history`)).data.history[0];const theirHistory=(await friend.request(`/api/campaigns/${id}/history`)).data.history[0];
  assert.ok(myHistory.actions.some(action=>action.secretText));assert.equal(JSON.stringify(theirHistory).includes('sigo Eira'),false);
  const privateEvents=app.store.read(state=>state.events.filter(event=>event.campaignId===id&&event.visibility==='PRIVATE'));assert.ok(privateEvents.length>0);
});

test('retry de cena secreta reutiliza narrativa compartilhada e não gasta chamada duplicada',async t=>{
  let mainCalls=0,secretCalls=0;const narrative={availability:()=>({gemini:true}),generate:async context=>{mainCalls++;return mainNarrative(context);},generateSecret:async context=>{secretCalls++;if(secretCalls===1)throw new Error('429 quota secreta');return secretNarrative(context);}};
  const {owner,friend,id}=await runningCampaign(t,narrative);
  await friend.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Aguardo perto do portão.'}});
  const sent=await owner.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Observo o portão.',secretText:'Investigo as pegadas sozinho.'}});assert.equal(sent.data.resolved,false);
  let state=(await owner.request(`/api/campaigns/${id}/state`)).data;assert.equal(state.turn.status,'WAITING_FOR_AI');assert.equal(mainCalls,1);assert.equal(secretCalls,1);
  const retry=await owner.request(`/api/campaigns/${id}/retry-ai`,{method:'POST'});assert.equal(retry.status,200);assert.equal(mainCalls,1);assert.equal(secretCalls,2);
  state=(await owner.request(`/api/campaigns/${id}/state`)).data;assert.equal(state.turn.number,2);assert.match(state.lastResult.secretNarrative,/Cena privada/);
});

test('interface preserva menu animado, vínculos e compositor secreto',async()=>{
  const root=new URL('..',import.meta.url).pathname;const [app,css]=await Promise.all([fs.readFile(path.join(root,'public/app.js'),'utf8'),fs.readFile(path.join(root,'public/style.css'),'utf8')]);
  assert.match(app,/id="more-menu"/);assert.match(app,/class="plus-glyph">\+</);assert.match(app,/Ação secreta/);assert.match(app,/Afeto/);assert.match(app,/Distante — última localização conhecida/);
  assert.match(css,/\.more-drawer/);assert.match(css,/\.secret-result/);assert.match(css,/\.relationship-grid/);assert.match(css,/\.scene-banner-v2 \.scene-copy/);
});

test('prompt compartilhado mantém cidades inativas fora do contexto',()=>{
  const a=createDefaultCharacter('u1','c','Lina'),b=createDefaultCharacter('u2','c','Noa');a.location='Cidade A';a.position='Cidade A';b.location='Cidade B';b.position='Cidade B';
  const remote=Array.from({length:80},(_,index)=>({id:`r${index}`,name:`REMOTO_${index}`,location:'Cidade Adormecida',description:'Conteúdo que não deve consumir tokens.',relationships:{}}));
  const world={location:'Cidade A',time:'Noite',weather:'Chuva',entities:[],npcs:[{id:'a',name:'Local A',location:'Cidade A',relationships:{}},{id:'b',name:'Local B',location:'Cidade B',relationships:{}},...remote],quests:[],events:[],flags:{},atlas:{current:'a',nodes:[{id:'a',name:'Cidade A',known:true,biome:'Campo'},{id:'b',name:'Cidade B',known:true,biome:'Bosque'}],edges:[['a','b']]},ecosystem:{dangerLevel:1,resources:[],factions:[]}};
  const campaign={name:'Teste',description:'Teste',settings:{tone:'Sandbox',worldRules:'',allowPvp:false,narrativeDepth:'balanced',worldEventFrequency:'normal'},world};const actions=[{id:'x',characterId:a.id,text:'Observo a rua.',submittedAt:'1'}];const mechanics={characters:[a,b],world,outcomes:[],events:[]};
  const prompt=buildNarrativePrompt({campaign,turn:{number:1},characters:[a,b],actions,mechanics});assert.match(prompt,/Local A/);assert.match(prompt,/Local B/);assert.equal(prompt.includes('REMOTO_79'),false);assert.ok(prompt.length<30000);
});
