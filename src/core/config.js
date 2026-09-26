import fs from 'node:fs';
import path from 'node:path';

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const source = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function createConfig(overrides = {}) {
  const rootDir = overrides.rootDir || process.cwd();
  loadEnv(path.join(rootDir, '.env'));
  const port = Number(overrides.port ?? process.env.PORT ?? 8000);
  const sessionDays = Number(process.env.SESSION_DAYS || 30);
  const preferredDataFile = path.resolve(rootDir, overrides.dataFile ?? process.env.DATA_FILE ?? './data/eidryss.json');
  const legacyDataFile = path.resolve(rootDir, './data/germinal.json');
  const resolvedDataFile = overrides.dataFile || process.env.DATA_FILE || fs.existsSync(preferredDataFile) || !fs.existsSync(legacyDataFile) ? preferredDataFile : legacyDataFile;

  return {
    rootDir,
    devTools: overrides.devTools ?? (process.env.EIDRYSS_DEV_TOOLS === '1' || process.env.GERMINAL_DEV_TOOLS === '1'),
    host: overrides.host ?? process.env.HOST ?? '0.0.0.0',
    port: Number.isInteger(port) && port >= 0 && port <= 65535 ? port : 8000,
    dataFile: resolvedDataFile,
    vaultKeyFile: path.resolve(rootDir, overrides.vaultKeyFile ?? process.env.VAULT_KEY_FILE ?? './data/server.key'),
    systemStatusFile: path.resolve(rootDir, overrides.systemStatusFile ?? process.env.SYSTEM_STATUS_FILE ?? './data/system-status.json'),
    brandName: 'Eidryss',
    appVersion: '7.0.0',
    clientRevision: 700,
    publicDir: path.resolve(rootDir, overrides.publicDir ?? './public'),
    sessionTtlMs: Math.max(1, sessionDays) * 86_400_000,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    openAiModel: process.env.OPENAI_MODEL || 'gpt-5.6-sol',
    openAiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    grokApiKey: process.env.GROK_API_KEY || '',
    grokModel: process.env.GROK_MODEL || 'grok-4.6',
    grokBaseUrl: (process.env.GROK_BASE_URL || 'https://api.x.ai/v1').replace(/\/$/, ''),
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    groqBaseUrl: (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
    openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openRouterModel: process.env.OPENROUTER_MODEL || 'openai/gpt-5.6-terra',
    openRouterBaseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
    customApiKey: process.env.CUSTOM_AI_API_KEY || '',
    customModel: process.env.CUSTOM_AI_MODEL || '',
    customBaseUrl: (process.env.CUSTOM_AI_BASE_URL || '').replace(/\/$/, ''),
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 45_000),
    maxBodyBytes: 128 * 1024,
    maxActionLength: 2_000,
  };
}
