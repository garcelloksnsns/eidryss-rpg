import test from 'node:test';
import assert from 'node:assert/strict';
import { NarrativeService } from '../src/game/narrative.js';

function context() {
  return {
    campaign:{name:'Groq Test',settings:{aiProvider:'groq',aiModel:'openai/gpt-oss-120b',tone:'Isekai',allowPvp:false,worldRules:'',narrativeDepth:'cinematic'},world:{location:'Vale',npcs:[],entities:[],events:[]},memory:{facts:[],recentSummaries:[],chapters:[],npcMemories:{}}},
    turn:{number:1}, characters:[], actions:[], mechanics:{characters:[],world:{location:'Vale',npcs:[],entities:[],events:[]},outcomes:[],events:[]},
  };
}

test('Groq usa endpoint direto, chave gsk no header e GPT-OSS 120B', async (t) => {
  const originalFetch=globalThis.fetch; let call;
  t.after(()=>{globalThis.fetch=originalFetch;});
  globalThis.fetch=async (url,options)=>{call={url:String(url),options,body:JSON.parse(options.body)};return new Response(JSON.stringify({choices:[{message:{content:'{"narrative":"ok","summary":"ok","world_updates":{"location":"","time":"","weather":"","flags":[]},"character_updates":[],"events":[],"npc_dialogues":[],"memory_updates":{"facts_add":[],"facts_close":[]}}'}}]}),{status:200});};
  const service=new NarrativeService({groqApiKey:'',groqModel:'openai/gpt-oss-120b',groqBaseUrl:'https://api.groq.com/openai/v1',aiTimeoutMs:1000});
  const result=await service.generate(context(),{apiKey:'gsk_teste_seguro_123456',model:'openai/gpt-oss-120b'});
  assert.equal(result.provider,'groq');
  assert.equal(call.url,'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(call.options.headers.authorization,'Bearer gsk_teste_seguro_123456');
  assert.equal(call.body.model,'openai/gpt-oss-120b');
  assert.equal(call.body.response_format.type,'json_object');
  assert.equal(call.body.max_tokens,4096);
  assert.equal(call.url.includes('gsk_'),false);
});

test('Groq aceita GPT-OSS 20B como preset econômico', async (t) => {
  const originalFetch=globalThis.fetch; let model;
  t.after(()=>{globalThis.fetch=originalFetch;});
  globalThis.fetch=async (_url,options)=>{model=JSON.parse(options.body).model;return new Response(JSON.stringify({choices:[{message:{content:'{"narrative":"ok"}'}}]}),{status:200});};
  const service=new NarrativeService({groqApiKey:'',groqModel:'openai/gpt-oss-120b',groqBaseUrl:'https://api.groq.com/openai/v1',aiTimeoutMs:1000});
  const ctx=context(); ctx.campaign.settings.aiModel='openai/gpt-oss-20b';
  await service.generate(ctx,{apiKey:'gsk_teste_seguro_123456',model:'openai/gpt-oss-20b'});
  assert.equal(model,'openai/gpt-oss-20b');
});
