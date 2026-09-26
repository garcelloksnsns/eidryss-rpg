import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createConfig } from './core/config.js';
import { AppError, errorPayload } from './core/errors.js';
import { clearSessionCookie, parseCookies, sessionCookie } from './core/security.js';
import { SecretVault } from './core/secret-vault.js';
import { JsonStore } from './data/store.js';
import { NarrativeService } from './game/narrative.js';
import { RealtimeHub } from './realtime.js';
import { GameService } from './services/game-service.js';
import { SystemStatus } from './core/system-status.js';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

function send(response, status, body, headers = {}) {
  const isBuffer = Buffer.isBuffer(body);
  const content = isBuffer || typeof body === 'string' ? body : JSON.stringify(body);
  response.writeHead(status, {
    'content-type': isBuffer ? 'application/octet-stream' : typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(content),
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    ...headers,
  });
  response.end(content);
}

async function readJson(request, maxBytes) {
  let total = 0;
  const parts = [];
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) throw new AppError('PAYLOAD_TOO_LARGE', 'A requisição é grande demais.', 413);
    parts.push(chunk);
  }
  if (!parts.length) return {};
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw new AppError('INVALID_JSON', 'O corpo da requisição não contém JSON válido.', 400); }
}

function tokenFrom(request) {
  const cookies = parseCookies(request.headers.cookie);
  return cookies.eidryss_session || cookies.germinal_session;
}


function isSecureRequest(request) {
  if (request.socket.encrypted) return true;
  return String(request.headers['x-forwarded-proto'] || '').split(',').some((value) => value.trim().toLowerCase() === 'https');
}

function currentUser(request, service) {
  const user = service.sessionUser(tokenFrom(request));
  if (!user) throw new AppError('NOT_AUTHENTICATED', 'Entre na sua conta para continuar.', 401);
  return user;
}

function match(pathname, pattern) {
  const found = pathname.match(pattern);
  return found ? found.slice(1).map(decodeURIComponent) : null;
}

