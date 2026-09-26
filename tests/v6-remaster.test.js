import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, chooseClass, grantXp } from '../src/game/catalog.js';
import { createDefaultCharacter, effectiveAttributes, resolveActionCheck } from '../src/game/engine.js';
import { choosePath, gainAttributeMastery, masteryRankFor, spendTalent } from '../src/game/progression.js';
import { craft, RECIPES } from '../src/game/crafting.js';
import { client, register, testApplication } from './helpers.js';

test('6.0 expande 24 classes em 72 caminhos e 144 técnicas exclusivas de caminho',()=>{
  assert.equal(CLASSES.length,24);
  assert.equal(CLASSES.reduce((n,c)=>n+c.paths.length,0),72);
  assert.equal(CLASSES.reduce((n,c)=>n+c.paths.reduce((m,p)=>m+p.grantedSkills.length,0),0),144);
  for(const cls of CLASSES){
    assert.equal(cls.paths.length,3);
    for(const path of cls.paths){
      assert.deepEqual(path.milestones.map(m=>m.level),[5,10,15]);
      assert.deepEqual(path.grantedSkills.map(s=>s.unlockLevel),[5,12]);
    }
  }
});

test('maestria de atributo sobe por uso e altera testes de forma autoritativa',()=>{
  const c=createDefaultCharacter('u','c','Mira');chooseClass(c,'archer');
  const before=resolveActionCheck(c,{text:'Observo os rastros',attribute:'perception',danger:2},()=>0.5);
  gainAttributeMastery(c,'perception',130);
  assert.equal(masteryRankFor(c.masteries.perception.xp).name,'Especialista');
  const after=resolveActionCheck(c,{text:'Observo os rastros',attribute:'perception',danger:2},()=>0.5);
  assert.ok(after.stat>before.stat);
  assert.ok(after.chance>before.chance);
  assert.equal(after.masteryBonus,2);
});

test('talentos mudam atributos efetivos e caminhos liberam poderes próprios',()=>{
  const c=createDefaultCharacter('u','c','Kael');chooseClass(c,'warrior');
  c.talentPoints=3;
  const base=effectiveAttributes(c).perception;
  spendTalent(c,'precision');
  assert.equal(effectiveAttributes(c).perception,base+1);
  grantXp(c,1000);
  assert.ok(c.level>=5);
  const cls=CLASSES.find(x=>x.id==='warrior');
  const path=choosePath(c,cls.paths[0].id,cls);
  assert.equal(c.pathId,path.id);
  assert.ok(c.powers.some(p=>p.pathId===path.id&&p.unlockLevel===5));
  grantXp(c,7000);
  assert.ok(c.level>=12);
  assert.ok(c.powers.some(p=>p.pathId===path.id&&p.unlockLevel===12));
});

test('crafting consome materiais reais e produz item persistente',()=>{
  const c=createDefaultCharacter('u','c','Iris');
  c.inventory.push({id:'h1',name:'Ervas Luminosas',type:'MATERIAL',quantity:3},{id:'w1',name:'Frasco de Água Clara',type:'MATERIAL',quantity:1});
  const recipe=RECIPES.find(r=>r.id==='luminous-tonic');
  const result=craft(c,recipe.id);
  assert.equal(result.result.name,'Tônico Luminoso');
  assert.ok(c.inventory.some(i=>i.name==='Tônico Luminoso'));
  assert.equal(c.inventory.find(i=>i.name==='Ervas Luminosas').quantity,1);
  assert.equal(c.inventory.some(i=>i.name==='Frasco de Água Clara'),false);
});

test('6.0 adiciona prontidão, co-mestre e votação multiplayer dentro da campanha',async(t)=>{
  const app=await testApplication();t.after(app.cleanup);
  const owner=client(app.base),friend=client(app.base);
  const u1=(await register(owner,601)).data.user;const u2=(await register(friend,602)).data.user;
  const made=await owner.request('/api/campaigns',{method:'POST',body:{name:'Reforja Multiplayer',maxPlayers:4,minPlayers:2}});
  const id=made.data.campaign.id;await friend.request('/api/campaigns/join',{method:'POST',body:{code:made.data.campaign.joinCode}});
  assert.equal((await owner.request(`/api/campaigns/${id}/lobby-ready`,{method:'POST',body:{ready:true}})).status,200);
  assert.equal((await friend.request(`/api/campaigns/${id}/lobby-ready`,{method:'POST',body:{ready:true}})).status,200);
  const delegated=await owner.request(`/api/campaigns/${id}/co-master`,{method:'POST',body:{targetUserId:u2.id,enabled:true}});
  assert.equal(delegated.status,200);
  let friendState=(await friend.request(`/api/campaigns/${id}/state`)).data;
  assert.equal(friendState.isCoMaster,true);assert.equal(friendState.canControl,true);
  const vote=await friend.request(`/api/campaigns/${id}/vote`,{method:'POST',body:{prompt:'Qual rota?',options:['Ruínas','Floresta','Estrada']}});
  assert.equal(vote.status,201);assert.equal(vote.data.options.length,3);
  await owner.request(`/api/campaigns/${id}/vote/cast`,{method:'POST',body:{optionId:vote.data.options[0].id}});
  await friend.request(`/api/campaigns/${id}/vote/cast`,{method:'POST',body:{optionId:vote.data.options[1].id}});
  assert.equal((await friend.request(`/api/campaigns/${id}/vote/close`,{method:'POST'})).status,200);
  await owner.request(`/api/campaigns/${id}/start`,{method:'POST'});
  assert.equal((await friend.request(`/api/campaigns/${id}/pause`,{method:'POST'})).status,200);
  const final=(await owner.request(`/api/campaigns/${id}/state`)).data;
  assert.equal(final.campaign.state,'PAUSED');
  assert.equal(final.party.find(p=>p.user.id===u1.id).lobbyReady,true);
  assert.equal(final.party.find(p=>p.user.id===u2.id).lobbyReady,true);
});
