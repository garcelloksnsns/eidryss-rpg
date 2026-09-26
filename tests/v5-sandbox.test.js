import test from 'node:test';
import assert from 'node:assert/strict';
import { client, register, testApplication } from './helpers.js';
import { createDefaultCharacter, resolveActionCheck, resolveMechanics } from '../src/game/engine.js';
import { CLASSES, chooseClass } from '../src/game/catalog.js';
import { advanceWorldDirector, ensureWorldDirector, initializeIsekai } from '../src/game/world.js';
import { sanitizeAiDirectives } from '../src/game/engine.js';
import { advanceCampaignMemory, createCampaignMemory } from '../src/game/memory.js';

test('5.0 separa proprietário do mestre e permite transferir a sessão sem transferir servidor ou chaves', async (t) => {
  const app=await testApplication(); t.after(app.cleanup);
  const owner=client(app.base), friend=client(app.base);
  const u1=(await register(owner,501)).data.user; const u2=(await register(friend,502)).data.user;
  const created=await owner.request('/api/campaigns',{method:'POST',body:{name:'Autoridade separada',maxPlayers:4,minPlayers:2}});
  const id=created.data.campaign.id, code=created.data.campaign.joinCode;
  await friend.request('/api/campaigns/join',{method:'POST',body:{code}});
  await owner.request(`/api/campaigns/${id}/start`,{method:'POST'});
  let state=(await owner.request(`/api/campaigns/${id}/state`)).data;
  assert.equal(state.campaign.ownerId,u1.id); assert.equal(state.campaign.masterUserId,u1.id);
  const transferred=await owner.request(`/api/campaigns/${id}/master`,{method:'POST',body:{targetUserId:u2.id}});
  assert.equal(transferred.status,200); assert.equal(transferred.data.campaign.masterUserId,u2.id);
  const friendState=(await friend.request(`/api/campaigns/${id}/state`)).data;
  assert.equal(friendState.isMaster,true); assert.equal(friendState.isOwner,false);
  assert.equal((await friend.request(`/api/campaigns/${id}/pause`,{method:'POST'})).status,200);
  assert.equal((await friend.request(`/api/campaigns/${id}/resume`,{method:'POST'})).status,200);
  assert.equal((await friend.request(`/api/campaigns/${id}/export`)).status,403);
  const reclaimed=await owner.request(`/api/campaigns/${id}/master`,{method:'POST',body:{targetUserId:u1.id}});
  assert.equal(reclaimed.data.campaign.masterUserId,u1.id);
});

test('5.0 permite ausência voluntária sem expulsar jogador nem apagar personagem', async (t) => {
  const app=await testApplication(); t.after(app.cleanup);
  const owner=client(app.base), friend=client(app.base);
  await register(owner,511); const u2=(await register(friend,512)).data.user;
  const created=await owner.request('/api/campaigns',{method:'POST',body:{name:'Drop in drop out',maxPlayers:4,minPlayers:2,continueWithAbsentees:true}});
  const id=created.data.campaign.id, code=created.data.campaign.joinCode;
  await friend.request('/api/campaigns/join',{method:'POST',body:{code}}); await owner.request(`/api/campaigns/${id}/start`,{method:'POST'});
  assert.equal((await friend.request(`/api/campaigns/${id}/availability`,{method:'POST',body:{away:true}})).status,200);
  let state=(await owner.request(`/api/campaigns/${id}/state`)).data;
  const member=state.party.find(p=>p.user.id===u2.id); assert.equal(member.away,true); assert.ok(member.character);
  assert.equal(state.turn.total,1);
  assert.equal((await friend.request(`/api/campaigns/${id}/availability`,{method:'POST',body:{away:false}})).status,200);
  state=(await owner.request(`/api/campaigns/${id}/state`)).data;
  assert.equal(state.party.find(p=>p.user.id===u2.id).away,false); assert.equal(state.turn.total,2);
});

test('ações criativas e sociais usam teste autoritativo com sucesso parcial e falha possíveis', () => {
  const c=createDefaultCharacter('u','c','Lina'); chooseClass(c,'bard');c.location='Portão';c.position='Portão';
  const good=resolveActionCheck(c,{text:'Convenço a guarda a me ouvir',attribute:'charisma',danger:1},()=>0.01);
  const bad=resolveActionCheck(c,{text:'Convenço a guarda a me ouvir',attribute:'charisma',danger:5,difficulty:'hard'},()=>0.99);
  assert.equal(good.degree,'critical_success'); assert.equal(bad.degree,'failure');
  const campaign={settings:{allowPvp:false,difficulty:'hard',worldEventFrequency:'low'},world:{location:'Portão',entities:[],npcs:[{id:'n1',name:'Eira',location:'Portão',status:'ALIVE',relationships:{},memory:[]}],quests:[],events:[],ecosystem:{dangerLevel:5,resources:[],factions:[]}}};
  const action={id:'a',characterId:c.id,text:'Converso com Eira e tento convencê-la a revelar tudo.',submittedAt:'2026-01-01'};
  const result=resolveMechanics({campaign,characters:[c],actions:[action],turnNumber:1,random:()=>0.99});
  assert.equal(result.outcomes[0].success,false);
  assert.equal(result.world.npcs[0].relationships[c.id].affection,0);
  assert.equal(result.world.npcs[0].relationships[c.id].trust,0);
  assert.equal(result.world.npcs[0].relationships[c.id].suspicion,3);
  assert.ok(result.events.some(e=>e.type==='ACTION_CHECKED'));
  assert.ok(result.events.some(e=>e.type==='COMPLICATION'));
});