async function apiHandler(request, response, url, service, config, systemStatus) {
  const { method } = request;
  const pathname = url.pathname;
  if (method === 'GET' && pathname === '/api/health') return send(response, 200, { ok: true, name: config.brandName, version: config.appVersion });
  const liveStatus = await systemStatus.read();
  if (method === 'GET' && pathname === '/api/client/meta') return send(response, 200, {
    name: config.brandName,
    version: config.appVersion,
    clientRevision: Math.max(config.clientRevision, Number(liveStatus.clientRevision || 0)),
    maintenance: Boolean(liveStatus.maintenance),
    maintenanceMessage: liveStatus.message,
    changedAt: liveStatus.changedAt,
  });
  if (liveStatus.maintenance) return send(response, 503, {
    code: 'MAINTENANCE',
    message: liveStatus.message || 'Eidryss está em manutenção.',
    maintenance: true,
    clientRevision: liveStatus.clientRevision,
  }, { 'retry-after': '10' });
  if (method === 'GET' && pathname === '/api/meta') return send(response, 200, { aiAvailability: service.narrative.availability(), maxActionLength: config.maxActionLength });

  if (method === 'POST' && pathname === '/api/auth/register') {
    const body = await readJson(request, config.maxBodyBytes);
    const result = await service.register(body);
    const maxAge = body.remember === false ? null : Math.floor(config.sessionTtlMs / 1_000);
    return send(response, 201, { user: result.user }, { 'set-cookie': sessionCookie(result.token, maxAge, { secure: isSecureRequest(request) }) });
  }
  if (method === 'POST' && pathname === '/api/auth/login') {
    const body = await readJson(request, config.maxBodyBytes);
    const result = await service.login(body);
    const maxAge = body.remember === false ? null : Math.floor(config.sessionTtlMs / 1_000);
    return send(response, 200, { user: result.user }, { 'set-cookie': sessionCookie(result.token, maxAge, { secure: isSecureRequest(request) }) });
  }
  if (method === 'POST' && pathname === '/api/auth/logout') {
    await service.logout(tokenFrom(request));
    return send(response, 200, { ok: true }, { 'set-cookie': clearSessionCookie({ secure: isSecureRequest(request) }) });
  }
  if (method === 'GET' && pathname === '/api/auth/me') return send(response, 200, { user: currentUser(request, service) });

  const user = currentUser(request, service);
  if (method === 'POST' && pathname === '/api/profile/ai/test') return send(response,200,await service.testAi(user.id,await readJson(request,config.maxBodyBytes)));
  if (method === 'GET' && pathname === '/api/profile') return send(response, 200, service.profile(user.id));
  if (method === 'PATCH' && pathname === '/api/profile') return send(response, 200, await service.updateProfile(user.id, await readJson(request, config.maxBodyBytes)));
  if (method === 'PATCH' && pathname === '/api/profile/password') return send(response, 200, await service.changePassword(user.id, tokenFrom(request), await readJson(request, config.maxBodyBytes)));
  if (method === 'POST' && pathname === '/api/profile/sessions/revoke-others') return send(response, 200, await service.revokeOtherSessions(user.id, tokenFrom(request)));
  if (method === 'PATCH' && pathname === '/api/profile/ai') return send(response, 200, await service.saveAiCredential(user.id, await readJson(request, config.maxBodyBytes)));
  if (method === 'POST' && pathname === '/api/demo') return send(response, 201, await service.createDemoCampaign(user.id));
  if (method === 'GET' && pathname === '/api/campaigns') return send(response, 200, { campaigns: service.listCampaigns(user.id) });
  if (method === 'POST' && pathname === '/api/campaigns') return send(response, 201, { campaign: await service.createCampaign(user.id, await readJson(request, config.maxBodyBytes)) });
  if (method === 'POST' && pathname === '/api/campaigns/join') {
    const body = await readJson(request, config.maxBodyBytes);
    return send(response, 200, { campaign: await service.joinCampaign(user.id, body.code) });
  }

  let params;
  if ((params=match(pathname,/^\/api\/campaigns\/([^/]+)\/(character-operation|admin-operation|dev-operation)$/)) && method==='POST') {
    const methodName={'character-operation':'characterOperation','admin-operation':'adminOperation','dev-operation':'devOperation'}[params[1]];
    return send(response,200,await service[methodName](params[0],user.id,await readJson(request,config.maxBodyBytes)));
  }
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/state$/)) && method === 'GET') return send(response, 200, service.campaignState(params[0], user.id));
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/history$/)) && method === 'GET') return send(response, 200, { history: service.history(params[0], user.id) });
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/character$/)) && method === 'GET') return send(response, 200, { character: service.campaignState(params[0], user.id).character });
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/inventory$/)) && method === 'GET') return send(response, 200, { inventory: service.campaignState(params[0], user.id).character.inventory });
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/powers$/)) && method === 'GET') return send(response, 200, { powers: service.campaignState(params[0], user.id).character.powers });
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/character$/)) && method === 'PATCH') return send(response, 200, { character: await service.updateMyCharacter(params[0], user.id, await readJson(request, config.maxBodyBytes)) });
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/settings$/)) && method === 'PATCH') return send(response, 200, { campaign: await service.updateSettings(params[0], user.id, await readJson(request, config.maxBodyBytes)) });
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/master$/)) && method === 'POST') { const body=await readJson(request,config.maxBodyBytes); return send(response,200,await service.transferMaster(params[0],user.id,body.targetUserId)); }
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/availability$/)) && method === 'POST') { const body=await readJson(request,config.maxBodyBytes); return send(response,200,await service.setAvailability(params[0],user.id,Boolean(body.away))); }
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/lobby-ready$/)) && method === 'POST') { const body=await readJson(request,config.maxBodyBytes); return send(response,200,await service.setLobbyReady(params[0],user.id,Boolean(body.ready))); }
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/co-master$/)) && method === 'POST') { const body=await readJson(request,config.maxBodyBytes); return send(response,200,await service.delegateCoMaster(params[0],user.id,body.targetUserId,body.enabled!==false)); }
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/vote$/)) && method === 'POST') return send(response,201,await service.createVote(params[0],user.id,await readJson(request,config.maxBodyBytes)));
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/vote\/cast$/)) && method === 'POST') { const body=await readJson(request,config.maxBodyBytes); return send(response,200,await service.castVote(params[0],user.id,body.optionId)); }
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/vote\/close$/)) && method === 'POST') return send(response,200,await service.closeVote(params[0],user.id));
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/start$/)) && method === 'POST') return send(response, 200, await service.startCampaign(params[0], user.id));
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/pause$/)) && method === 'POST') return send(response, 200, { campaign: await service.pauseCampaign(params[0], user.id, true) });
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/resume$/)) && method === 'POST') return send(response, 200, { campaign: await service.pauseCampaign(params[0], user.id, false) });
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/action$/)) && (method === 'POST' || method === 'PUT')) {
    const body = await readJson(request, config.maxBodyBytes);
    return send(response, 200, await service.submitAction(params[0], user.id, body.text, { replace: method === 'PUT' }));
  }
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/force-resolve$/)) && method === 'POST') return send(response, 200, await service.forceResolve(params[0], user.id));
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/retry-ai$/)) && method === 'POST') return send(response, 200, await service.retryTurn(params[0], user.id));
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/save$/)) && method === 'POST') return send(response, 200, await service.saveCampaign(params[0], user.id));
  if ((params = match(pathname, /^\/api\/campaigns\/([^/]+)\/export$/)) && method === 'GET') return send(response, 200, service.exportCampaign(params[0], user.id), { 'content-disposition': `attachment; filename="eidryss-campaign-${params[0]}.json"` });

  throw new AppError('NOT_FOUND', 'Rota não encontrada.', 404);
}

