import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import { testApplication } from './helpers.js';

test('telas reais geram HTML seguro e expõem controles conforme estado e permissões', async t=>{
 const app=await testApplication();t.after(app.cleanup);
 const {user}=await app.service.register({username:'uitest',displayName:'<script>attack</script>',password:'test-password'});
 const campaign=await app.service.createCampaign(user.id,{name:'<img onerror=attack>',description:'Campanha',introMode:'divine'});
 const game=app.service.campaignState(campaign.id,user.id);
 const source=(await fs.readFile('public/app.js','utf8')).replace(/\nboot\(\);/,'');
 const sandbox={document:{querySelector:()=>({})},localStorage:{getItem:()=>null},navigator:{},window:{},console,setTimeout,clearTimeout,WebSocket:{OPEN:1}};
 vm.createContext(sandbox);vm.runInContext(source+`;globalThis.screens={storyTab,characterTab,skillsTab,inventoryTab,mapTab,journalTab,groupTab,settingsTab,devTab};`,sandbox);
 for(const [name,render]of Object.entries(sandbox.screens)){
   const html=render(game);assert.equal(typeof html,'string');assert.doesNotMatch(html,/<script>|<img onerror|NaN|\[object Object\]/,name);
 }
 assert.doesNotMatch(sandbox.screens.characterTab(game),/name="powers"/);
 assert.match(sandbox.screens.characterTab(game),/name="classId"/);
 assert.doesNotMatch(sandbox.screens.mapTab(game),/Ruínas da Lua/);
 game.campaign.state='ACTIVE';assert.match(sandbox.screens.settingsTab(game),/id="pause"/);
 game.campaign.state='PAUSED';assert.match(sandbox.screens.settingsTab(game),/id="resume"/);assert.match(sandbox.screens.settingsTab(game),/grant-ai-item|Criar item com IA/);
 game.isOwner=false;assert.doesNotMatch(sandbox.screens.settingsTab(game),/id="admin-form"|name="aiApiKey"/);
 assert.doesNotMatch(sandbox.screens.devTab(game),/id="dev-run"/);
 game.devTools=true;assert.match(sandbox.screens.devTab(game),/id="dev-run"/);
});