test('diretor nunca força evento a 100% mesmo após muitos turnos silenciosos', () => {
  const world={location:'Estrada',entities:[],npcs:[],events:[],quests:[],ecosystem:{dangerLevel:5}}; initializeIsekai(world,'arrival');
  const director=ensureWorldDirector(world); director.turnsSinceEvent=100; director.tension=100;
  const events=[]; const kind=advanceWorldDirector(world,[createDefaultCharacter('u','c','Lina')],events,101,{random:()=>0.999,settings:{worldEventFrequency:'chaotic'}});
  assert.equal(kind,null); assert.equal(events.length,0);
});

test('relógios do mundo avançam fora da ação direta dos jogadores e podem concluir', () => {
  const world={location:'Estrada',entities:[],npcs:[],events:[],quests:[],ecosystem:{dangerLevel:1}}; initializeIsekai(world,'arrival');
  const director=ensureWorldDirector(world); director.clocks=[{id:'c1',title:'Culto se organiza',kind:'FACTION',progress:5,segments:6,status:'ACTIVE',visibility:'PUBLIC',description:'Movimento oculto.'}];
  const events=[];
  advanceWorldDirector(world,[createDefaultCharacter('u','c','Lina')],events,7,{random:()=>0,settings:{worldEventFrequency:'high'}});
  assert.equal(director.clocks[0].status,'COMPLETED');
  assert.ok(events.some(e=>e.type==='WORLD_CLOCK_ADVANCED'));
  assert.ok(events.some(e=>e.type==='WORLD_CLOCK_COMPLETED'));
});

test('memória diferencia fato de rumor em vez de canonizar automaticamente', () => {
  const raw=sanitizeAiDirectives({narrative:'Cena.',summary:'Resumo.',memory_updates:{facts_add:[{category:'NPC',text:'Dizem que o rei é um dragão.',importance:3,truth_status:'RUMOR',source:'Eira'}]}});
  const campaign={description:'Teste',settings:{worldRules:''},world:{npcs:[]},memory:createCampaignMemory('Teste','')};
  advanceCampaignMemory(campaign,{turnNumber:1,summary:'Um rumor surgiu.',memoryUpdates:raw.memoryUpdates,events:[],actions:[]});
  const fact=campaign.memory.facts.find(f=>f.text.includes('rei'));
  assert.equal(fact.truthStatus,'RUMOR'); assert.equal(fact.source,'Eira');
});

test('catálogo 5.0 oferece 24 classes e progressão até habilidade de nível 10', () => {
  assert.equal(CLASSES.length,24);
  for(const cls of CLASSES){assert.equal(cls.skills.length,4);assert.deepEqual(cls.skills.map(s=>s.unlockLevel),[1,3,6,10]);}
});

test('5.0 usa provedor reserva sem rerrolar o turno quando a IA principal falha', async (t) => {
  const calls=[];
  const narrative={
    availability:()=>({gemini:true,openai:true,grok:true,groq:true,openrouter:true,custom:false}),
    async generate(context){
      calls.push(context.campaign.settings.aiProvider);
      if(context.campaign.settings.aiProvider==='gemini') throw new Error('429 quota exceeded');
      return {narrative:'A reserva assumiu sem alterar o destino já calculado.',summary:'Fallback concluído.',world_updates:{},character_updates:[],events:[],memory_updates:{facts_add:[],facts_close:[]},provider:'groq'};
    },
  };
  const app=await testApplication({narrative}); t.after(app.cleanup);
  const browser=client(app.base); await register(browser,531);
  const created=await browser.request('/api/campaigns',{method:'POST',body:{name:'Fallback seguro',maxPlayers:2,minPlayers:1,aiProvider:'gemini',aiFallbackProvider:'groq'}});
  const id=created.data.campaign.id;
  assert.equal(created.data.campaign.settings.aiFallbackProvider,'groq');
  await browser.request(`/api/campaigns/${id}/start`,{method:'POST'});
  const action=await browser.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Observo a estrada antes de avançar.'}});
  assert.equal(action.status,200); assert.equal(action.data.resolved,true);
  assert.deepEqual(calls,['gemini','groq']);
  const history=(await browser.request(`/api/campaigns/${id}/history`)).data.history;
  assert.equal(history[0].provider,'groq');
  assert.ok(history[0].events.some(e=>e.type==='AI_PROVIDER_FALLBACK'&&e.data.from==='gemini'&&e.data.to==='groq'));
});

test('5.0 permite trocar senha e revoga outras sessões sem derrubar a sessão atual', async (t) => {
  const app=await testApplication(); t.after(app.cleanup);
  const first=client(app.base), second=client(app.base);
  const created=await register(first,541); const username=created.data.user.username;
  const login2=await second.request('/api/auth/login',{method:'POST',body:{username,password:'senha-forte-541',remember:true}});
  assert.equal(login2.status,200);
  let profile=(await first.request('/api/profile')).data;
  assert.equal(profile.security.activeSessions,2);
  const changed=await first.request('/api/profile/password',{method:'PATCH',body:{currentPassword:'senha-forte-541',newPassword:'senha-nova-bem-forte-541'}});
  assert.equal(changed.status,200);
  assert.equal((await first.request('/api/profile')).status,200);
  assert.equal((await second.request('/api/profile')).status,401);
  assert.equal((await second.request('/api/auth/login',{method:'POST',body:{username,password:'senha-forte-541'}})).status,401);
  assert.equal((await second.request('/api/auth/login',{method:'POST',body:{username,password:'senha-nova-bem-forte-541'}})).status,200);
  profile=(await first.request('/api/profile')).data;
  assert.equal(profile.security.activeSessions,2);
  const revoked=await first.request('/api/profile/sessions/revoke-others',{method:'POST'});
  assert.equal(revoked.status,200); assert.equal(revoked.data.revoked,1);
});
