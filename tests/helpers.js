import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApplication } from '../src/server.js';

function testNarrative() {
  return {
    availability: () => ({ gemini: true, openai: true, grok: true, groq: true, openrouter: true, custom: true }),
    async generate(context) {
      return { narrative: `Narrativa de teste do turno ${context.turn.number}.`, summary: 'Turno de teste resolvido.', world_updates: {}, character_updates: [], events: [], memory_updates: { facts_add: [], facts_close: [] }, provider: context.campaign.settings.aiProvider || 'gemini' };
    },
  };
}

export async function testApplication({ narrative = testNarrative(), devTools = false } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'germinal-test-'));
  const app = await createApplication({ rootDir: path.resolve('.'), dataFile: path.join(directory, 'db.json'), vaultKeyFile: path.join(directory, 'server.key'), systemStatusFile: path.join(directory, 'system-status.json'), host: '127.0.0.1', port: 0, narrative, devTools });
  const address = await app.start();
  const base = `http://127.0.0.1:${address.port}`;
  return {
    ...app,
    base,
    directory,
    cleanup: async () => { await app.stop(); await fs.rm(directory, { recursive: true, force: true }); },
  };
}

export function client(base) {
  let cookie = '';
  return {
    get cookie() { return cookie; },
    async request(route, { method = 'GET', body } = {}) {
      const response = await fetch(`${base}${route}`, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const data = await response.json().catch(() => ({}));
      return { status: response.status, data, headers: response.headers };
    },
  };
}

export async function register(api, index = 1) {
  const response = await api.request('/api/auth/register', { method: 'POST', body: { username: `jogador${index}`, displayName: `Jogador ${index}`, password: `senha-forte-${index}` } });
  return response;
}