async function staticHandler(response, pathname, publicDir) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(publicDir, requested);
  if (!resolved.startsWith(`${path.resolve(publicDir)}${path.sep}`) && resolved !== path.join(path.resolve(publicDir), 'index.html')) throw new AppError('NOT_FOUND', 'Arquivo não encontrado.', 404);
  try {
    const content = await fs.readFile(resolved);
    return send(response, 200, content, { 'content-type': MIME[path.extname(resolved)] || 'application/octet-stream', 'cache-control': path.extname(resolved) === '.html' ? 'no-cache' : 'public, max-age=3600' });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const fallback = await fs.readFile(path.join(publicDir, 'index.html'));
    return send(response, 200, fallback, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
  }
}

export async function createApplication(overrides = {}) {
  const config = createConfig(overrides);
  const store = await new JsonStore(config.dataFile).init();
  const systemStatus = await new SystemStatus(config.systemStatusFile).init();
  const vault = overrides.vault || await SecretVault.open(config.vaultKeyFile);
  const narrative = overrides.narrative || new NarrativeService(config);
  const service = new GameService({ store, narrative, config, vault });
  const attempts=new Map();
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if(request.method==='POST'&&/^\/api\/auth\/(login|register)$/.test(url.pathname)){
        const key=request.socket.remoteAddress;const now=Date.now();const value=attempts.get(key);const bucket=value&&value.until>now?value:{count:0,until:now+60000};bucket.count++;attempts.set(key,bucket);
        if(attempts.size>10000)for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);
        if(bucket.count>20)throw new AppError('RATE_LIMIT','Muitas tentativas. Aguarde um minuto.',429);
      }
      const origin=request.headers.origin;
      if(origin && new URL(origin).host!==request.headers.host && !['GET','HEAD'].includes(request.method))throw new AppError('BAD_ORIGIN','Origem não autorizada.',403);
      if (url.pathname.startsWith('/api/')) await apiHandler(request, response, url, service, config, systemStatus);
      else await staticHandler(response, url.pathname, config.publicDir);
    } catch (error) {
      if (response.headersSent) return response.end();
      const payload = errorPayload(error);
      send(response, payload.status, payload.body);
    }
  });
  const hub = new RealtimeHub(server, service);
  service.setHub(hub);
  await service.recoverInterruptedTurns();
  return {
    config, store, systemStatus, vault, narrative, service, server,
    start: () => new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, config.host, () => { server.off('error', reject); resolve(server.address()); }); }),
    stop: () => new Promise((resolve) => {
      hub.close();
      server.closeAllConnections?.();
      server.close(() => resolve());
    }),
  };
}
