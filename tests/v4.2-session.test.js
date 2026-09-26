import test from 'node:test';
import assert from 'node:assert/strict';
import { client, register, testApplication } from './helpers.js';
import { allocate, chooseClass, grantXp } from '../src/game/catalog.js';
import { calculateDamage, createDefaultCharacter, resolveMechanics } from '../src/game/engine.js';
import { publicBestiary } from '../src/game/world.js';

test('sala de 4 pode iniciar com 2, aceitar entrada tardia e continuar com ausentes', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const owner=client(app.base), p2=client(app.base), p3=client(app.base), p4=client(app.base);
  await register(owner,201); await register(p2,202); await register(p3,203); await register(p4,204);
  const created=await owner.request('/api/campaigns',{method:'POST',body:{name:'Mesa flexível',maxPlayers:4,minPlayers:2,allowLateJoin:true,continueWithAbsentees:true}});
  assert.equal(created.status,201); const id=created.data.campaign.id, code=created.data.campaign.joinCode;
  assert.equal((await p2.request('/api/campaigns/join',{method:'POST',body:{code}})).status,200);
  const started=await owner.request(`/api/campaigns/${id}/start`,{method:'POST'}); assert.equal(started.status,200);
  let state=(await owner.request(`/api/campaigns/${id}/state`)).data; assert.equal(state.turn.total,2); assert.equal(state.campaign.settings.maxPlayers,4); assert.equal(state.campaign.settings.minPlayers,2);

  const late3=await p3.request('/api/campaigns/join',{method:'POST',body:{code}}); assert.equal(late3.status,200); assert.equal(late3.data.campaign.state,'ACTIVE');
  await owner.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Observo a estrada com cuidado.'}});
  await p2.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Permaneço ao lado do grupo.'}});
  state=(await owner.request(`/api/campaigns/${id}/state`)).data; assert.equal(state.turn.number,2); assert.equal(state.turn.total,3);

  const late4=await p4.request('/api/campaigns/join',{method:'POST',body:{code}}); assert.equal(late4.status,200);
  app.service.setHub({isOnline:(_campaign,userId)=>[state.party[0].user.id,state.party[1].user.id].includes(userId),broadcast(){}});
  const a1=await owner.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Sigo atento aos arredores.'}}); assert.equal(a1.status,200);
  const a2=await p2.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Avanço junto com meu companheiro.'}}); assert.equal(a2.status,200); assert.equal(a2.data.resolved,true);
  state=(await owner.request(`/api/campaigns/${id}/state`)).data; assert.equal(state.turn.number,3); assert.equal(state.turn.total,4);

  const editLate=await p3.request(`/api/campaigns/${id}/character`,{method:'PATCH',body:{classId:'mage',identity:{name:'Maga Tardia'}}});
  assert.equal(editLate.status,200); assert.equal(editLate.data.character.identity.class,'Mago');
});

test('level up concede pontos e alocar Força altera dano real; Vitalidade e Inteligência alteram recursos', () => {
  const base=createDefaultCharacter('u1','c1','Lina'); chooseClass(base,'warrior');
  const stronger=structuredClone(base); grantXp(stronger,100); assert.equal(stronger.level,2); assert.equal(stronger.attributePoints,3); assert.equal(stronger.skillPoints,1);
  const dummy=createDefaultCharacter('u2','c1','Alvo'); chooseClass(dummy,'knight');
  const before=calculateDamage(stronger,dummy,{base:8,scaling:'strength'},()=>0.99).damage;
  allocate(stronger,{strength:3}); const after=calculateDamage(stronger,dummy,{base:8,scaling:'strength'},()=>0.99).damage;
  assert.equal(stronger.attributePoints,0); assert.equal(stronger.attributes.strength,17); assert.ok(after>before);

  const tank=createDefaultCharacter('u3','c1','Tank'); chooseClass(tank,'knight'); grantXp(tank,100); const hp=tank.resources.maxHp; allocate(tank,{resistance:2,intelligence:1});
  assert.equal(tank.resources.maxHp,hp+6); assert.equal(tank.resources.maxMana,52);
});

test('bestiário revela conhecimento em camadas sem entregar fraqueza no primeiro encontro', () => {
  let actor=createDefaultCharacter('u1','c1','Lina'); chooseClass(actor,'archer');
  let campaign={settings:{allowPvp:false,worldEventFrequency:'low'},world:{location:'Estrada',flags:{},entities:[{id:'wolf',name:'Lobo Cinzento',type:'ENEMY',description:'Um lobo enorme.',hp:42,maxHp:42,status:'ALIVE',attributes:{speed:13,resistance:8,attack:3}}],npcs:[],events:[],ecosystem:{biome:'Floresta',dangerLevel:1,cycleIndex:0,resources:[],factions:[]}}};
  let action={id:'a1',characterId:actor.id,text:'Espero em silêncio.',submittedAt:new Date(0).toISOString()};
  let r=resolveMechanics({campaign,characters:[actor],actions:[action],turnNumber:1,random:()=>0.99}); campaign={...campaign,world:r.world}; actor=r.characters[0];
  let book=publicBestiary(r.world)[0]; assert.equal(book.tier,1); assert.equal(book.weaknesses.length,0);
  action={id:'a2',characterId:actor.id,text:'Observo e investigo o Lobo Cinzento.',submittedAt:new Date(1).toISOString()};
  r=resolveMechanics({campaign,characters:[actor],actions:[action],turnNumber:2,random:()=>0.1}); campaign={...campaign,world:r.world}; actor=r.characters[0]; book=publicBestiary(r.world)[0]; assert.equal(book.tier,2); assert.equal(book.weaknesses.length,0); assert.ok(book.behavior);
  action={id:'a3',characterId:actor.id,text:'Observo novamente o Lobo Cinzento e estudo seus movimentos.',submittedAt:new Date(2).toISOString()};
  r=resolveMechanics({campaign,characters:[actor],actions:[action],turnNumber:3,random:()=>0.1}); book=publicBestiary(r.world)[0]; assert.ok(book.tier>=3); assert.ok(book.weaknesses.length>=1);
});

test('frontend 4.2 expõe Códice e atalhos OpenRouter para GPT', async () => {
  const source=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../public/app.js',import.meta.url),'utf8'));
  assert.match(source,/Grimório, estilos e bestiário/);
  assert.match(source,/openai\/gpt-5\.6-luna/);
  assert.match(source,/openai\/gpt-5\.6-terra/);
  assert.match(source,/openai\/gpt-5\.6-sol/);
  assert.match(source,/Mínimo ativo/);
});
