import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { client, register, testApplication } from './helpers.js';
import { buyMarketItem, marketPresentation, sellInventoryItem } from '../src/game/economy.js';
import { createDefaultCharacter } from '../src/game/engine.js';

test('7.0 expõe metadados de cliente e bloqueia APIs durante manutenção', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const browser = client(app.base); await register(browser, 700);

  const meta = await browser.request('/api/client/meta');
  assert.equal(meta.status, 200);
  assert.equal(meta.data.name, 'Eidryss');
  assert.equal(meta.data.version, '7.5.0');
  assert.equal(meta.data.clientRevision, 750);
  assert.equal(meta.data.maintenance, false);

  await app.systemStatus.write({ maintenance: true, message: 'Aplicando a Reforja 7.0.' });
  const blocked = await browser.request('/api/profile');
  assert.equal(blocked.status, 503);
  assert.equal(blocked.data.code, 'MAINTENANCE');
  assert.match(blocked.data.message, /Reforja 7\.0/);

  const metaDuring = await browser.request('/api/client/meta');
  assert.equal(metaDuring.status, 200);
  assert.equal(metaDuring.data.maintenance, true);

  await app.systemStatus.write({ maintenance: false });
  assert.equal((await browser.request('/api/profile')).status, 200);
});

test('7.0 torna alocação manual de atributos visível e mantém maestria em paralelo', async () => {
  const source = await fs.readFile(path.resolve('public/app.js'), 'utf8');
  assert.match(source, /function attributeAllocationPanel\(/);
  assert.match(source, /Forje seus atributos/);
  assert.match(source, /attributePoints/);
  assert.match(source, /masterySummary/);
  assert.match(source, /data-attr-inc/);
  assert.match(source, /operation:'allocate'/);
});

test('cliente Android e GitHub Actions formam pipeline de APK sem PC', async () => {
  const activity = await fs.readFile(path.resolve('android-client/app/src/main/java/com/garcello/eidryss/MainActivity.java'), 'utf8');
  const manifest = await fs.readFile(path.resolve('android-client/app/src/main/AndroidManifest.xml'), 'utf8');
  const workflow = await fs.readFile(path.resolve('.github/workflows/build-apk.yml'), 'utf8');
  assert.match(activity, /class MainActivity/);
  assert.match(activity, /api\/client\/meta/);
  assert.match(activity, /webView\.clearCache\(true\)/);
  assert.match(activity, /O mundo está sendo reforjado/);
  assert.match(activity, /onBackPressed\(\)/);
  assert.match(manifest, /android\.permission\.INTERNET/);
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /Eidryss-Android-debug\.apk/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});

test('alocação fica disponível enquanto outros agem e só trava depois da própria ação', async (t) => {
  const app = await testApplication(); t.after(app.cleanup);
  const owner=client(app.base), friend=client(app.base), third=client(app.base);
  const u1=(await register(owner,711)).data.user;
  await register(friend,712); await register(third,713);
  const made=await owner.request('/api/campaigns',{method:'POST',body:{name:'Progressão em sessão',maxPlayers:4,minPlayers:3}});
  const id=made.data.campaign.id, code=made.data.campaign.joinCode;
  await friend.request('/api/campaigns/join',{method:'POST',body:{code}});
  await third.request('/api/campaigns/join',{method:'POST',body:{code}});
  await owner.request(`/api/campaigns/${id}/start`,{method:'POST'});
  await app.store.mutate(state=>{const c=state.characters.find(x=>x.campaignId===id&&x.userId===u1.id);c.attributePoints=2;});

  assert.equal((await friend.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Observo os arredores.'}})).status,200);
  assert.equal((await owner.request(`/api/campaigns/${id}/character-operation`,{method:'POST',body:{operation:'allocate',allocation:{strength:1}}})).status,200);
  assert.equal((await owner.request(`/api/campaigns/${id}/action`,{method:'POST',body:{text:'Preparo minha posição.'}})).status,200);
  assert.equal((await owner.request(`/api/campaigns/${id}/character-operation`,{method:'POST',body:{operation:'allocate',allocation:{perception:1}}})).status,409);
});

test('economia 7.0 compra, vende e reage ao risco do mundo', () => {
  const c=createDefaultCharacter('u','c','Lina');c.coins=100;
  const calm={tension:0,ecosystem:{dangerLevel:0}},danger={tension:80,ecosystem:{dangerLevel:5}};
  const calmMarket=marketPresentation(c,calm),dangerMarket=marketPresentation(c,danger);
  assert.ok(dangerMarket.items[0].price>calmMarket.items[0].price);
  const bought=buyMarketItem(c,calm,'luminous-herb',2);
  assert.equal(bought.quantity,2);assert.equal(c.inventory.find(i=>i.name==='Ervas Luminosas').quantity,2);assert.ok(c.coins<100);
  const item=c.inventory.find(i=>i.name==='Ervas Luminosas');const before=c.coins;
  const sold=sellInventoryItem(c,calm,item.id,1);assert.equal(sold.quantity,1);assert.ok(c.coins>before);
});

test('Arsenal expõe carteira, mercado e compra/venda na interface', async () => {
  const source=await fs.readFile(path.resolve('public/app.js'),'utf8');
  assert.match(source,/Economia 7\.0/);assert.match(source,/data-buy=/);assert.match(source,/data-sell=/);assert.match(source,/wallet-pill/);
});
