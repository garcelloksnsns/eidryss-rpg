const app = document.querySelector('#app');
const toastElement = document.querySelector('#toast');

const state = {
  user: null, profile: null, campaigns: [], campaignId: localStorage.getItem('germinal_campaign'), game: null,
  history: null, authMode: 'login', tab: 'story', socket: null, reconnectTimer: null, pollTimer: null,
  guideOpen: false, guideStep: 0, motionReduced: localStorage.getItem('germinal_motion') === 'reduced',
  performanceLow: localStorage.getItem('germinal_performance') === 'low' || (!localStorage.getItem('germinal_performance') && (((navigator.deviceMemory || 99) <= 4) || ((navigator.hardwareConcurrency || 99) <= 4))),
  composing: false, refreshPending: false, refreshDebounce: null,
  compactMode: localStorage.getItem('germinal_compact') === '1' || (typeof matchMedia === 'function' && matchMedia('(max-width: 390px)').matches),
  inventoryQuery: '', inventoryType: 'ALL', codexSection: 'magic', classQuery: '', classStyle: 'ALL', installPrompt: null, socketStatus: 'offline', reconnectAttempts: 0, clientMeta: null, maintenanceTimer: null,
  moreOpen:false, secretOpen:false,
};

const THEMES = { forest: 'Obsidiana', ocean: 'Oceano', ember: 'Brasas', cosmic: 'Cosmos' };
const AVATARS = ['✦', '⚔️', '🛡️', '🏹', '🔮', '🐺', '🌙', '🧭', '👑', '🦊', '🌿', '⚡'];
const AURAS = { folha: 'Folha', oceano: 'Oceano', brasa: 'Brasa', cosmico: 'Cosmos' };
const ATTRIBUTE_HELP={strength:'Aumenta dano físico',resistance:'Reduz dano físico e +3 HP por ponto alocado',speed:'Melhora iniciativa e acerto',intelligence:'+2 Mana máxima por ponto alocado',perception:'Melhora acerto e observação',magic:'Aumenta dano/cura mágicos',luck:'Críticos e pequenas vantagens',charisma:'Interações sociais e presença'};


const CLASS_SIGIL_SHAPES={
 warrior:'<path d="M16 5 9 12m-2 2-3 3m5-5 6 6M8 5l8 8m1 1 3 3"/><path d="M7 3 4 6l4 1m9-4 3 3-4 1"/>',
 swordsman:'<path d="M15 3 6 16m6-10 6 6M5 17l2 2m-4 1 4-4"/>',
 mage:'<path d="m12 3 2.2 5.2L20 10l-4.2 3.8L17 20l-5-3-5 3 1.2-6.2L4 10l5.8-1.8Z"/><circle cx="12" cy="11" r="2"/>',
 archer:'<path d="M6 3c7 3 7 15 0 18M7 12h13m-4-4 4 4-4 4"/>',
 assassin:'<path d="m15 3-2 5 3 3-7 10-4-4 10-7-3-3Z"/>',
 priest:'<circle cx="12" cy="12" r="8"/><path d="M12 5v14M7 10h10"/>',
 knight:'<path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6Z"/><path d="M12 7v10M8 11h8"/>',
 summoner:'<circle cx="12" cy="12" r="9"/><path d="m12 5 6 11H6Z"/><circle cx="12" cy="12" r="2"/>',
 alchemist:'<path d="M9 3h6M10 3v6l-5 8a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-8V3M8 14h8"/>',
 artificer:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
 druid:'<path d="M20 4C9 4 4 10 5 19c9 1 15-4 15-15Z"/><path d="M6 18c4-5 7-8 12-11"/>',
 monk:'<path d="M6 13V8a2 2 0 0 1 4 0v4M10 10V6a2 2 0 0 1 4 0v6m0-3V7a2 2 0 0 1 4 0v7c0 5-3 7-7 7-5 0-7-4-7-7a2 2 0 0 1 2-2Z"/>',
 occultist:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2"/>',
 bard:'<path d="M9 18V6l10-2v12M9 10l10-2"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
 runist:'<path d="M7 3v18M7 5l10 7-10 7m5-10 5-4m-5 10 5 4"/>',
 beastmaster:'<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="5" cy="13" r="2"/><circle cx="19" cy="13" r="2"/><path d="M8 19c0-4 8-4 8 0 0 2-2 3-4 3s-4-1-4-3Z"/>',
 necromancer:'<path d="M5 11a7 7 0 1 1 14 0c0 3-1 5-3 6v4H8v-4c-2-1-3-3-3-6Z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10 16h4M10 19v2m4-2v2"/>',
 sorcerer:'<path d="M13 2c2 5-2 6 1 10 2-2 4-3 5-6 3 6 1 16-7 16-6 0-9-6-6-11 1 3 3 4 5 5-2-5 1-8 2-14Z"/>',
 rogue:'<path d="M4 8c5-4 11-4 16 0l-2 8c-4 3-8 3-12 0Z"/><path d="M7 11h3m4 0h3M9 17l3-2 3 2"/>',
 gunslinger:'<path d="M3 9h12l3 3-4 3H9l-2 6H4l1-8H3Z"/><path d="M14 9V6h5v3"/>',
 shaman:'<path d="M12 2v20M7 5h10M6 10l6 4 6-4M7 19h10"/><circle cx="12" cy="10" r="2"/>',
 spellblade:'<path d="M14 3 6 15m5-7 5 5M5 16l3 3m-5 2 4-4"/><path d="m18 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>',
 chronomancer:'<path d="M7 3h10M7 21h10M8 3c0 5 1 6 4 9-3 3-4 4-4 9m8-18c0 5-1 6-4 9 3 3 4 4 4 9"/><path d="M9 8h6m-6 8h6"/>',
 illusionist:'<path d="M3 9c4-4 8-4 12 0-4 4-8 4-12 0Zm6 0h.01M9 15c4-4 8-4 12 0-4 4-8 4-12 0Zm6 0h.01"/>',
};
const classSigil=(id,label='')=>`<svg class="class-sigil-svg" viewBox="0 0 24 24" role="img" aria-label="${esc(label||id)}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${CLASS_SIGIL_SHAPES[id]||'<path d="M12 3 20 12 12 21 4 12Z"/><circle cx="12" cy="12" r="3"/>'}</svg>`;

const GUIDE_STEPS = [
  { tab: 'story', title: 'Olá, eu sou a Íris!', text: 'Eu acompanho o tutorial. Na Aventura você envia a ação compartilhada e, se quiser, abre uma ação secreta com resultado visível somente para você.' },
  { tab: 'story', title: 'Turnos simultâneos', text: 'HP mede sua vida, Mana alimenta magia e Stamina sustenta esforço físico. Envie uma intenção, não um resultado garantido: o servidor resolve as regras e a IA narra o resultado.' },
  { tab: 'story', title: 'Mundo vivo', text: 'A História também mostra bioma, clima, perigo, recursos e NPCs. Você pode explorar, coletar, descansar ou conversar: cada escolha altera o estado salvo do mundo.' },
  { tab: 'character', title: 'Seu personagem', text: 'Aqui ficam identidade, atributos e recursos. Velocidade e iniciativa afetam a ordem; força, resistência, percepção, magia e sorte influenciam os resultados.' },
  { tab: 'skills', title: 'Códice de combate', text: 'Magias e estilos mostram custos, recargas e progressão. O Bestiário cresce ao encontrar, observar e derrotar criaturas; fraquezas só aparecem depois de estudo suficiente.' },
  { tab: 'inventory', title: 'Itens e equipamento', text: 'Itens têm quantidade, raridade, efeitos e modificadores. Equipamentos alteram a ficha real do personagem e consumíveis entram nas regras do turno.' },
  { tab: 'history', title: 'Crônica permanente', text: 'Todo turno resolvido fica salvo com ações, narrativa, eventos e alterações. A IA usa memória resumida em camadas, sem precisar reler a campanha inteira.' },
  { tab: 'settings', title: 'IA, memória e salvamento', text: 'O líder escolhe Groq, Gemini, OpenRouter ou outra API compatível. As chaves ficam cifradas no celular servidor. Toda mudança é salva automaticamente; Salvar e sair cria ainda um ponto explícito de salvamento.' },
  { tab: 'settings', title: 'Amigos em qualquer lugar', text: 'Para jogar fora do Wi-Fi, o celular servidor pode abrir um túnel seguro. O script online mostra um link HTTPS temporário; envie esse link e o código da sala aos seus colegas.' },
];

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const percent = (value, max) => Math.max(0, Math.min(100, Math.round((Number(value) / Math.max(1, Number(max))) * 100)));
const statusName = (value) => ({ LOBBY: 'Lobby', ACTIVE: 'Em jogo', PAUSED: 'Pausada', FINISHED: 'Finalizada' })[value] || value;
const savedTime = (value) => value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'agora';

const ACCOUNT_AVATARS = ['✦','🌙','⚔️','🧭','👑','🦊','🐺','🔮','🏹','🛡️','⚡','🌌'];
const draftKey = (campaignId = state.campaignId, turnId = state.game?.turn?.id) => campaignId && turnId ? `germinal_draft:${campaignId}:${turnId}` : '';
const secretDraftKey = (campaignId = state.campaignId, turnId = state.game?.turn?.id) => campaignId && turnId ? `eidryss_secret_draft:${campaignId}:${turnId}` : '';
const accountAvatar = (user) => user?.presentation?.avatar || (user?.displayName?.[0] || 'G').toUpperCase();
const accountAccent = (user) => user?.presentation?.accent || '#8b7cff';
function saveDraft(value) { const key=draftKey(); if(key) { if(value) localStorage.setItem(key,value); else localStorage.removeItem(key); } }
function loadDraft() { const key=draftKey(); return key ? (localStorage.getItem(key) || '') : ''; }
function saveSecretDraft(value){const key=secretDraftKey();if(key){if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);}}
function loadSecretDraft(){const key=secretDraftKey();return key?(localStorage.getItem(key)||''):'';}
function favoriteIds(){ try{return new Set(JSON.parse(localStorage.getItem('germinal_favorites')||'[]'));}catch{return new Set();} }
function setFavorite(id,on){const ids=favoriteIds();on?ids.add(id):ids.delete(id);localStorage.setItem('germinal_favorites',JSON.stringify([...ids]));}

function applyVisualMode(theme = 'forest') {
  const safeTheme = THEMES[theme] ? theme : 'forest';
  app.dataset.theme = safeTheme;
  app.dataset.motion = state.motionReduced ? 'reduced' : 'full';
  app.dataset.performance = state.performanceLow ? 'low' : 'normal';
  app.dataset.compact = state.compactMode ? 'compact' : 'comfortable';
  document.body.dataset.theme = safeTheme;
  document.body.dataset.motion = state.motionReduced ? 'reduced' : 'full';
  document.body.dataset.performance = state.performanceLow ? 'low' : 'normal';
  document.body.dataset.compact = state.compactMode ? 'compact' : 'comfortable';
  const themeColor = { forest: '#0b0d18', ocean: '#061527', ember: '#21100b', cosmic: '#100c23' }[safeTheme];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
}

function toast(message, error = false) {
  toastElement.textContent = message;
  toastElement.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(toastElement.timer);
  toastElement.timer = setTimeout(() => { toastElement.className = 'toast'; }, 3500);
}

function isEditingField() {
  const element = document.activeElement;
  return state.composing || Boolean(element && app.contains(element) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) && !element.disabled && !element.readOnly);
}

function scheduleGameRefresh(delay = 120) {
  clearTimeout(state.refreshDebounce);
  state.refreshDebounce = setTimeout(() => {
    if (!state.campaignId) return;
    if (isEditingField()) { state.refreshPending = true; return; }
    state.refreshPending = false;
    loadGame({ quiet: true });
  }, delay);
}

if (typeof document.addEventListener === 'function') {
  document.addEventListener('compositionstart', () => { state.composing = true; }, true);
  document.addEventListener('compositionend', () => { state.composing = false; if (state.refreshPending) scheduleGameRefresh(80); }, true);
  document.addEventListener('focusout', () => setTimeout(() => { if (state.refreshPending && !isEditingField()) scheduleGameRefresh(40); }, 0), true);
}

function renderMaintenance(message='O mundo está sendo reforjado. Aguarde alguns instantes.') {
  disconnectSocket();
  clearTimeout(state.maintenanceTimer);
  app.innerHTML = `<section class="maintenance-screen"><div class="maintenance-aura"></div><div class="eidryss-sigil maintenance-sigil" aria-hidden="true"><svg viewBox="0 0 180 180"><circle class="sigil-ring ring-a" cx="90" cy="90" r="72"/><circle class="sigil-ring ring-b" cx="90" cy="90" r="56"/><path class="sigil-diamond" d="M90 20 145 90 90 160 35 90Z"/><path class="sigil-core" d="M90 49 119 90 90 131 61 90Z"/><circle class="sigil-star" cx="90" cy="90" r="9"/></svg></div><span class="eyebrow">Manutenção segura</span><h1>O mundo está sendo reforjado</h1><p>${esc(message)}</p><div class="maintenance-status"><i></i><span>Verificando o servidor automaticamente…</span></div><button class="button secondary" id="maintenance-retry">Tentar agora</button></section>`;
  app.querySelector('#maintenance-retry')?.addEventListener('click',()=>checkClientMeta(true));
  state.maintenanceTimer=setTimeout(()=>checkClientMeta(true),5000);
}

async function clearClientCaches() {
  try { if ('caches' in window) for (const key of await caches.keys()) if (/eidryss|germinal/i.test(key)) await caches.delete(key); } catch {}
  try { const reg=await navigator.serviceWorker?.getRegistration?.(); reg?.active?.postMessage?.({type:'CLEAR_EIDRYSS_CACHE'}); } catch {}
}

async function checkClientMeta(retry=false) {
  try {
    const response=await fetch(`/api/client/meta?_=${Date.now()}`,{cache:'no-store'});
    const meta=await response.json();
    state.clientMeta=meta;
    const previous=Number(localStorage.getItem('eidryss_client_revision')||0);
    const current=Number(meta.clientRevision||750);
    if(previous && current!==previous) await clearClientCaches();
    localStorage.setItem('eidryss_client_revision',String(current));
    if(meta.maintenance){renderMaintenance(meta.maintenanceMessage);return false;}
    clearTimeout(state.maintenanceTimer);
    if(retry) location.reload();
    return true;
  } catch {
    if(retry){renderMaintenance('Não foi possível alcançar o celular servidor. Confira o Termux, o túnel e a internet.');return false;}
    return true;
  }
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 503 && result.maintenance) { renderMaintenance(result.message); throw new Error(result.message || 'Eidryss está em manutenção.'); }
    if (response.status === 401) { state.user = null; state.campaignId = null; disconnectSocket(); renderAuth(); }
    throw new Error(result.message || `Erro ${response.status}`);
  }
  return result;
}

function setBusy(form, busy) {
  form.classList.toggle('loading', busy);
  for (const button of form.querySelectorAll('button')) button.disabled = busy;
}

function bindProviderFields(form) {
  if (!form) return;
  const select = form.elements.aiProvider || form.elements.provider;
  const presets = { gemini: ['gemini-3.8-flash', 'Recomendado: rápido e muito capaz para RPG.'], openai: ['gpt-5.6-sol', 'Recomendado: lógica e narrativa consistentes.'], grok: ['grok-4.6', 'Recomendado: modelo principal da xAI.'], groq: ['openai/gpt-oss-120b', 'Groq direto (chave gsk_): GPT-OSS 120B é o preset forte; 20B economiza limite e responde ainda mais rápido.'], openrouter: ['openai/gpt-5.6-terra', 'OpenRouter: Terra é o equilíbrio; Luna economiza créditos; Sol prioriza qualidade.'], custom: ['', 'Informe o modelo da sua API compatível.'] };
  const refresh = () => {
    form.querySelectorAll('[data-custom-only]').forEach((element) => { element.hidden = select?.value !== 'custom'; });
    form.querySelectorAll('[data-openrouter-only]').forEach((element) => { element.hidden = select?.value !== 'openrouter'; });
    form.querySelectorAll('[data-groq-only]').forEach((element) => { element.hidden = select?.value !== 'groq'; });
    const preset = presets[select?.value] || presets.gemini; const model = form.elements.aiModel || form.elements.model;
    const hint = form.querySelector('[data-model-hint]'); if (hint) hint.textContent = preset[1];
    model?.addEventListener('input',()=>{model.dataset.recommended='false';},{once:true});
    if (model && (!model.value || model.dataset.recommended === 'true') && preset[0]) { model.value = preset[0]; model.dataset.recommended = 'true'; }
  };
  const groqPreset=form.querySelector('[data-groq-preset]');
  groqPreset?.addEventListener('change',()=>{const model=form.elements.aiModel||form.elements.model;if(model&&groqPreset.value){model.value=groqPreset.value;model.dataset.recommended='false';}});
  const openRouterPreset=form.querySelector('[data-openrouter-preset]');
  openRouterPreset?.addEventListener('change',()=>{const model=form.elements.aiModel||form.elements.model;if(model&&openRouterPreset.value){model.value=openRouterPreset.value;model.dataset.recommended='false';}});
  select?.addEventListener('change', refresh);
  refresh();
}

function authTemplate() {
  const login = state.authMode === 'login';
  const remembered = esc(localStorage.getItem('germinal_username') || '');
  return `<section class="auth">
    <div class="auth-brand"><div class="brand-mark eidryss-mini-mark">◇</div><span class="eyebrow">Eidryss 7.0</span><h1>Entre no outro mundo</h1><p>Um mundo persistente para seu grupo, com regras autoritativas e Mestre IA.</p></div>
    <div class="card auth-card">
      <div class="tabs-switch"><button data-auth-mode="login" class="${login ? 'active' : ''}">Entrar</button><button data-auth-mode="register" class="${!login ? 'active' : ''}">Criar conta</button></div>
      <form id="auth-form" style="margin-top:16px">
        ${login ? '' : '<label>Nome exibido<input name="displayName" maxlength="40" autocomplete="name" placeholder="Como seus amigos verão você" required></label>'}
        <label>Usuário<input name="username" value="${login ? remembered : ''}" minlength="3" maxlength="24" autocapitalize="none" autocomplete="username" placeholder="seu_usuario" required></label>
        <label>Senha<input name="password" type="password" minlength="8" autocomplete="${login ? 'current-password' : 'new-password'}" placeholder="Mínimo de 8 caracteres" required></label>
        <label class="checkbox remember-row"><input name="remember" type="checkbox" checked> Lembrar login neste aparelho</label>
        <button class="button" type="submit">${login ? 'Continuar aventura' : 'Criar minha conta'}</button>
      </form>
      <p class="muted tiny auth-note">A senha nunca é salva pelo Eidryss no navegador. A opção acima mantém apenas a sessão segura e, se você quiser, o nome de usuário.</p>
    </div>
  </section>`;
}

function renderAuth() {
  applyVisualMode();
  app.innerHTML = authTemplate();
  app.querySelectorAll('[data-auth-mode]').forEach((button) => button.onclick = () => { state.authMode = button.dataset.authMode; renderAuth(); });
  app.querySelector('#auth-form').onsubmit = async (event) => {
    event.preventDefault(); setBusy(event.currentTarget, true);
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget));
      body.remember = body.remember === 'on';
      if (body.remember) localStorage.setItem('germinal_username', String(body.username || '')); else localStorage.removeItem('germinal_username');
      const result = await api(`/api/auth/${state.authMode}`, { method: 'POST', body: JSON.stringify(body) });
      state.user = result.user; await loadLobby();
    } catch (error) { toast(error.message, true); setBusy(event.currentTarget, false); }
  };
}

function navigationUrl(view, tab='') {
  const base = `${location.pathname}${location.search}`;
  if (view === 'game') return `${base}#${encodeURIComponent(tab || 'story')}`;
  return base.replace(/#.*$/, '');
}

function navigationState(view, tab='') {
  return { eidryss: true, view, campaignId: view === 'game' ? state.campaignId : null, tab: tab || null };
}

function setNavigation(view, tab='', mode='replace') {
  try {
    const method = mode === 'push' ? 'pushState' : 'replaceState';
    history[method](navigationState(view, tab), '', navigationUrl(view, tab));
  } catch {}
}

async function loadLobby({ historyMode = 'replace' } = {}) {
  disconnectSocket();
  const result = await api('/api/campaigns');
  state.campaigns = result.campaigns;
  state.campaignId = null; state.game = null; state.profile = null;
  localStorage.removeItem('germinal_campaign');
  if (historyMode !== 'none') setNavigation('lobby', '', historyMode);
  renderLobby();
}

function renderLobby() {
  applyVisualMode();
  const favorites=favoriteIds();
  const lastId=localStorage.getItem('germinal_last_campaign');
  const last=state.campaigns.find(c=>c.id===lastId) || state.campaigns[0];
  const ordered=[...state.campaigns].sort((a,b)=>Number(favorites.has(b.id))-Number(favorites.has(a.id)) || String(b.lastSavedAt||'').localeCompare(String(a.lastSavedAt||'')));
  app.innerHTML = `<header class="header lobby-header"><div class="account-avatar" style="--avatar-accent:${esc(accountAccent(state.user))}">${esc(accountAvatar(state.user))}</div><div class="header-copy"><span class="eyebrow">Bem-vindo de volta</span><h1>${esc(state.user.displayName)}</h1></div><button class="icon-button" id="profile" aria-label="Perfil e IA">⚙</button><button class="icon-button" id="logout" aria-label="Sair">↪</button></header>
    ${last?`<section class="continue-card" data-open="${last.id}" tabindex="0"><div><span class="eyebrow">Continuar aventura</span><h1>${esc(last.settings.campaignIcon||'✦')} ${esc(last.name)}</h1><p>${esc(last.description||'Seu último mundo está esperando.')}</p></div><div class="continue-meta"><span>${last.memberCount}/${last.settings.maxPlayers}</span><span>${esc(statusName(last.state))}</span><span>→</span></div></section>`:`<section class="hero compact-hero"><span class="eyebrow">Eidryss 7.0</span><h1>Qual história vamos viver?</h1><p class="muted">Crie um mundo ou entre pelo código de um amigo.</p></section>`}
    <div class="quick-lobby-actions"><button class="button" id="show-create">＋ Nova campanha</button><button class="button secondary" id="show-join">⌁ Entrar por código</button><button class="button ghost" id="start-demo" aria-label="Aprenda jogando com a Íris">🤖 Testar</button></div>
    <div id="lobby-slot"></div>
    <div class="section-title"><h2>Suas campanhas</h2><span class="muted tiny">★ favoritas primeiro</span></div>
    <div class="campaign-grid">${ordered.length ? ordered.map((campaign) => `<article class="card flat campaign compact-card" data-open="${campaign.id}" tabindex="0"><div class="row between"><span class="pill">${campaign.isDemo ? 'Tutorial' : esc(statusName(campaign.state))}</span><button class="favorite-button ${favorites.has(campaign.id)?'active':''}" type="button" data-favorite="${campaign.id}" aria-label="Favoritar campanha">★</button></div><div class="campaign-title"><span class="campaign-icon">${esc(campaign.settings.campaignIcon || '✦')}</span><div class="grow"><h3>${esc(campaign.name)}</h3><small class="muted">${campaign.memberCount}/${campaign.settings.maxPlayers} jogadores · ${esc(campaign.joinCode)}</small></div><span>›</span></div></article>`).join('') : '<div class="card flat empty">Você ainda não participa de nenhuma campanha.</div>'}</div>`;
  app.querySelector('#logout').onclick = async () => { await api('/api/auth/logout', { method: 'POST' }); state.user = null; renderAuth(); };
  app.querySelector('#profile').onclick = renderProfilePanel;
  app.querySelector('#start-demo').onclick = async (event) => { event.currentTarget.disabled = true; try { const result = await api('/api/demo', { method: 'POST' }); state.guideOpen = true; state.guideStep = 0; await openCampaign(result.campaign.id); } catch (error) { toast(error.message, true); event.currentTarget.disabled = false; } };
  app.querySelector('#show-create').onclick = renderCreateForm;
  app.querySelector('#show-join').onclick = () => { const slot=app.querySelector('#lobby-slot'); slot.innerHTML=`<div class="card"><div class="row between"><h2>Entrar em campanha</h2><button class="button ghost small" id="close-panel">Fechar</button></div><form id="join-form"><label>Código da campanha<input name="code" placeholder="EIDRYSS-4821" maxlength="30" autocomplete="off" required></label><button class="button" type="submit">Entrar pelo código</button></form></div>`; slot.querySelector('#close-panel').onclick=()=>slot.innerHTML=''; slot.querySelector('#join-form').onsubmit=async(event)=>{event.preventDefault();setBusy(event.currentTarget,true);try{const result=await api('/api/campaigns/join',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});await openCampaign(result.campaign.id);}catch(error){toast(error.message,true);setBusy(event.currentTarget,false);}}; };
  app.querySelectorAll('[data-open]').forEach((card) => { card.onclick = (event) => { if(event.target.closest('[data-favorite]'))return; openCampaign(card.dataset.open); }; card.onkeydown = (event) => { if (event.key === 'Enter') card.click(); }; });
  app.querySelectorAll('[data-favorite]').forEach(button=>button.onclick=(event)=>{event.stopPropagation();const on=!button.classList.contains('active');setFavorite(button.dataset.favorite,on);renderLobby();});
}

async function renderProfilePanel() {
  const slot = app.querySelector('#lobby-slot');
  slot.innerHTML = '<div class="card empty">Abrindo perfil seguro…</div>';
  try { state.profile = await api('/api/profile'); } catch (error) { toast(error.message, true); return; }
  const credentials = state.profile.aiCredentials;
  const names={groq:'Groq · chave gsk_',gemini:'Gemini',openai:'OpenAI',grok:'Grok',openrouter:'OpenRouter',custom:'Outra API'};
  slot.innerHTML = `<div class="card stack profile-card" style="margin-bottom:12px"><div class="row between"><div><span class="eyebrow">Sua conta</span><h2 style="margin-top:5px">Perfil e identidade</h2></div><button class="button ghost small" id="close-panel">Fechar</button></div><form id="account-profile-form"><div class="profile-preview"><div class="account-avatar large" style="--avatar-accent:${esc(accountAccent(state.profile.user))}">${esc(accountAvatar(state.profile.user))}</div><div class="grow"><label>Nome exibido<input name="displayName" maxlength="40" value="${esc(state.profile.user.displayName)}" required></label></div></div><label>Avatar<select name="avatar">${ACCOUNT_AVATARS.map(icon=>`<option value="${icon}" ${accountAvatar(state.profile.user)===icon?'selected':''}>${icon}</option>`).join('')}</select></label><label>Cor do perfil<input type="color" name="accent" value="${esc(accountAccent(state.profile.user))}"></label><button class="button" type="submit">Salvar perfil</button></form></div><div class="card stack security-card" style="margin-bottom:12px"><div class="row between wrap"><div><span class="eyebrow">Segurança</span><h2 style="margin-top:5px">Senha e sessões</h2></div><span class="pill">${Number(state.profile.security?.activeSessions||1)} sessão(ões)</span></div><p class="muted tiny">Trocar a senha encerra as outras sessões automaticamente. Sua sessão atual continua aberta neste aparelho.</p><form id="password-form"><label>Senha atual<input name="currentPassword" type="password" minlength="8" maxlength="128" autocomplete="current-password" required></label><label>Nova senha<input name="newPassword" type="password" minlength="10" maxlength="128" autocomplete="new-password" placeholder="10 caracteres ou mais" required></label><button class="button" type="submit">Trocar senha</button></form><button class="button danger small" type="button" id="revoke-sessions">Encerrar outras sessões</button></div><div class="card stack" style="margin-bottom:12px"><div><span class="eyebrow">Mestre IA</span><h2 style="margin-top:5px">Chaves e modelos</h2></div><p class="muted tiny">As chaves ficam cifradas no celular servidor e nunca são devolvidas ao navegador. Cada provedor guarda sua própria chave.</p><div class="row wrap">${Object.entries(names).map(([provider,label])=>`<span class="pill ${credentials[provider]?.configured?'':'red'}">${label} ${credentials[provider]?.configured?'✓':'—'}</span>`).join('')}</div><form id="profile-ai-form"><label>Provedor<select name="provider">${Object.entries(names).map(([value,label])=>`<option value="${value}">${label}${value==='groq'?' — recomendado para sessão':''}</option>`).join('')}</select></label><div class="ai-key-manager"><p class="muted tiny" data-profile-key-status></p><label>Adicionar ou substituir chave<input type="password" name="apiKey" minlength="10" maxlength="1000" autocomplete="off" placeholder="Cole a nova chave; a atual nunca é exibida"></label><div class="row wrap"><button class="button small" type="submit">Salvar / substituir</button><button class="button secondary small" type="button" id="profile-test-typed">Testar digitada</button><button class="button ghost small" type="button" id="profile-test-saved">Testar salva</button><button class="button danger small" type="button" id="profile-delete-key">Excluir atual</button></div></div><label>Modelo padrão<input name="model" maxlength="120" placeholder="modelo recomendado"><small class="muted tiny" data-model-hint></small></label><label data-groq-only>Atalho Groq<select data-groq-preset><option value="openai/gpt-oss-120b">GPT-OSS 120B · melhor qualidade</option><option value="openai/gpt-oss-20b">GPT-OSS 20B · mais rápido/econômico</option></select><small class="muted tiny">Cole sua chave gsk_ no campo acima; o Eidryss chama a Groq diretamente, sem OpenRouter.</small></label><label data-openrouter-only>Atalho OpenRouter<select data-openrouter-preset><option value="openai/gpt-5.6-terra">GPT-5.6 Terra · equilibrado</option><option value="openai/gpt-5.6-luna">GPT-5.6 Luna · econômico</option><option value="openai/gpt-5.6-sol">GPT-5.6 Sol · máxima qualidade</option></select></label><label data-custom-only>Endereço da API compatível<input name="baseUrl" type="url" maxlength="500" placeholder="https://provedor.exemplo/v1"></label><p data-custom-only class="muted tiny">O endereço deve aceitar <code>/chat/completions</code>.</p></form></div>`;
  slot.querySelector('#close-panel').onclick = () => { slot.innerHTML = ''; };
  const accountForm=slot.querySelector('#account-profile-form'); if(accountForm) accountForm.onsubmit=async(event)=>{event.preventDefault();setBusy(accountForm,true);try{const values=Object.fromEntries(new FormData(accountForm));const result=await api('/api/profile',{method:'PATCH',body:JSON.stringify({displayName:values.displayName,presentation:{avatar:values.avatar,accent:values.accent}})});state.user=result.user;toast('Perfil salvo.');renderLobby();await renderProfilePanel();}catch(error){toast(error.message,true);setBusy(accountForm,false);}};
  const passwordForm=slot.querySelector('#password-form'); if(passwordForm) passwordForm.onsubmit=async(event)=>{event.preventDefault();setBusy(passwordForm,true);try{const values=Object.fromEntries(new FormData(passwordForm));await api('/api/profile/password',{method:'PATCH',body:JSON.stringify(values)});passwordForm.reset();toast('Senha alterada. Outras sessões foram encerradas.');await renderProfilePanel();}catch(error){toast(error.message,true);setBusy(passwordForm,false);}};
  const revokeSessions=slot.querySelector('#revoke-sessions'); if(revokeSessions) revokeSessions.onclick=async()=>{if(!confirm('Encerrar todas as outras sessões da sua conta?'))return;revokeSessions.disabled=true;try{const result=await api('/api/profile/sessions/revoke-others',{method:'POST'});toast(`${result.revoked||0} sessão(ões) encerrada(s).`);await renderProfilePanel();}catch(error){toast(error.message,true);revokeSessions.disabled=false;}};
  const form=slot.querySelector('#profile-ai-form');
  const refresh=()=>{const provider=form.elements.provider.value;const info=credentialUi(credentials,provider);const status=slot.querySelector('[data-profile-key-status]');if(status)status.textContent=info.text;const del=slot.querySelector('#profile-delete-key');if(del)del.disabled=!info.removable;const saved=slot.querySelector('#profile-test-saved');if(saved)saved.disabled=!credentials[provider]?.configured;const meta=credentials[provider];if(meta?.model&&!form.elements.model.value)form.elements.model.value=meta.model;if(provider==='custom'&&meta?.baseUrl&&!form.elements.baseUrl.value)form.elements.baseUrl.value=meta.baseUrl;};
  form.onsubmit = async (event) => {event.preventDefault();setBusy(form,true);try{const body=Object.fromEntries(new FormData(form));if(String(body.apiKey||'').trim().length<10)throw new Error('Cole uma nova chave antes de salvar.');await api('/api/profile/ai',{method:'PATCH',body:JSON.stringify(body)});toast('Nova chave salva. A anterior deste provedor foi substituída.');await renderProfilePanel();}catch(error){toast(error.message,true);setBusy(form,false);}};
  bindProviderFields(form);form.elements.provider.addEventListener('change',refresh);refresh();
  slot.querySelector('#profile-test-typed').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{const data=Object.fromEntries(new FormData(form));if(String(data.apiKey||'').trim().length<10)throw new Error('Cole uma nova chave para testá-la.');await api('/api/profile/ai/test',{method:'POST',body:JSON.stringify(data)});toast('Nova chave respondeu corretamente. Ainda não foi salva.');}catch(error){toast(error.message,true);}finally{b.disabled=false;}};
  slot.querySelector('#profile-test-saved').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{const data=Object.fromEntries(new FormData(form));delete data.apiKey;await api('/api/profile/ai/test',{method:'POST',body:JSON.stringify(data)});toast('Chave salva respondeu corretamente.');}catch(error){toast(error.message,true);}finally{b.disabled=false;}};
  slot.querySelector('#profile-delete-key').onclick=async()=>{const provider=form.elements.provider.value;if(!confirm(`Excluir a chave salva de ${names[provider]}?`))return;try{await api('/api/profile/ai',{method:'PATCH',body:JSON.stringify({provider,remove:true})});toast('Chave excluída.');await renderProfilePanel();}catch(error){toast(error.message,true);}};
}

function renderCreateForm() {
  const slot = app.querySelector('#lobby-slot');
  slot.innerHTML = `<div class="card" style="margin-bottom:12px"><form id="create-form">
    <div class="row between"><h2>Nova campanha</h2><button type="button" class="button ghost small" id="close-panel">Fechar</button></div>
    <label>Nome<input name="name" maxlength="80" placeholder="A Coroa do Eclipse" required></label>
    <label>Premissa<textarea name="description" maxlength="2000" placeholder="Quatro viajantes despertam em…"></textarea></label>
    <details><summary>Opções avançadas da aventura</summary><label>Introdução<select name="introMode"><option value="divine">Encontro com a divindade</option><option value="origin">Vida anterior e travessia</option><option value="arrival">Chegada direta ao mundo</option></select></label><label>Dificuldade<select name="difficulty"><option value="normal">Normal</option><option value="hard">Difícil</option></select></label><label>Progressão<select name="progressionSpeed"><option value="normal">Normal</option><option value="fast">Rápida</option></select></label><label>Profundidade da narrativa<select name="narrativeDepth"><option value="cinematic" selected>Cinematográfica · detalhada</option><option value="balanced">Balanceada · mais rápida</option><option value="epic">Épica · muito detalhada</option></select></label><label>Eventos do mundo<select name="worldEventFrequency"><option value="low">Raros</option><option value="normal" selected>Normais</option><option value="high">Frequentes</option><option value="chaotic">Caóticos</option></select></label><label class="checkbox"><input name="experimentalDice" type="checkbox"> Dados experimentais</label><label class="checkbox"><input name="allowPvp" type="checkbox"> Permitir PvP</label><label>Regras canônicas do mundo<textarea name="worldRules" maxlength="3000" placeholder="Limites de poder, tom, sistema mágico e fatos que a IA nunca deve contradizer."></textarea></label>
    <div class="row"><label class="grow">Vagas da sala<select name="maxPlayers"><option value="4" selected>4 jogadores</option><option value="3">3 jogadores</option><option value="2">2 jogadores</option></select></label><label class="grow">Mínimo ativo<select name="minPlayers"><option value="2" selected>2 jogadores</option><option value="1">1 jogador</option><option value="3">3 jogadores</option><option value="4">4 jogadores</option></select></label></div><label class="checkbox"><input name="allowLateJoin" type="checkbox" checked> Permitir que amigos entrem depois que a sessão começar</label><label class="checkbox"><input name="continueWithAbsentees" type="checkbox" checked> Continuar com ausentes quando o mínimo ativo estiver presente</label><label>IA narradora<select name="aiProvider"><option value="groq">Groq · gsk_ · recomendado para sessão</option><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option><option value="grok">xAI Grok</option><option value="openrouter">OpenRouter · GPT e outros modelos</option><option value="custom">Outra API compatível</option></select></label><label>IA reserva<select name="aiFallbackProvider"><option value="none">Desativada</option><option value="openrouter">OpenRouter</option><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option><option value="grok">xAI Grok</option><option value="custom">Outra API compatível</option></select><small class="muted tiny">Se a IA principal falhar, a reserva pode narrar o mesmo resultado já calculado pelo servidor.</small></label>
    <div class="row"><label class="grow">Tema visual<select name="visualTheme">${Object.entries(THEMES).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label><label class="grow">Símbolo da sala<select name="campaignIcon">${AVATARS.map((icon) => `<option value="${icon}">${icon}</option>`).join('')}</select></label></div>
    <label>Chave da IA — opcional se já estiver no perfil<input type="password" name="aiApiKey" maxlength="1000" autocomplete="off" placeholder="Será cifrada no servidor"></label>
    <label>Modelo<input name="aiModel" maxlength="120" placeholder="modelo recomendado"><small class="muted tiny" data-model-hint></small></label><label data-groq-only>Atalho Groq<select data-groq-preset><option value="openai/gpt-oss-120b">GPT-OSS 120B · melhor qualidade</option><option value="openai/gpt-oss-20b">GPT-OSS 20B · mais rápido/econômico</option></select><small class="muted tiny">Cole sua chave gsk_ no campo acima; o Eidryss chama a Groq diretamente, sem OpenRouter.</small></label><label data-openrouter-only>Atalho OpenRouter<select data-openrouter-preset><option value="openai/gpt-5.6-terra">GPT-5.6 Terra · equilibrado</option><option value="openai/gpt-5.6-luna">GPT-5.6 Luna · econômico</option><option value="openai/gpt-5.6-sol">GPT-5.6 Sol · máxima qualidade</option></select></label>
    <label data-custom-only>Endereço da API compatível<input name="aiBaseUrl" type="url" maxlength="500" placeholder="https://provedor.exemplo/v1"></label>
    <label>Clima narrativo<input name="tone" value="Aventura heroica e cinematográfica" maxlength="200"></label>
    </details><button class="button" type="submit">Criar sala</button>
  </form></div>`;
  slot.querySelector('#close-panel').onclick = () => { slot.innerHTML = ''; };
  slot.querySelector('#create-form').onsubmit = async (event) => {
    event.preventDefault(); setBusy(event.currentTarget, true);
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget)); body.experimentalDice=body.experimentalDice==='on';body.allowPvp=body.allowPvp==='on';body.allowLateJoin=body.allowLateJoin==='on';body.continueWithAbsentees=body.continueWithAbsentees==='on';body.maxPlayers=Number(body.maxPlayers);body.minPlayers=Math.min(body.maxPlayers,Number(body.minPlayers||2));
      const result = await api('/api/campaigns', { method: 'POST', body: JSON.stringify(body) });
      await openCampaign(result.campaign.id);
    } catch (error) { toast(error.message, true); setBusy(event.currentTarget, false); }
  };
  bindProviderFields(slot.querySelector('#create-form'));
}

async function openCampaign(id, { historyMode = 'push' } = {}) {
  state.campaignId = id; state.tab = 'story'; state.history = null;
  localStorage.setItem('germinal_campaign', id);
  localStorage.setItem('germinal_last_campaign', id);
  if (historyMode !== 'none') setNavigation('game', 'story', historyMode);
  await loadGame(); connectSocket();
}

async function loadGame({ quiet = false } = {}) {
  try { state.game = await api(`/api/campaigns/${state.campaignId}/state`); renderGame(); }
  catch (error) { if (!quiet) toast(error.message, true); if (/não participa|não encontrada/i.test(error.message)) await loadLobby(); }
}

function resources(character) {
  if (!character) return '';
  const r = character.resources;
  return `<div class="resource-grid"><div class="resource hp"><strong>HP</strong><small>${r.hp}/${r.maxHp}</small><div class="resource-track"><div class="resource-fill" style="width:${percent(r.hp,r.maxHp)}%"></div></div></div><div class="resource mana"><strong>Mana</strong><small>${r.mana}/${r.maxMana}</small><div class="resource-track"><div class="resource-fill" style="width:${percent(r.mana,r.maxMana)}%"></div></div></div><div class="resource stamina"><strong>Stamina</strong><small>${r.stamina}/${r.maxStamina}</small><div class="resource-track"><div class="resource-fill" style="width:${percent(r.stamina,r.maxStamina)}%"></div></div></div></div>`;
}

function partyView(party) {
  return `<div class="party">${party.map((member) => {
    const presentation = member.character?.presentation || member.user?.presentation || { avatar: '✦', accent: '#8b7cff', aura: 'folha' };
    const fallback = (member.character?.name || member.user.displayName)[0].toUpperCase();
    return `<div class="avatar aura-${esc(presentation.aura || 'folha')}"><div class="avatar-wrap"><div class="avatar-mark" style="--avatar-accent:${esc(presentation.accent || '#8b7cff')}">${esc(presentation.avatar || fallback)}</div><i class="presence-dot ${member.online?'online':''}" title="${member.online?'Online':'Offline'}"></i></div><div><strong class="tiny">${esc(member.character?.name || member.user.displayName)} ${member.user.isBot ? '<em>BOT</em>' : ''}</strong><small>${member.character?.resources.hp ?? 0} HP · ${member.character?.ready?'✓ pronto':'aguardando'}</small><small class="party-location">⌖ ${esc(member.character?.location||'Local desconhecido')}</small></div></div>`;
  }).join('')}</div>`;
}

function worldView(game) {
  const world = game.campaign.world || {};
  const ecosystem = world.ecosystem || {};
  const resources = Array.isArray(ecosystem.resources) ? ecosystem.resources : [];
  const npcs = Array.isArray(world.npcs) ? world.npcs : [];
  const enemies = Array.isArray(world.entities) ? world.entities.filter(entity=>entity.status!=='DEAD'&&Number(entity.hp||0)>0) : [];
  const factions = Array.isArray(ecosystem.factions) ? ecosystem.factions : [];
  const threads = Array.isArray(world.storyThreads) ? world.storyThreads : [];
  const recentEvents = Array.isArray(world.recentEvents) ? world.recentEvents : [];
  const clocks = Array.isArray(world.clocks) ? world.clocks : [];
  const danger = Number(ecosystem.dangerLevel || 0);
  const tension = Math.max(0,Math.min(100,Number(world.tension||0)));
  return `<article class="card world-card"><div class="row between"><div><span class="eyebrow">Mundo vivo</span><h2 style="margin-top:5px">${esc(ecosystem.biome || 'Mundo em formação')}</h2></div><span class="pill ${danger >= 4 ? 'red' : danger >= 3 ? 'gold' : ''}">Perigo ${danger}/5</span></div><p class="muted tiny">${esc(ecosystem.ambience || 'O ambiente ainda aguarda detalhes.')}</p><div class="world-metrics"><span>⌖ ${esc(world.location || 'Local desconhecido')}</span><span>◷ ${esc(world.time || '—')}</span><span>☁ ${esc(world.weather || '—')}</span></div><div class="tension-meter"><span style="width:${tension}%"></span></div><small class="muted tiny">Tensão narrativa ${Math.round(tension)}%</small><div class="ecosystem-grid"><div><h3>Recursos</h3>${resources.length ? resources.map((resource) => `<div class="ecosystem-entry"><span>${esc(resource.name)}</span><strong>${resource.quantity}/${resource.maxQuantity}</strong></div>`).join('') : '<p class="tiny muted">Nada coletável por enquanto.</p>'}</div><div><h3>NPCs próximos</h3>${npcs.length ? npcs.slice(0, 4).map((npc) => `<div class="ecosystem-entry"><span>${esc(npc.name)}</span><strong>${esc(npc.role || npc.status || 'ATIVO')}</strong></div>`).join('') : '<p class="tiny muted">Ninguém conhecido por perto.</p>'}</div></div>${enemies.length?`<div class="living-world-section"><h3>Ameaças na cena</h3>${enemies.slice(0,3).map(enemy=>`<div class="enemy-presence"><div><strong>${esc(enemy.name)}</strong><small>${esc(enemy.description||'Presença hostil')}</small></div><span class="pill red">${Number(enemy.hp||0)}/${Number(enemy.maxHp||0)} HP</span></div>`).join('')}</div>`:''}${threads.length ? `<div class="living-world-section"><h3>Fios da história</h3>${threads.slice(-3).map(thread=>`<div class="story-thread"><strong>${esc(thread.title)}</strong><small>${esc(thread.description)}</small></div>`).join('')}</div>`:''}${clocks.length ? `<div class="living-world-section"><h3>Relógios do mundo</h3>${clocks.map(clock=>`<div class="world-clock"><div class="row between"><strong>${esc(clock.title)}</strong><small>${Number(clock.progress||0)}/${Number(clock.segments||0)}</small></div><div class="progress-track"><div class="progress-fill" style="width:${percent(Number(clock.progress||0),Number(clock.segments||1))}%"></div></div><small>${esc(clock.description||'O mundo avança mesmo sem intervenção direta.')}</small></div>`).join('')}</div>`:''}${recentEvents.length ? `<details class="living-world-section"><summary>Rumores e acontecimentos recentes</summary>${recentEvents.slice(-4).reverse().map(event=>`<p class="tiny"><strong>${esc(event.title||'Acontecimento')}</strong> · ${esc(event.description||'')}</p>`).join('')}</details>`:''}${factions.length ? `<div class="faction-row">${factions.slice(0, 3).map((faction) => `<span>◈ ${esc(faction.name)} · ${Number(faction.reputation || 0)}</span>`).join('')}</div>` : ''}</article>`;
}

function lobbyView(game) {
  const campaign = game.campaign;const ready=game.party.filter(p=>p.lobbyReady).length;const me=game.party.find(p=>p.user?.id===state.user?.id);
  return `<div class="card accent stack lobby-remaster"><div class="row between"><div><span class="eyebrow">Sala de expedição</span><h2 style="margin-top:5px">Preparando a travessia</h2></div><span class="pill gold">${ready}/${game.party.length} prontos</span></div><div class="code-box"><strong>${esc(campaign.joinCode)}</strong><button class="button secondary small" data-copy="${esc(campaign.joinCode)}">Copiar código</button></div><div class="lobby-roster">${game.party.map(p=>`<div class="lobby-person ${p.lobbyReady?'ready':''}"><span>${esc(p.character?.presentation?.avatar||'✦')}</span><div><strong>${esc(p.character?.name||p.user.displayName)}</strong><small>${p.lobbyReady?'Pronto para iniciar':p.online?'Configurando personagem':'Offline'}</small></div><i></i></div>`).join('')}</div><div class="row wrap"><button class="button ${me?.lobbyReady?'secondary':''}" id="lobby-ready" data-ready="${me?.lobbyReady?'0':'1'}">${me?.lobbyReady?'Desmarcar pronto':'Estou pronto'}</button>${game.isOwner ? `<button class="button" id="start-campaign" ${campaign.memberCount < campaign.settings.minPlayers ? 'disabled' : ''}>Iniciar com ${campaign.memberCount} jogador${campaign.memberCount===1?'':'es'}</button>` : ''}</div><p class="muted tiny">A sala aceita até ${campaign.settings.maxPlayers} pessoas, exige ${campaign.settings.minPlayers} ativa${campaign.settings.minPlayers===1?'':'s'} para seguir e pode permanecer aberta para entrada tardia.</p></div>`;
}

function turnView(game) {
  const turn = game.turn;
  if (!turn) return '<div class="card empty">Não há um turno ativo.</div>';
  if (turn.status === 'WAITING_FOR_AI') return `<div class="card turn-progress"><span class="eyebrow">Turno ${turn.number}</span><h3>Turno preservado: aguardando IA</h3><p class="muted">As ações já estão seladas. A campanha não inventará um resultado sem IA.</p>${(game.isOwner||game.isMaster) ? `<p class="sent">${esc(turn.aiError || 'Configure uma chave válida ou créditos e tente novamente em Ajustes.')}</p><button class="button" id="retry-ai">Tentar IA novamente</button>` : '<p class="sent">O organizador está ajustando a IA. Nenhuma ação será perdida.</p>'}</div>`;
  const sent = Boolean(turn.myAction); const collecting = turn.status === 'COLLECTING_ACTIONS' && (!sent || game.campaign.settings.allowActionEdit);
  const ecosystem = game.campaign.world?.ecosystem || {};
  const worldResources = Array.isArray(ecosystem.resources) ? ecosystem.resources : [];
  const resource = worldResources.find((item) => item.quantity > 0)?.name || 'recursos próximos';
  const npc = game.campaign.world?.npcs?.[0]?.name || 'alguém próximo';
  const learned=(game.character.powers||[]).filter(p=>(game.character.cooldowns?.[p.id]||0)<=1).slice(0,2).map(p=>`Uso ${p.name} com cuidado.`);
  const usable=(game.character.inventory||[]).filter(i=>i.type==='CONSUMABLE'&&i.quantity>0).slice(0,1).map(i=>`Uso ${i.name}.`);
  const suggestions = [...learned,...usable,`Observo o ambiente e procuro uma rota segura.`,`Coleto ${resource} com cuidado.`,`Converso com ${npc} antes de agir.`].slice(0,6);
  const draft = turn.myAction?.text || loadDraft();
  const secretDraft=turn.myAction?.secretText||loadSecretDraft();state.secretOpen=state.secretOpen||Boolean(secretDraft);
  return `<div class="card turn-progress ${turn.status === 'PROCESSING' ? 'is-processing' : ''}"><div class="row between"><div><span class="eyebrow">Turno ${turn.number}</span><h3>${turn.status === 'PROCESSING' ? 'O mestre está narrando…' : sent ? 'Ação enviada' : 'Sua vez de decidir'}</h3></div><span class="pill ${turn.status === 'PROCESSING' ? 'gold' : ''}">${turn.status === 'PROCESSING' ? '<i class="mini-spinner"></i>' : ''}${turn.ready}/${turn.total} prontos</span></div><div class="progress-track"><div class="progress-fill" style="width:${percent(turn.ready,turn.total)}%"></div></div>${game.campaign.isDemo ? '<p class="tutorial-hint">🤖 No teste, os companheiros automáticos agem depois de você.</p>' : ''}${collecting ? `<form id="action-form" class="action-area action-composer"><textarea name="text" data-action-draft maxlength="2000" placeholder="O que ${esc(game.character.identity.name)} tenta fazer?" required>${esc(draft)}</textarea><div class="action-suggestions">${suggestions.map((text) => `<button class="action-chip" type="button" data-action-template="${esc(text)}">${esc(text)}</button>`).join('')}</div><button class="secret-toggle ${secretDraft?'active':''}" id="secret-toggle" type="button"><span>⌁</span><div><strong>Ação secreta</strong><small>${secretDraft?'Preparada — só você verá o resultado':'Opcional · abre uma cena privada'}</small></div><i>${state.secretOpen?'−':'+'}</i></button><div class="secret-composer ${state.secretOpen?'open':''}" ${state.secretOpen?'':'hidden'}><label>Intenção secreta<textarea name="secretText" data-secret-draft maxlength="2000" placeholder="Ex.: sigo o suspeito sem contar ao grupo…">${esc(secretDraft)}</textarea></label><p>O servidor valida a ação e chama uma cena compacta separada. Só há consumo extra de API quando este campo é usado.</p></div><div class="composer-footer"><small class="muted draft-state">Rascunhos salvos neste aparelho</small><button class="button" type="submit">${sent ? 'Atualizar ação' : 'Enviar ação'}</button></div></form>` : '<div class="sent">As ações foram fechadas. Aguarde o resultado compartilhado.</div>'}${sent && collecting ? `<div class="sent">✓ Sua ação está protegida.${turn.myAction?.hasSecret?' A cena secreta também foi selada.':''}</div>` : ''}${(game.isOwner||game.isMaster) && !game.campaign.isDemo && collecting && turn.ready > 0 && turn.ready < turn.total ? '<button class="button ghost small" id="force-resolve">Fechar sem os ausentes</button>' : ''}</div>`;
}

function consequenceMarkup(game) {
  const interesting = (game.lastResult?.events || []).filter(event=>['ENCOUNTER_STARTED','NPC_ARRIVED','WORLD_EVENT','STORY_THREAD_STARTED','ENEMY_ACTED','QUEST_STARTED','QUEST_COMPLETED','DISCOVERY','COMPLICATION','WORLD_CLOCK_ADVANCED','WORLD_CLOCK_COMPLETED','ACTION_CHECKED'].includes(event.type));
  if(!interesting.length)return '';
  const labels={ENCOUNTER_STARTED:'⚔ Encontro',NPC_ARRIVED:'♙ Pessoa',WORLD_EVENT:'✦ Mundo',STORY_THREAD_STARTED:'⌁ História',ENEMY_ACTED:'⚠ Reação',QUEST_STARTED:'◇ Missão',QUEST_COMPLETED:'✓ Missão',DISCOVERY:'⌖ Descoberta',COMPLICATION:'⚠ Consequência',WORLD_CLOCK_ADVANCED:'◷ Relógio',WORLD_CLOCK_COMPLETED:'◆ Mudança',ACTION_CHECKED:'◇ Teste'};
  return `<div class="turn-beats">${interesting.slice(-4).map(event=>`<div class="turn-beat"><span>${labels[event.type]||'✦ Evento'}</span><p>${esc(event.data?.description||event.data?.name||event.data?.npc||'O mundo reagiu às ações do grupo.')}</p></div>`).join('')}</div>`;
}

function storyTab(game) {
  const narrative = game.lastResult?.narrative || (game.campaign.world.introduction?.phase==='divine'?'Vocês despertam no Santuário do Limiar, diante de Aurelia. Escrevam suas primeiras perguntas para iniciar o diálogo com a Mestre IA.':game.campaign.description) || 'A aventura ainda não começou.';
  const localNpcs=game.campaign.world.npcs||[];const secret=game.lastResult?.secretNarrative;
  return `<section class="stack story-v2"><div class="scene-banner scene-banner-v2"><div class="scene-aurora"></div><div class="scene-copy"><span class="eyebrow">EIDRYSS · ${esc(game.campaign.world.introduction?.phase||'world')}</span><h1>${esc(game.campaign.world.location)}</h1><p>Seu ponto de vista atual. O mundo continua em movimento mesmo quando o grupo se separa.</p><div class="scene-meta"><span>◷ ${esc(game.campaign.world.time||'—')}</span><span>☁ ${esc(game.campaign.world.weather||'—')}</span><span>♙ ${localNpcs.length} presente${localNpcs.length===1?'':'s'}</span></div><button class="button secondary small" data-tab="journal">Diário e vínculos</button>${game.campaign.world.introduction&&!game.campaign.world.introduction.completed?'<div class="scene-intro-inline">Conversem com a entidade. Quando estiverem prontos, enviem “Aceito a travessia”.</div>':''}</div><div class="scene-status-orb"><strong>T${game.turn?.number||'—'}</strong><small>${esc(game.character.identity.name)}</small></div></div>${game.campaign.state === 'LOBBY' ? lobbyView(game) : ''}${game.campaign.state === 'ACTIVE' ? turnView(game) : game.campaign.state === 'PAUSED' ? '<div class="card sent">Campanha pausada pelo organizador.</div>' : ''}<article class="card narrative-card narrative-v2"><div class="row between"><span class="eyebrow">${game.lastResult ? `Cena compartilhada · turno ${game.lastResult.number}` : 'Prólogo'}</span>${game.lastResult ? `<span class="pill">${esc(game.lastResult.provider)}</span>` : ''}</div><div class="narrative narrative-prose">${esc(narrative)}</div></article>${secret?`<article class="card secret-result"><div class="secret-result-head"><span>⌁</span><div><span class="eyebrow">Somente para você</span><h2>Cena secreta</h2></div></div><div class="narrative narrative-prose">${esc(secret)}</div><p class="tiny">Este texto não aparece para os outros jogadores nem na crônica deles.</p></article>`:''}${consequenceMarkup(game)}${worldView(game)}<div class="section-title"><h2>Grupo</h2></div>${partyView(game.party)}</section>`;
}


function classCard(game, cls) {
  const c=game.character;
  const current=c.classId===cls.id;
  const canChoose=!c.classChosen && c.level===1 && ['LOBBY','PAUSED'].includes(game.campaign.state);
  const primary=(game.catalog.attributes?.[cls.primaryAttributes?.[0]]||cls.primaryAttributes?.[0]||'Atributo principal');
  const paths=cls.paths||[];
  return `<article class="class-card remaster-class ${current?'current':''}" data-class-name="${esc(`${cls.name} ${cls.description} ${paths.map(p=>p.name).join(' ')} ${cls.specializations.join(' ')}`.toLowerCase())}" data-class-style="${esc(cls.combatStyle)}"><div class="class-card-head"><span class="class-glyph">${classSigil(cls.id,cls.name)}</span><div class="grow"><div class="row wrap"><h3>${esc(cls.name)}</h3>${current?'<span class="pill gold">Sua classe</span>':''}</div><p>${esc(cls.description)}</p></div></div><div class="class-meta"><span>${esc(cls.combatStyle)}</span><span>Principal: ${esc(primary)}</span><span>${cls.skills.length + paths.reduce((n,p)=>n+(p.grantedSkills?.length||0),0)} técnicas possíveis</span></div><div class="path-preview-row">${paths.map(path=>`<span class="path-preview ${c.pathId===path.id?'chosen':''}">${esc(path.style)} · ${esc(path.name)}</span>`).join('')}</div><details><summary>Ver árvore base</summary><div class="class-skill-road">${cls.skills.map(skill=>`<div><b>Nv.${skill.unlockLevel}</b><span>${esc(skill.name)}</span><small>${esc(skill.category)} · ${Object.entries(skill.cost||{}).map(([k,v])=>`${v} ${k}`).join(' ')}</small></div>`).join('')}</div></details><details><summary>Ver 3 caminhos avançados</summary><div class="path-mini-grid">${paths.map(path=>`<div><strong>${esc(path.name)}</strong><small>${esc(path.description)}</small><em>Nv. 5 · 10 · 15</em></div>`).join('')}</div></details>${canChoose?`<button class="button class-choose" data-class-pick="${esc(cls.id)}">Escolher ${esc(cls.name)}</button>`:current?'<div class="class-locked-note">✓ Classe confirmada. Caminhos avançados aparecem em Evolução.</div>':'<div class="class-locked-note">Prévia disponível. A classe fica travada depois da confirmação.</div>'}</article>`;
}

function classesTab(game) {
  const classes=game.catalog.classes||[];
  const shown=classes.filter(cls=>{
    const q=state.classQuery.trim().toLowerCase();
    const hay=`${cls.name} ${cls.description} ${cls.specializations.join(' ')} ${(cls.paths||[]).map(p=>p.name).join(' ')}`.toLowerCase();
    return (!q||hay.includes(q)) && (state.classStyle==='ALL'||cls.combatStyle===state.classStyle);
  });
  const c=game.character;
  return `<section class="stack"><div class="remaster-hero class-hero"><div><span class="eyebrow">24 classes · 72 caminhos</span><h1>Arquivo de Arquétipos</h1><p>Cada classe agora pode se transformar em três caminhos permanentes no nível 5, com marcos próprios nos níveis 5, 10 e 15 e técnicas exclusivas.</p><div class="hero-actions"><button class="button secondary small" data-tab="progression">Abrir Evolução</button><span class="pill">${classes.length} classes</span><span class="pill gold">${classes.reduce((n,x)=>n+(x.paths?.length||0),0)} caminhos</span></div></div><div class="class-hero-orbit"><span>${classSigil((game.catalog.classes.find(x=>x.id===c.classId)||{}).id||'unknown',(game.catalog.classes.find(x=>x.id===c.classId)||{}).name||'Classe')}</span></div></div><div class="class-toolbar"><input id="class-search" value="${esc(state.classQuery)}" placeholder="Buscar classe, caminho ou estilo…"><div class="filter-row">${['ALL','Físico','Mágico'].map(t=>`<button type="button" class="filter-chip ${state.classStyle===t?'active':''}" data-class-style-filter="${t}">${t==='ALL'?'Todas':t}</button>`).join('')}</div></div>${c.classChosen?`<div class="card class-notice"><strong>${esc(c.identity.class)}</strong> está confirmada. O próximo grande passo é escolher um dos três caminhos da classe no nível 5.</div>`:'<div class="card class-notice choose"><strong>Escolha aberta.</strong> Toque em uma classe para confirmar. Depois, sua construção continua por maestrias, talentos, caminhos e treino de habilidades.</div>'}<div class="class-grid">${shown.map(cls=>classCard(game,cls)).join('')||'<div class="card empty">Nenhuma classe corresponde ao filtro.</div>'}</div></section>`;
}

function derivedStatCards(c){
  const d=c.derivedStats||{};
  const rows=[['⚔','Poder físico',d.physicalPower],['✺','Poder arcano',d.arcanePower],['⬟','Guarda',d.guard],['⚡','Iniciativa',d.initiative],['◎','Precisão',d.accuracy],['♛','Influência',d.influence],['⌖','Exploração',d.exploration]];
  return `<div class="derived-grid">${rows.map(([i,n,v])=>`<div class="derived-stat"><span>${i}</span><strong>${Number(v||0)}</strong><small>${n}</small></div>`).join('')}</div>`;
}


function attributeAllocationPanel(c,catalog){
  const points=Math.max(0,Number(c.attributePoints||0));
  const keys=Object.keys(catalog.attributes||{}).filter(key=>!['attack','defense','initiative'].includes(key));
  return `<article class="card allocation-card" data-allocator data-points="${points}"><div class="allocation-head"><div><span class="eyebrow">Pontos por nível + maestria por uso</span><h2>Forje seus atributos</h2><p>Ao subir de nível você recebe pontos livres. Eles aumentam o atributo base permanentemente; a maestria continua evoluindo separadamente enquanto você joga.</p></div><div class="point-orb"><strong data-remaining>${points}</strong><small>livres</small></div></div><form id="attributes-form"><div class="allocation-grid">${keys.map(key=>{const label=catalog.attributes[key]||key;const base=Number(c.attributes?.[key]||0);const effective=Number(c.effectiveAttributes?.[key]??base);const mastery=c.masterySummary?.[key];const bonus=Math.max(0,effective-base);return `<div class="allocation-row" data-attr-row="${key}"><div class="allocation-copy"><strong>${esc(label)}</strong><small>${esc(ATTRIBUTE_HELP[key]||'Atributo da ficha')}</small><em>Base ${base}${bonus?` · bônus atuais +${bonus}`:''}${mastery?` · ${esc(mastery.rank?.name||'Iniciante')}`:''}</em></div><div class="allocation-stepper"><button type="button" class="step-button" data-attr-dec="${key}" aria-label="Remover ponto de ${esc(label)}" disabled>−</button><span class="allocation-number"><b>${base}</b><i data-attr-pending="${key}">+0</i></span><button type="button" class="step-button plus" data-attr-inc="${key}" aria-label="Adicionar ponto em ${esc(label)}" ${points?'' :'disabled'}>+</button><input type="hidden" name="${key}" value="0"></div></div>`;}).join('')}</div><div class="allocation-footer"><div><strong>${points?`${points} ponto${points===1?'':'s'} aguardando distribuição`:'Nenhum ponto livre agora'}</strong><small>${points?'Você pode dividir como quiser e confirmar uma única vez.':'O próximo nível concede novos pontos; maestria continua crescendo pelo uso.'}</small></div><button class="button" type="submit" data-allocate-submit ${points?'disabled':'disabled'}>${points?'Aplicar pontos':'Sem pontos livres'}</button></div></form></article>`;
}

function characterTab(game) {
 const c=game.character, catalog=game.catalog, editable=['LOBBY','PAUSED'].includes(game.campaign.state);
 const cls=catalog.classes.find(x=>x.id===c.classId);const presentation=c.presentation;
 const path=cls?.paths?.find(p=>p.id===c.pathId);
 return `<section class="stack"><div class="remaster-hero character-remaster aura-${esc(presentation.aura)}"><div class="character-avatar hero-avatar" style="--avatar-accent:${esc(presentation.accent)}">${esc(presentation.avatar)}</div><div class="grow"><span class="eyebrow">Ficha remasterizada · nível ${c.level}</span><h1>${esc(c.identity.name)}</h1><p>${esc(c.identity.class)}${path?` · ${esc(path.name)}`:c.specialization?' · '+esc(c.specialization):''}</p><div class="row wrap"><span class="pill gold">${esc(c.identity.title)}</span><span class="pill">${c.talentPoints||0} talento</span><span class="pill">${c.downtimePoints||0} intervalo</span></div><div class="xp-track"><span style="width:${percent(c.experience,c.level*100)}%"></span></div><small>${c.experience} / ${c.level*100} XP para o próximo nível</small></div>${resources(c)}</div>
 <div class="card"><div class="row between wrap"><div><span class="eyebrow">Leitura rápida</span><h2>Atributos derivados</h2></div><button class="button secondary small" data-tab="progression">Abrir Evolução</button></div>${derivedStatCards(c)}</div>
 <div class="card attribute-summary-card"><div class="row between wrap"><div><span class="eyebrow">Atributos permanentes</span><h2>Base + domínio</h2></div><button class="button secondary small" data-tab="progression">${c.attributePoints?`Distribuir ${c.attributePoints} ponto${c.attributePoints===1?'':'s'}`:'Ver evolução'}</button></div><div class="stat-grid remaster-stats">${Object.entries(catalog.attributes).filter(([key])=>!['attack','defense','initiative'].includes(key)).map(([key,label])=>{const m=c.masterySummary?.[key];const eff=c.effectiveAttributes?.[key]??c.attributes[key]??0;return `<div class="stat mastery-stat"><span>${label}<small>${esc(m?.rank?.name||'Iniciante')}</small></span><strong>${c.attributes[key]||0}${eff!==(c.attributes[key]||0)?` <em>→ ${eff}</em>`:''}</strong></div>`;}).join('')}</div></div>
 <div class="card class-summary"><div class="row between"><div><span class="eyebrow">Arquétipo</span><h2 class="class-title-with-sigil">${classSigil(cls?.id||'unknown',cls?.name||'Classe')} ${esc(cls?.name||'Sem classe')}</h2></div><button class="button secondary small" data-tab="classes">Catálogo</button></div><p class="muted">${esc(cls?.description||'Escolha uma classe para definir sua progressão.')}</p><div class="path-current">${path?`<strong>${esc(path.name)}</strong><small>${esc(path.style)} · marcos avançados ativos conforme seu nível.</small>`:`<strong>Caminho ainda não definido</strong><small>${c.level>=5?'Você já pode escolher em Evolução.':'Libera no nível 5.'}</small>`}</div></div>
 <div class="card"><h2>Condição atual</h2><p>${esc(c.status)} · ${esc(c.position)}</p><div class="row wrap">${[...(c.conditions||[]),...(c.effects||[]).map(e=>e.name)].map(x=>`<span class="pill">${esc(x)}</span>`).join('')||'<span class="muted">Sem condições especiais</span>'}</div></div>
 <details class="card" ${editable?'open':''}><summary>Aparência e origem</summary>${editable?`<form id="character-form"><label>Nome<input name="name" maxlength="40" value="${esc(c.identity.name)}" required></label><label>Raça / origem visual<input name="race" maxlength="40" value="${esc(c.identity.race)}"></label><label>Classe<select name="classId" ${c.classChosen?'disabled':''}>${catalog.classes.map(x=>`<option value="${x.id}" ${c.classId===x.id?'selected':''}>${x.icon} ${x.name}</option>`).join('')}</select></label><div class="class-info">${esc(cls?.description||'Escolha uma classe do catálogo. Os poderes são concedidos pelo sistema.')}</div><div class="cosmetic-grid">${[['gender','Gênero / apresentação'],['hair','Cabelo'],['eyes','Olhos'],['height','Altura / porte']].map(([key,label])=>`<label>${label}<input name="${key}" maxlength="80" value="${esc(c.identity[key]||'')}"></label>`).join('')}</div><label>Vida anterior<textarea name="origin" maxlength="500">${esc(c.identity.origin||'')}</textarea></label><label>Aparência<textarea name="appearance" maxlength="1000">${esc(c.identity.appearance||'')}</textarea></label><label>Descrição<textarea name="description" maxlength="1000">${esc(c.identity.description||'')}</textarea></label><div class="cosmetic-grid"><label>Avatar<select name="avatar">${AVATARS.map(x=>`<option ${x===presentation.avatar?'selected':''}>${x}</option>`).join('')}</select></label><label>Cor<input name="accent" type="color" value="${esc(presentation.accent)}"></label><label>Aura<select name="aura">${Object.entries(AURAS).map(([k,v])=>`<option value="${k}" ${k===presentation.aura?'selected':''}>${v}</option>`).join('')}</select></label></div><button class="button">Salvar personagem</button></form>`:`<p>${esc([c.identity.appearance,c.identity.description,c.identity.origin].filter(Boolean).join(' · '))||'Sua jornada ainda está começando.'}</p><p class="muted tiny">Pause a campanha em um turno sem ações para editar a aparência.</p>`}</details></section>`;
}

function masteryProgress(m){
  const start=Number(m?.rank?.threshold||0), next=Number(m?.next?.threshold||Math.max(start+1,Number(m?.xp||0))), xp=Number(m?.xp||0);
  return m?.next?percent(Math.max(0,xp-start),Math.max(1,next-start)):100;
}

function progressionTab(game){
  const c=game.character, catalog=game.catalog, cls=catalog.classes.find(x=>x.id===c.classId), path=cls?.paths?.find(p=>p.id===c.pathId);
  const keys=Object.keys(catalog.attributes||{}).filter(k=>!['initiative','defense','attack'].includes(k));
  const talents=catalog.talents||[];
  const branches=[...new Set(talents.map(t=>t.branch))];
  const pathCards=(cls?.paths||[]).map(p=>`<article class="path-card ${path?.id===p.id?'selected':''}"><div class="path-card-head"><div><span class="eyebrow">${esc(p.style)}</span><h3>${esc(p.name)}</h3></div>${path?.id===p.id?'<span class="pill gold">Seu caminho</span>':''}</div><p>${esc(p.description)}</p><div class="milestone-road">${(p.milestones||[]).map(m=>`<div class="milestone ${c.level>=m.level?'unlocked':''}"><b>${m.level}</b><span>${esc(m.title)}</span><small>${esc(m.description)}</small></div>`).join('')}</div><div class="path-power-list">${(p.grantedSkills||[]).map(s=>`<div><span>${esc(s.name)}</span><small>Nv.${s.unlockLevel} · ${esc(s.category)}</small></div>`).join('')}</div>${!c.pathId&&c.level>=5?`<button class="button" data-path-pick="${esc(p.id)}">Juramentar ${esc(p.name)}</button>`:''}</article>`).join('');
  return `<section class="stack"><div class="remaster-hero progression-hero"><div><span class="eyebrow">Progressão profunda</span><h1>Evolução & Maestria</h1><p>Seu personagem não cresce apenas por nível: uso real gera maestria, talentos moldam a construção, caminhos mudam o kit e intervalos permitem treino entre cenas.</p><div class="row wrap"><span class="pill gold">${c.talentPoints||0} pontos de talento</span><span class="pill">${c.skillPoints||0} treino de poder</span><span class="pill">${c.downtimePoints||0}/3 intervalos</span></div></div><div class="progression-sigil">${classSigil(cls?.id||'unknown',cls?.name||'Classe')}</div></div>${attributeAllocationPanel(c,catalog)}<div class="card"><span class="eyebrow">Resultado da construção</span><h2>Atributos derivados</h2>${derivedStatCards(c)}</div><div class="section-title"><div><span class="eyebrow">Aprender fazendo</span><h2>Maestria de atributos</h2></div><span class="pill">6 patamares</span></div><div class="mastery-grid">${keys.map(key=>{const m=c.masterySummary?.[key]||{};return `<article class="card mastery-card"><div class="row between"><strong>${esc(catalog.attributes[key]||key)}</strong><span class="mastery-rank">${esc(m.rank?.icon||'·')} ${esc(m.rank?.name||'Iniciante')}</span></div><div class="mastery-value"><b>${c.effectiveAttributes?.[key]??c.attributes[key]??0}</b><span>${m.xp||0} MXP · ${m.uses||0} usos</span></div><div class="mastery-track"><i style="width:${masteryProgress(m)}%"></i></div><small>${m.next?`${Math.max(0,m.next.threshold-(m.xp||0))} MXP até ${esc(m.next.name)}`:'Patamar máximo atual'}</small>${(c.downtimePoints||0)>0?`<button class="button ghost small" data-downtime-train="${key}">Treinar no intervalo</button>`:''}</article>`;}).join('')}</div><div class="section-title"><div><span class="eyebrow">Nível 5+</span><h2>Caminhos de ${esc(cls?.name||'classe')}</h2></div>${path?`<span class="pill gold">${esc(path.name)}</span>`:''}</div>${c.level<5&&!c.pathId?`<div class="card empty">Os três caminhos despertam no nível 5. Você está no nível ${c.level}.</div>`:''}<div class="path-grid">${pathCards}</div><div class="section-title"><div><span class="eyebrow">Construção livre</span><h2>Constelação de talentos</h2></div><span class="pill gold">${c.talentPoints||0} pts</span></div>${branches.map(branch=>`<div class="talent-branch"><h3>${esc(branch)}</h3><div class="talent-grid">${talents.filter(t=>t.branch===branch).map(t=>{const rank=Number(c.talents?.[t.id]||0), cost=Number(t.costPerRank||1);return `<article class="card talent-card ${rank>=t.maxRank?'maxed':''}"><span class="talent-icon">${esc(t.icon)}</span><div class="grow"><strong>${esc(t.name)}</strong><p>${esc(t.description)}</p><small>Nível ${rank}/${t.maxRank} · custo ${cost}</small></div><button class="button small" data-talent="${esc(t.id)}" ${rank>=t.maxRank||c.talentPoints<cost?'disabled':''}>${rank>=t.maxRank?'Máx.':'+1'}</button></article>`;}).join('')}</div></div>`).join('')}<div class="card downtime-card"><div><span class="eyebrow">Entre cenas</span><h2>Atividades de intervalo</h2><p class="muted tiny">Você acumula até 3 pontos ao resolver turnos. Use-os para treinar, estudar ou se recuperar.</p></div><div class="row wrap"><button class="button secondary" id="downtime-recover" ${(c.downtimePoints||0)<1?'disabled':''}>Recuperar recursos</button><button class="button secondary" id="downtime-study" ${(c.downtimePoints||0)<1?'disabled':''}>Estudar + inteligência + XP</button></div></div></section>`;
}

function skillCard(c,cls,def){
 const learned=c.powers.find(p=>p.id===def.id);const skill=learned||def;const mastery=c.skillMastery?.[skill.id]||{xp:0,uses:0};
 const ranks=state.game?.catalog?.masteryRanks||[];let rank=ranks[0]||{name:'Iniciante',threshold:0};for(const r of ranks)if(Number(mastery.xp||0)>=Number(r.threshold||0))rank=r;const next=ranks.find(r=>Number(r.threshold||0)>Number(mastery.xp||0));
 const prog=next?percent(Number(mastery.xp||0)-Number(rank.threshold||0),Math.max(1,Number(next.threshold||0)-Number(rank.threshold||0))):100;
 return `<details class="card skill-card ${learned?'':'locked'}"><summary><span class="skill-symbol">${classSigil(cls?.id||'unknown',cls?.name||'Classe')}</span><span><strong>${esc(skill.name)}</strong><small>${learned?`Nv.${skill.level||1} · ${esc(rank.name)} · ${mastery.uses||0} usos`:`Desbloqueia no nível ${skill.unlockLevel}`}</small></span><span class="pill">${learned?'Aprendida':'Bloqueada'}</span></summary><p>${esc(skill.description)}</p>${learned?`<div class="skill-mastery"><div class="row between"><small>Maestria da técnica</small><b>${esc(rank.name)}</b></div><div class="mastery-track"><i style="width:${prog}%"></i></div><small>${mastery.xp||0} MXP${next?` · ${next.threshold-mastery.xp} para ${esc(next.name)}`:' · domínio máximo'}</small></div>`:''}<dl><dt>Categoria</dt><dd>${esc(skill.category||skill.type)}</dd><dt>Custo</dt><dd>${esc(Object.entries(skill.cost||{}).map(([k,v])=>`${v} ${k}`).join(' · ')||'Sem custo')}</dd><dt>Efeito</dt><dd>${esc((skill.effects||[]).map(e=>`${e.type}: base ${e.base||e.value||0}, escala ${e.scaling||'fixa'}`).join(' · ')||'Narrativo')}</dd><dt>Recarga</dt><dd>${skill.cooldown||0} turnos</dd><dt>Origem</dt><dd>${skill.pathId?'Caminho avançado':skill.classId?'Classe':'História'}</dd></dl>${learned?`<div class="row wrap"><button class="button small" data-use-skill="${esc(skill.name)}">Preparar ação</button><button class="button secondary small" data-train="${skill.id}" ${!c.skillPoints||(skill.level||1)>=3?'disabled':''}>Treinar nível +1</button></div>`:''}</details>`;
}

function bestiaryCard(entry){
 const names=['Avistada','Estudada','Conhecida','Dominada'];const max=entry.nextTier||Math.max(10,entry.points);const progress=entry.tier>=4?100:percent(entry.points,max);
 const statText=entry.stats?Object.entries(entry.stats).map(([k,v])=>`${({speed:'Velocidade',resistance:'Resistência',attack:'Ataque'})[k]||k}: ${v}`).join(' · '):'';
 return `<details class="card bestiary-card tier-${entry.tier}"><summary><span class="bestiary-mark">${entry.tier>=4?'◆':entry.tier>=3?'◈':entry.tier>=2?'◇':'○'}</span><span class="grow"><strong>${esc(entry.name)}</strong><small>${esc(entry.family||'Criatura')} · ${names[entry.tier-1]||'Avistada'}</small></span><span class="pill">Nv. conhecimento ${entry.tier}/4</span></summary><p>${esc(entry.description||'O grupo ainda conhece pouco sobre esta criatura.')}</p><div class="codex-progress"><span style="width:${progress}%"></span></div><small class="muted">${entry.tier>=4?'Conhecimento de campo completo':`${entry.points}/${entry.nextTier} pontos para revelar mais`}</small><dl><dt>Habitat</dt><dd>${esc(entry.habitat||'Ainda desconhecido')}</dd><dt>Encontros</dt><dd>${entry.encounters||0}</dd><dt>Observações</dt><dd>${entry.observations||0}</dd><dt>Derrotados</dt><dd>${entry.defeats||0}</dd>${entry.behavior?`<dt>Comportamento</dt><dd>${esc(entry.behavior)}</dd>`:''}${statText?`<dt>Perfil</dt><dd>${esc(statText)}</dd>`:''}${entry.traits?.length?`<dt>Traços</dt><dd>${esc(entry.traits.join(' · '))}</dd>`:''}${entry.weaknesses?.length?`<dt>Fraquezas</dt><dd>${esc(entry.weaknesses.join(' · '))}</dd>`:''}${entry.resistances?.length?`<dt>Resistências</dt><dd>${esc(entry.resistances.join(' · '))}</dd>`:''}</dl><p class="muted tiny">Observar a criatura e sobreviver a novos encontros revela informações aos poucos. Fraquezas não aparecem no primeiro contato.</p></details>`;
}

function skillsTab(game){
 const c=game.character,cls=game.catalog.classes.find(x=>x.id===c.classId);const skills=[...(cls?.skills||[]),...c.powers.filter(p=>!cls?.skills.some(s=>s.id===p.id))];
 const magic=skills.filter(skill=>skill.resource==='mana'||/mag|arc|cura|invoc|sagrado/i.test(`${skill.category||''} ${skill.name||''}`));
 const combat=skills.filter(skill=>!magic.some(m=>m.id===skill.id));const bestiary=game.campaign.world?.bestiary||[];
 const section=['magic','combat','bestiary'].includes(state.codexSection)?state.codexSection:'magic';
 const body=section==='bestiary'?(bestiary.length?bestiary.map(bestiaryCard).join(''):'<div class="card empty">O bestiário ainda está vazio. Encontrem criaturas e usem ações de observação para aprender sobre elas.</div>'):(section==='magic'?magic:combat).map(def=>skillCard(c,cls,def)).join('')||'<div class="card empty">Nenhuma técnica nesta categoria por enquanto.</div>';
 return `<section class="stack"><div class="rpg-heading"><span class="eyebrow">Códice de ${esc(c.identity.class)}</span><h1>Grimório, estilos e bestiário</h1><p>${c.skillPoints||0} pontos de treinamento · conhecimento cresce com a jornada</p></div><div class="codex-switch"><button type="button" data-codex-section="magic" class="${section==='magic'?'active':''}">✦ Magias</button><button type="button" data-codex-section="combat" class="${section==='combat'?'active':''}">⚔ Estilos</button><button type="button" data-codex-section="bestiary" class="${section==='bestiary'?'active':''}">◇ Bestiário</button></div>${body}</section>`;
}

function inventoryTab(game){
 const c=game.character;const query=state.inventoryQuery.trim().toLocaleLowerCase();const type=state.inventoryType;
 const items=c.inventory.filter(item=>(type==='ALL'||item.type===type)&&(!query||`${item.name} ${item.description} ${item.rarity} ${item.type}`.toLocaleLowerCase().includes(query)));
 const types=['ALL',...new Set(c.inventory.map(i=>i.type))];const recipes=game.catalog.recipes||[];const market=game.catalog.market||{items:[],coins:c.coins||0,currency:'Coroas',multiplier:1};
 return `<section class="stack"><div class="remaster-hero inventory-hero"><div><span class="eyebrow">Equipamento · loot · fabricação · economia</span><h1>Arsenal & Oficina</h1><p>Organize equipamento, fabrique itens e negocie recursos em uma economia autoritativa ligada ao estado do mundo.</p><div class="row wrap"><span class="wallet-pill">◈ ${Number(market.coins??c.coins??0)} ${esc(market.currency||'Coroas')}</span><span class="pill">Mercado ×${Number(market.multiplier||1).toFixed(2)}</span></div></div><div class="inventory-emblem">◇</div></div>
 <div class="equipment-slots remaster-equipment">${['weapon','armor','accessory'].map(slot=>`<div class="card equipment-slot"><span class="eyebrow">${slot==='weapon'?'Arma':slot==='armor'?'Armadura':'Acessório'}</span><strong>${esc(c.inventory.find(i=>i.id===c.equipment?.[slot])?.name||'Vazio')}</strong></div>`).join('')}</div>
 <div class="inventory-toolbar"><input id="inventory-search" value="${esc(state.inventoryQuery)}" placeholder="Buscar item…" autocomplete="off"><div class="filter-row">${types.map(t=>`<button type="button" class="filter-chip ${type===t?'active':''}" data-inventory-type="${esc(t)}">${t==='ALL'?'Todos':esc(t)}</button>`).join('')}</div></div>
 <div class="inventory-grid">${items.map(item=>{const equipped=Object.values(c.equipment||{}).includes(item.id);const sellable=item.type!=='QUEST'&&Number(item.value||0)>0&&!equipped;return `<details class="card item-detail rarity-${esc(String(item.rarity||'COMMON').toLowerCase())}"><summary><span class="item-icon">${esc(item.icon||'◇')}</span><strong>${esc(item.name)}</strong><span class="pill">×${item.quantity}</span></summary><p>${esc(item.description)}</p><span class="pill gold">${esc(item.rarity)}</span><dl><dt>Categoria</dt><dd>${esc(item.type)}</dd><dt>Valor</dt><dd>${item.value||0}</dd><dt>Efeitos</dt><dd>${esc((item.effects||[]).map(e=>`${e.type} ${e.value||''}`).join(', ')||'Nenhum')}</dd><dt>Bônus</dt><dd>${esc(Object.entries(item.attributes||{}).map(([k,v])=>`${k} +${v}`).join(', ')||'Nenhum')}</dd></dl><div class="row wrap">${item.slot?`<button class="button small" data-equip="${item.id}">${c.equipment[item.slot]===item.id?'Desequipar':'Equipar'}</button>`:item.type==='CONSUMABLE'?`<button class="button small" data-use-skill="${esc(item.name)}">Preparar uso</button>`:''}${sellable?`<button class="button ghost small" data-sell="${item.id}">Vender 1</button>`:''}</div></details>`;}).join('')||'<div class="card empty">Nenhum item corresponde ao filtro.</div>'}</div>
 <div class="section-title"><div><span class="eyebrow">Economia 7.0</span><h2>${esc(market.name||'Mercado')}</h2></div><span class="wallet-pill">◈ ${Number(market.coins??0)} ${esc(market.currency||'Coroas')}</span></div>
 <div class="market-grid">${(market.items||[]).map(item=>`<article class="card market-card"><div class="row"><span class="market-icon">${esc(item.icon||'◇')}</span><div class="grow"><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p></div></div><div class="row between"><span class="pill">${esc(item.type)}</span><strong class="market-price">◈ ${Number(item.price||0)}</strong></div><button class="button ${item.affordable?'':'secondary'}" data-buy="${esc(item.id)}" ${item.affordable?'':'disabled'}>${item.affordable?'Comprar':'Coroas insuficientes'}</button></article>`).join('')}</div>
 <div class="section-title"><div><span class="eyebrow">Crafting 7.0</span><h2>Receitas conhecidas</h2></div><span class="pill">${c.craftingXp||0} XP de ofício</span></div>
 <div class="craft-grid">${recipes.map(r=>{const ready=(r.status||[]).every(x=>x.ready);return `<article class="card recipe-card ${ready?'ready':''}"><div class="row"><span class="recipe-icon">${esc(r.icon)}</span><div class="grow"><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p></div><span class="pill ${ready?'gold':''}">${esc(r.category)}</span></div><div class="ingredient-list">${(r.status||r.ingredients||[]).map(x=>`<span class="${x.ready?'have':'missing'}">${esc(x.name)} ${x.have??0}/${x.quantity}</span>`).join('')}</div><button class="button ${ready?'':'secondary'}" data-craft="${esc(r.id)}" ${ready?'':'disabled'}>${ready?'Fabricar':'Faltam materiais'}</button></article>`;}).join('')}</div></section>`;
}

function mapTab(game){
 const w=game.campaign.world,a=w.atlas||{nodes:[],edges:[],routes:[]};const current=a.nodes.find(node=>node.id===a.current);const glyph={Vila:'⌂',Cidade:'♜',Guilda:'⚔',Bosque:'♣',Masmorra:'⬡',Ruínas:'⬡',Estrada:'✣'};
 const routeMarkup=(a.routes||[]).map(route=>{const p=a.nodes.find(node=>node.id===route.from),q=a.nodes.find(node=>node.id===route.to);if(!p||!q)return '';const broken=route.blocked||route.bridge?.status==='BROKEN';return `<path class="atlas-route ${broken?'blocked':''}" d="M ${p.x} ${p.y} Q ${(p.x+q.x)/2+((p.y-q.y)*.08)} ${(p.y+q.y)/2} ${q.x} ${q.y}"/>`;}).join('');
 const travel=w.travel;const activeRoute=travel&&(a.routes||[]).find(route=>route.id===travel.routeId);let travelMarker='';if(activeRoute){const p=a.nodes.find(node=>node.id===activeRoute.from),q=a.nodes.find(node=>node.id===activeRoute.to);if(p&&q){const local=Math.max(0,Math.min(1,Number(travel.progressKm||0)/Math.max(1,Number(activeRoute.distance||1))));const ratio=travel.fromId===activeRoute.from?local:1-local;const x=p.x+(q.x-p.x)*ratio,y=p.y+(q.y-p.y)*ratio;travelMarker=`<g class="atlas-traveler" transform="translate(${x} ${y})"><circle r="4"/><text text-anchor="middle" y="1">✦</text></g>`;}}
 const nearby=(a.routes||[]).filter(route=>route.from===a.current||route.to===a.current).map(route=>{const destination=a.nodes.find(node=>node.id===(route.from===a.current?route.to:route.from));if(!destination)return '';const blocked=route.blocked||route.bridge?.status==='BROKEN';return `<div class="route-card ${blocked?'blocked':''}"><span class="route-card-icon">${route.river?'≈':route.road?'⌁':'⌇'}</span><div class="grow"><strong>${esc(destination.name)}</strong><small>${esc(route.direction||'rota')} · ${Number(route.distance||0)} km · ${esc(route.terrain||'trilha')} · ${Number(route.travelTime||1)} turno(s)</small>${route.river?`<small>Rio: ${esc(route.river)}${route.bridge?` · ${esc(route.bridge.name)}: ${route.bridge.status==='INTACT'?'intacta':'destruída'}`:''}</small>`:''}<span class="risk-dots">${'◆'.repeat(Math.max(1,Math.min(5,Number(route.danger||1))))}</span></div>${destination.id!==a.current?`<button class="button secondary small" data-travel="${esc(destination.name)}">${blocked?'Tentar atravessar':'Viajar'}</button>`:''}</div>`;}).join('');
 return `<section class="stack"><div class="rpg-heading"><span class="eyebrow">Atlas canônico pessoal</span><h1>${travel?'Em deslocamento':esc(w.location)}</h1><p>${travel?`${Number(travel.progressKm||0).toFixed(1)} de ${Number(travel.distanceKm||0).toFixed(1)} km percorridos. A posição é persistente e encontros acontecem no trecho real da rota.`:'Rios, pontes, estradas e obstáculos abaixo pertencem ao estado real do mundo. O motor consulta esta geografia antes de narrar qualquer viagem.'}</p></div><div class="card atlas-v2-canvas"><div class="atlas-toolbar"><div><strong>Vale de Aurora</strong><small class="muted">Mapa conhecido por ${esc(game.character.identity.name)}</small></div><span class="atlas-compass">N ↑</span></div><div class="atlas-frame"><svg viewBox="0 0 100 100" role="img" aria-label="Mapa de fantasia dos locais conhecidos"><defs><radialGradient id="atlasGlow"><stop stop-color="#f0d58a"/><stop offset="1" stop-color="#8872cc"/></radialGradient><filter id="fog"><feGaussianBlur stdDeviation="2"/></filter></defs><path class="terrain-shape terrain-highlands" d="M58 0L100 0 100 38 85 32 72 22 63 30 52 15Z"/><path class="terrain-shape terrain-forest" d="M39 39C54 24 88 24 100 44L100 85C80 80 70 66 54 73 43 65 35 53 39 39Z"/><path class="terrain-shape terrain-marsh" d="M0 62C18 50 33 57 45 73L40 100H0Z"/><path class="terrain-river" d="M92 0C77 20 91 31 72 48S55 70 40 100"/><path class="terrain-ridge" d="M55 9L64 17 72 8 80 20 89 11"/><path class="terrain-trail" d="M18 18C28 36 35 56 50 76S70 58 78 20"/>${routeMarkup}${a.nodes.map(node=>`<g class="atlas-node ${node.id===a.current&&!travel?'current':'reachable'}" transform="translate(${node.x} ${node.y})"><circle class="node-halo" r="${node.id===a.current&&!travel?6:4.6}"/><circle class="node-core danger-${Math.max(1,Math.min(5,Number(node.dangerLevel||2)))}" r="2.5"/><text class="node-icon" text-anchor="middle" y=".3">${glyph[node.kind]||'✦'}</text><text class="node-label" text-anchor="middle" y="8">${esc(node.name)}</text></g>`).join('')}${travelMarker}<g class="atlas-decor"><text x="6" y="92">Campos do Alvorecer</text><text x="60" y="42">Rio Lúmen</text><text x="66" y="9">Serra Lunar</text></g></svg><div class="atlas-vignette"></div></div><div class="atlas-legend"><span><i class="legend-current"></i>Você</span><span><i class="legend-route"></i>Rota conhecida</span><span><i class="legend-danger"></i>Perigo</span></div></div><div class="card"><span class="eyebrow">${travel?'Deslocamento em andamento':`Saídas de ${esc(current?.name||w.location)}`}</span>${travel?`<div class="travel-progress"><div class="progress-track"><div class="progress-fill" style="width:${percent(travel.progressKm,travel.distanceKm)}%"></div></div><button class="button secondary" data-travel="Continuo pela estrada para frente">Continuar viagem</button></div>`:`<div class="route-list">${nearby||'<p class="muted">Nenhuma saída conhecida.</p>'}</div>`}</div><div class="map-place-grid">${a.nodes.map(node=>`<article class="card map-place-v2 ${node.id===a.current&&!travel?'current':''}"><span class="map-place-icon">${glyph[node.kind]||'✦'}</span><span class="pill">${esc(node.kind)}</span><h3>${esc(node.name)}</h3><p>${esc(node.region)} · ${esc(node.biome)} · ${node.visited?'Visitado':'Conhecido'}</p><div class="map-place-meta">${(node.features||[]).slice(0,3).map(feature=>`<span>${esc(feature)}</span>`).join('')}</div>${node.id===a.current&&!travel?'<span class="save-indicator">Você está aqui</span>':''}</article>`).join('')}</div><p class="muted tiny">NPCs distantes permanecem no Diário com a última localização conhecida, mas não podem conversar sem uma mecânica real de comunicação.</p></section>`;
}
function relationshipMeters(r={}){return `<div class="relationship-grid"><div><span>Afeto</span><i><b style="width:${Number(r.affection||0)}%"></b></i><strong>${Number(r.affection||0)}</strong></div><div><span>Confiança</span><i><b style="width:${Number(r.trust||0)}%"></b></i><strong>${Number(r.trust||0)}</strong></div><div class="suspicion"><span>Desconfiança</span><i><b style="width:${Number(r.suspicion||0)}%"></b></i><strong>${Number(r.suspicion||0)}</strong></div></div>`;}
function journalTab(game){const w=game.campaign.world;return `<section class="stack"><div class="rpg-heading"><span class="eyebrow">Memória individual</span><h1>Diário & Vínculos</h1><p>As pessoas lembram de cada personagem de forma diferente. O que você conhece não é automaticamente conhecido pelo grupo.</p></div><h2>Missões</h2><div class="quest-grid">${(w.quests||[]).map(q=>{const objectives=q.objectives||[];const done=objectives.filter(o=>o.completed).length;return `<article class="card quest-card-v2 ${q.status==='COMPLETED'?'completed':''}"><div class="quest-top"><span class="quest-glyph">◇</span><div class="grow"><span class="pill">${q.status==='COMPLETED'?'Concluída':'Em andamento'}</span><h3>${esc(q.name)}</h3><p>${esc(q.description)}</p></div></div><div class="quest-progress-head"><span>${esc(q.location||'Local variável')}</span><span>${done}/${objectives.length||1}</span></div><div class="objective-list">${objectives.map(o=>`<div class="objective ${o.completed?'done':''}"><span>${o.completed?'✓':'○'}</span><div><strong>${esc(o.description||o.type||'Objetivo')}</strong><small>${Number(o.progress||0)}/${Number(o.required||1)}</small></div></div>`).join('')||'<div class="objective"><span>○</span><div><strong>Progresso controlado pelo servidor</strong></div></div>'}</div><div class="quest-rewards"><span>Risco: ${esc(q.risk||'normal')}</span><span>Recompensa: ${q.reward?.xp||q.rewardXp||0} XP</span></div></article>`;}).join('')||'<div class="card empty">Nenhuma missão conhecida.</div>'}</div><h2>Pessoas que você conhece</h2><div class="npc-journal-grid">${(w.knownNpcs||w.npcs||[]).map(n=>{const near=!n.location||n.location===w.location;return `<article class="card npc-journal-card"><div class="npc-portrait">♙</div><div><h3>${esc(n.name)}</h3><p>${esc(n.description)}</p><small>${esc(n.occupation||n.role||'Conhecido')} ${n.faction?`· ${esc(n.faction)}`:''}</small><small>⌖ ${esc(n.location||'Local desconhecido')}</small></div>${relationshipMeters(n.relationship)}${near?`<button class="button secondary small" data-dialogue="${esc(n.name)}">Conversar agora</button>`:`<div class="distance-lock">⌁ Distante — última localização conhecida: ${esc(n.location)}</div>`}</article>`;}).join('')||'<div class="card empty">Você ainda não conhece ninguém.</div>'}</div><button class="button secondary" data-tab="history">Abrir crônica completa</button></section>`;}
function worldHubTab(game){
 const w=game.campaign.world||{}, eco=w.ecosystem||{}, clocks=w.clocks||[], factions=eco.factions||[], quests=w.quests||[], npcs=w.knownNpcs||w.npcs||[], bestiary=w.bestiary||[];
 const tension=Math.round(Number(w.tension||0));
 return `<section class="stack"><div class="remaster-hero world-hub-hero"><div><span class="eyebrow">Mundo persistente</span><h1>Atlas Vivo</h1><p>Mapa, facções, missões, pessoas, ameaças e relógios agora ficam reunidos em uma central de mundo. O cenário continua avançando mesmo quando vocês perseguem outra coisa.</p><div class="row wrap"><span class="pill">${esc(w.location||'Desconhecido')}</span><span class="pill">${esc(w.time||'—')}</span><span class="pill gold">Tensão ${tension}%</span></div></div><div class="world-orb">⌘</div></div><div class="world-hub-grid"><button class="world-hub-link" data-tab="map"><span>⌘</span><b>Mapa</b><small>${w.atlas?.nodes?.length||0} locais conhecidos</small></button><button class="world-hub-link" data-tab="journal"><span>◇</span><b>Missões</b><small>${quests.filter(q=>q.status==='ACTIVE').length} ativas</small></button><button class="world-hub-link" data-tab="skills" data-codex-jump="bestiary"><span>◈</span><b>Bestiário</b><small>${bestiary.length} criaturas registradas</small></button><button class="world-hub-link" data-tab="history"><span>◷</span><b>Crônica</b><small>Memória completa</small></button></div><div class="card world-pulse"><div class="row between"><div><span class="eyebrow">Pulso do mundo</span><h2>${esc(eco.biome||'Terras desconhecidas')}</h2></div><span class="pill ${Number(eco.dangerLevel||0)>=4?'red':'gold'}">Perigo ${Number(eco.dangerLevel||0)}/5</span></div><p>${esc(eco.ambience||'O mundo aguarda novas pegadas.')}</p><div class="tension-meter"><span style="width:${Math.max(0,Math.min(100,tension))}%"></span></div></div><div class="split-grid"><div class="card"><span class="eyebrow">Relógios</span><h2>Consequências em movimento</h2>${clocks.map(clock=>`<div class="world-clock"><div class="row between"><strong>${esc(clock.title)}</strong><small>${Number(clock.progress||0)}/${Number(clock.segments||1)}</small></div><div class="progress-track"><div class="progress-fill" style="width:${percent(clock.progress,clock.segments)}%"></div></div><small>${esc(clock.description||'')}</small></div>`).join('')||'<p class="muted">Nenhum relógio ativo.</p>'}</div><div class="card"><span class="eyebrow">Facções</span><h2>Forças do cenário</h2>${factions.map(f=>`<div class="faction-entry"><div><strong>${esc(f.name)}</strong><small>${esc(f.description||f.role||'Influência regional')}</small></div><span class="pill">Rep. ${Number(f.reputation||0)}</span></div>`).join('')||'<p class="muted">Nenhuma facção conhecida.</p>'}</div></div><div class="card"><div class="row between"><div><span class="eyebrow">Rede social do mundo</span><h2>Pessoas conhecidas</h2></div><button class="button secondary small" data-tab="journal">Abrir diário</button></div><div class="npc-strip">${npcs.slice(0,6).map(n=>`<div class="npc-chip"><span>♙</span><div><strong>${esc(n.name)}</strong><small>${esc(n.role||n.location||'Conhecido')}</small></div></div>`).join('')||'<span class="muted">Ninguém conhecido ainda.</span>'}</div></div></section>`;
}

function groupTab(game){
 const me=game.party.find(p=>p.user?.id===state.user?.id);const master=game.master||game.party.find(p=>p.isMaster)?.user;const readyCount=game.party.filter(p=>p.lobbyReady).length;const vote=game.vote;
 const features=[['Drop-in',game.campaign.settings.allowLateJoin],['Ausência segura',game.campaign.settings.continueWithAbsentees],['Co-mestres',(game.campaign.coMasterUserIds||[]).length>0],['Votação',Boolean(vote)],['WebSocket',state.socketStatus==='online'],['Fallback IA',game.campaign.settings.aiFallbackProvider&&game.campaign.settings.aiFallbackProvider!=='none']];
 const partyCards=game.party.map(p=>`<article class="card party-card ${p.away?'party-away':''}"><div class="row"><div class="avatar-wrap"><div class="avatar-mark" style="--avatar-accent:${esc(p.character?.presentation?.accent||p.user?.presentation?.accent||'#8b7cff')}">${esc(p.character?.presentation?.avatar||p.user?.presentation?.avatar||'✦')}</div><i class="presence-dot ${p.online?'online':''}"></i></div><div class="grow"><h3>${esc(p.character?.name||p.user.displayName)}</h3><p class="muted tiny">${esc(p.character?.className||'Sem classe')} · nível ${p.character?.level||1}</p><p class="party-place">⌖ ${esc(p.character?.location||'Local desconhecido')}</p><div class="role-row">${p.isOwner?'<span class="role-badge owner">Host</span>':''}${p.isMaster?'<span class="role-badge master">Mestre</span>':''}${p.isCoMaster?'<span class="role-badge co">Co-mestre</span>':''}${p.away?'<span class="pill red">Ausente</span>':''}</div></div><span class="pill ${p.lobbyReady?'gold':''}">${game.campaign.state==='LOBBY'?(p.lobbyReady?'Pronto':'Preparando'):p.away?'Fora':p.character?.ready?'Ação pronta':p.online?'Online':'Offline'}</span></div>${p.character?resources(p.character):''}<div class="row wrap">${game.isOwner&&!p.isMaster?`<button class="button ghost small" data-transfer-master="${esc(p.user.id)}">Tornar Mestre</button>`:''}${game.isOwner&&!p.isOwner&&!p.isMaster?`<button class="button ghost small" data-co-master="${esc(p.user.id)}" data-enable="${p.isCoMaster?'0':'1'}">${p.isCoMaster?'Remover co-mestre':'Delegar co-mestre'}</button>`:''}</div></article>`).join('');
 const voteBox=vote?`<div class="card vote-panel"><div class="row between"><div><span class="eyebrow">Decisão coletiva</span><h2>${esc(vote.prompt)}</h2></div><span class="pill">${vote.options.reduce((n,o)=>n+Number(o.count||0),0)}/${game.party.length} votos</span></div><div class="vote-options">${vote.options.map(o=>`<button class="vote-option ${vote.myVote===o.id?'selected':''}" data-vote-option="${esc(o.id)}"><span>${esc(o.label)}</span><b>${Number(o.count||0)}</b></button>`).join('')}</div>${game.canControl?'<button class="button secondary small" id="close-vote">Encerrar votação</button>':''}</div>`:game.canControl?`<details class="card"><summary>Criar votação do grupo</summary><form id="vote-form"><label>Pergunta<input name="prompt" maxlength="160" placeholder="Ex.: Qual rota seguimos?" required></label><label>Opção A<input name="optionA" maxlength="80" required></label><label>Opção B<input name="optionB" maxlength="80" required></label><label>Opção C (opcional)<input name="optionC" maxlength="80"></label><button class="button">Abrir votação</button></form></details>`:'';
 return `<section class="stack"><div class="remaster-hero multiplayer-hero"><div><span class="eyebrow">Multiplayer 6.0</span><h1>Sala de Expedição</h1><p>${game.party.filter(p=>p.online).length}/${game.party.length} conectados · Mestre: <strong>${esc(master?.displayName||'—')}</strong> · ${readyCount}/${game.party.length} prontos no lobby</p><div class="system-ribbon">${features.map(([label,on])=>`<span class="${on?'on':''}"><i></i>${esc(label)}</span>`).join('')}</div></div><div class="network-emblem">⌁</div></div>${game.catchUp?`<div class="card catch-up"><span class="eyebrow">Você entrou depois do início</span><h2>Recapitulação instantânea</h2><p>${esc(game.catchUp.summary||'A campanha já estava em movimento.')}</p>${(game.catchUp.recent||[]).map(t=>`<small><b>T${t.number}</b> ${esc(t.summary||'')}</small>`).join('')}</div>`:''}<div class="card master-card"><div><span class="eyebrow">Autoridade distribuída</span><h2>👑 Mestre + co-mestres</h2><p class="muted tiny">O Host mantém infraestrutura e chaves. O Mestre conduz a sessão. Até dois co-mestres podem receber controles operacionais sem obter acesso ao Termux, banco ou segredos da API.</p></div>${game.isOwner&&game.campaign.masterUserId!==game.campaign.ownerId?'<button class="button secondary small" id="reclaim-master">Retomar mestragem</button>':''}</div><div class="party-grid">${partyCards}</div><div class="control-grid"><div class="card"><span class="eyebrow">Sua presença</span><h2>${me?.away?'Você está fora da rodada':'Você está disponível'}</h2><div class="row wrap">${game.campaign.state==='LOBBY'?`<button class="button ${me?.lobbyReady?'secondary':''}" id="lobby-ready" data-ready="${me?.lobbyReady?'0':'1'}">${me?.lobbyReady?'Desmarcar pronto':'Marcar como pronto'}</button>`:''}<button class="button ${me?.away?'':'secondary'}" id="toggle-away" data-away="${me?.away?'0':'1'}">${me?.away?'Voltar à sessão':'Ausentar temporariamente'}</button></div></div><div class="card"><span class="eyebrow">Controle da sessão</span><h2>${game.canControl?'Você pode conduzir':'Somente leitura'}</h2><p class="muted tiny">${game.canControl?'Pode fechar turno, pausar, retomar, votar e administrar a sessão conforme seu papel.':'Você continua jogando normalmente sem controles de mestre.'}</p><button class="button secondary small" data-tab="settings">Configurações</button></div></div>${voteBox}<div class="card"><h2>Como o multiplayer se mantém vivo</h2><div class="feature-grid"><div><b>Entrada tardia</b><small>Novos jogadores recebem recapitulação sem reescrever o passado.</small></div><div><b>Ausência temporária</b><small>O personagem é preservado e deixa de bloquear turnos.</small></div><div><b>Autoridade separada</b><small>Host, Mestre e co-mestre são papéis diferentes.</small></div><div><b>Votação nativa</b><small>Decisões do grupo ficam dentro da própria sessão.</small></div></div></div></section>`;
}


function devTab(game){if(!game.devTools)return '<div class="card">Ferramentas indisponíveis.</div>';return `<section class="stack"><div class="card"><h2>Laboratório do Host</h2><p>Exclusivo de campanha tutorial, com EIDRYSS_DEV_TOOLS=1. A narrativa real consome a API configurada.</p><label>Falha simulada<select id="dev-failure"><option value="none">Sem falha simulada</option><option value="quota">Cota esgotada</option><option value="auth">Chave inválida</option><option value="timeout">Timeout</option><option value="invalid">Resposta inválida</option></select></label><button class="button" id="dev-set-failure">Aplicar cenário</button><button class="button secondary" id="dev-xp">Conceder 300 XP ao grupo de teste</button><label>Turnos de simulação<input id="dev-turns" type="number" min="1" max="10" value="3"></label><button class="button" id="dev-run">Simular turnos com IA</button><p id="dev-result" role="status"></p></div></section>`;}

function historyTab() {
  if (!state.history) return '<div class="card empty">Carregando o histórico…</div>';
  return `<section class="card"><h2>Crônica da campanha</h2><p class="muted tiny">Os turnos completos ficam no celular servidor; a IA recebe apenas a memória relevante. Cenas secretas aparecem somente na conta que as realizou.</p><div class="timeline">${state.history.length ? state.history.map((turn) => `<details><summary>Turno ${turn.number} · ${esc(turn.provider)}</summary><div class="timeline-content"><p>${esc(turn.narrative)}</p><div class="divider"></div>${turn.events.filter(e=>e.type==='DICE_ROLLED').map(e=>`<div class="dice-result">D20: ${e.data.die} + ${e.data.bonus} = ${e.data.total} · dificuldade ${e.data.difficulty} · ${e.data.success?'sucesso':'falha'}</div>`).join('')}${turn.actions.map((action) => `<blockquote><strong>${esc(action.characterName)}</strong><br>${esc(action.text)}<p class="muted tiny">${esc(action.result?.summary||'')}</p>${action.secretText?`<div class="history-secret"><b>⌁ Sua ação secreta</b><span>${esc(action.secretText)}</span><p>${esc(action.secretResult?.narrative||'')}</p></div>`:''}</blockquote>`).join('')}</div></details>`).join('') : '<div class="empty">Nenhum turno concluído.</div>'}</div></section>`;
}

function saveControls(game) {
  return `<div class="card"><div class="row between"><div><h2>Dados da campanha</h2><p class="muted tiny">Salvamento automático ativo · último registro ${savedTime(game.campaign.lastSavedAt)}</p></div><span class="save-indicator">✓ salvo</span></div><div class="row wrap"><button class="button" id="save-campaign">Salvar campanha</button><button class="button ghost" id="save-exit">Salvar e sair</button>${game.isOwner ? '<button class="button secondary" id="export-backup">Backup protegido</button><details class="raw-backup"><summary>Backup bruto do proprietário</summary><p class="tiny muted">Inclui ações e memórias privadas. Guarde somente no celular servidor.</p><button class="button danger small" id="export-raw" type="button">Baixar bruto</button></details>' : ''}</div></div>`;
}

function interfaceControls() {
  return `<div class="card"><div class="row between wrap"><div><h2>Interface deste aparelho</h2><p class="muted tiny">${state.performanceLow ? 'Modo leve ativo.' : 'Qualidade visual completa.'} ${state.compactMode?'Layout compacto ativo.':'Layout confortável ativo.'}</p></div><div class="row wrap"><button class="button ghost small" id="toggle-performance">${state.performanceLow ? 'Visual completo' : 'Modo leve'}</button><button class="button ghost small" id="toggle-compact">${state.compactMode?'Layout confortável':'Layout compacto'}</button><button class="button ghost small" id="toggle-motion">${state.motionReduced ? 'Ativar animações' : 'Reduzir animações'}</button>${state.installPrompt?'<button class="button secondary small" id="install-app">Instalar app</button>':''}</div></div></div>`;
}

function onlineConnectionCard(isOwner) {
  if (!isOwner) return `<div class="card"><h2>Conexão online</h2><p class="muted tiny">O organizador pode abrir um link temporário e seguro para vocês jogarem de redes diferentes. Peça a ele o link HTTPS e o código da sala.</p></div>`;
  return `<div class="card online-card"><div class="row between"><div><span class="eyebrow">Fora do Wi‑Fi</span><h2 style="margin-top:5px">Jogar com amigos de casa</h2></div><span class="online-orb">⌁</span></div><p class="muted tiny">No Termux, feche o servidor atual com <code>Ctrl+C</code> e execute o inicializador online. Ele abre o jogo e mostra um link HTTPS temporário; envie esse link e o código da sala aos colegas.</p><div class="code-box"><code>bash INICIAR-ONLINE-TERMUX.sh</code><button class="button secondary small" data-copy="bash INICIAR-ONLINE-TERMUX.sh">Copiar</button></div><p class="tiny muted">O link muda quando o terminal é encerrado. Nunca envie <code>data/server.key</code> nem o arquivo do banco; os amigos só precisam do link, uma conta e o código da sala.</p></div>`;
}

function credentialUi(meta, provider) {
  const item = meta?.[provider];
  if (!item?.configured) return { text: 'Nenhuma chave salva para este provedor.', badge: 'Sem chave', removable: false, source: 'none' };
  if (item.source === 'environment') return { text: 'Chave carregada pelo servidor (.env). Ela não pode ser apagada pela interface.', badge: 'Chave do servidor', removable: false, source: 'environment' };
  return { text: 'Chave cifrada salva neste celular. Você pode substituí-la ou excluí-la.', badge: 'Chave salva', removable: true, source: 'profile' };
}

function settingsTab(game) {
  const c = game.campaign; const available = game.aiAvailability; const waiting = game.turn?.status === 'WAITING_FOR_AI'; const unlocked = ['LOBBY', 'PAUSED'].includes(c.state) || waiting;
  const options = [['groq','Groq · gsk_'],['gemini','Gemini'],['openai','OpenAI'],['grok','Grok'],['openrouter','OpenRouter'],['custom','Outra API']];
  if (!game.isOwner) return `<section class="stack">${game.isMaster?`<div class="card accent"><span class="eyebrow">Mestre atual</span><h2>Controle da sessão</h2><p class="muted tiny">Você recebeu autoridade para conduzir a sessão. A infraestrutura e as chaves continuam no celular do proprietário.</p><div class="row wrap">${c.state==='ACTIVE'?'<button class="button secondary" id="pause">Pausar campanha</button>':c.state==='PAUSED'?'<button class="button" id="resume">Retomar campanha</button>':''}${waiting?'<button class="button" id="retry-ai">Tentar IA novamente</button>':''}</div></div>`:''}<div class="card"><h2>Configuração</h2><p class="muted">A campanha usa IA por <strong>${esc(c.settings.aiProvider)}</strong>. Regras, provedor e chaves ficam sob controle do proprietário.</p></div>${onlineConnectionCard(false)}${interfaceControls()}${saveControls(game)}</section>`;
  const key = credentialUi(game.aiCredentialMeta, c.settings.aiProvider);
  const waitingBox = waiting ? `<div class="ai-waiting"><p class="sent"><strong>Turno preservado.</strong> ${esc(game.turn.aiError || 'Confira a chave, créditos ou modelo.')} As ações continuam seladas e o resultado mecânico não será recalculado.</p><div class="row wrap"><button class="button" id="retry-ai" type="button">Tentar com a chave salva</button><button class="button secondary" id="save-retry-ai" type="button">Salvar nova chave e tentar</button></div></div>` : '';
  return `<section class="stack">${c.state==='ACTIVE'?'<button class="button secondary" id="pause">Pausar campanha</button>':c.state==='PAUSED'?'<button class="button" id="resume">Retomar campanha</button>':''}<div class="card"><div class="row between wrap"><div><span class="eyebrow">Mestre narrativo</span><h2 style="margin-top:5px">IA da campanha</h2></div><span class="pill" data-key-badge>${esc(key.badge)}</span></div>${waitingBox}<form id="settings-form"><label>Provedor<select name="aiProvider" ${unlocked ? '' : 'disabled'}>${options.map(([value,label]) => `<option value="${value}" ${c.settings.aiProvider===value?'selected':''}>${label} ${available[value]?'✓':'—'}</option>`).join('')}</select></label><label>Provedor reserva<select name="aiFallbackProvider" ${unlocked ? '' : 'disabled'}><option value="none" ${!c.settings.aiFallbackProvider||c.settings.aiFallbackProvider==='none'?'selected':''}>Desativado</option>${options.filter(([value])=>value!==c.settings.aiProvider).map(([value,label])=>`<option value="${value}" ${c.settings.aiFallbackProvider===value?'selected':''}>${label} ${available[value]?'✓':'—'}</option>`).join('')}</select><small class="muted tiny">Se o provedor principal cair ou atingir cota, o Eidryss tenta este provedor sem rerrolar dados nem alterar o resultado mecânico.</small></label><div class="ai-key-manager"><div class="row between wrap"><div><strong>Chave de API</strong><p class="muted tiny" data-key-status>${esc(key.text)}</p></div></div><label>Adicionar ou substituir chave<input type="password" name="aiApiKey" maxlength="1000" autocomplete="off" placeholder="Cole uma nova chave; a atual nunca é exibida" ${unlocked ? '' : 'disabled'}></label><div class="row wrap"><button class="button small" id="save-ai-key" type="button" ${unlocked ? '' : 'disabled'}>Salvar nova chave</button><button class="button secondary small" id="test-ai-key" type="button" ${unlocked ? '' : 'disabled'}>Testar chave digitada</button><button class="button danger small" id="delete-ai-key" type="button" ${unlocked && key.removable ? '' : 'disabled'}>Excluir chave atual</button></div><p class="muted tiny">Salvar uma nova chave substitui somente a chave deste provedor. As chaves de outros provedores continuam guardadas separadamente.</p></div><label>Modelo<input name="aiModel" value="${esc(c.settings.aiModel || '')}" placeholder="modelo recomendado" ${unlocked ? '' : 'disabled'}><small class="muted tiny" data-model-hint></small></label><label data-openrouter-only>Atalho OpenRouter<select data-openrouter-preset ${unlocked ? '' : 'disabled'}><option value="openai/gpt-5.6-terra">GPT-5.6 Terra · equilibrado</option><option value="openai/gpt-5.6-luna">GPT-5.6 Luna · econômico</option><option value="openai/gpt-5.6-sol">GPT-5.6 Sol · máxima qualidade</option></select></label><label data-custom-only>Endereço da API compatível<input name="aiBaseUrl" type="url" maxlength="500" value="${esc(c.settings.aiBaseUrl || '')}" placeholder="https://provedor.exemplo/v1" ${unlocked ? '' : 'disabled'}></label><label>Tom da narrativa<input name="tone" value="${esc(c.settings.tone)}" ${unlocked ? '' : 'disabled'}></label><div class="row"><label class="grow">Profundidade<select name="narrativeDepth" ${unlocked ? '' : 'disabled'}><option value="balanced" ${c.settings.narrativeDepth==='balanced'?'selected':''}>Balanceada</option><option value="cinematic" ${c.settings.narrativeDepth!=='balanced'&&c.settings.narrativeDepth!=='epic'?'selected':''}>Cinematográfica</option><option value="epic" ${c.settings.narrativeDepth==='epic'?'selected':''}>Épica</option></select></label><label class="grow">Eventos<select name="worldEventFrequency" ${unlocked ? '' : 'disabled'}><option value="low" ${c.settings.worldEventFrequency==='low'?'selected':''}>Raros</option><option value="normal" ${!c.settings.worldEventFrequency||c.settings.worldEventFrequency==='normal'?'selected':''}>Normais</option><option value="high" ${c.settings.worldEventFrequency==='high'?'selected':''}>Frequentes</option><option value="chaotic" ${c.settings.worldEventFrequency==='chaotic'?'selected':''}>Caóticos</option></select></label></div><p class="muted tiny">Narrativa mais longa usa mais tokens. Eventos são calculados pelo servidor e preservados no retry.</p><label>Regras canônicas<textarea name="worldRules" maxlength="3000" ${unlocked ? '' : 'disabled'}>${esc(c.settings.worldRules || '')}</textarea></label><div class="row"><label class="grow">Mínimo ativo<select name="minPlayers" ${unlocked ? '' : 'disabled'}>${[1,2,3,4].filter(n=>n<=c.settings.maxPlayers).map(n=>`<option value="${n}" ${c.settings.minPlayers===n?'selected':''}>${n} jogador${n===1?'':'es'}</option>`).join('')}</select></label><label class="grow">Vagas<strong class="setting-static">${c.settings.maxPlayers}</strong></label></div><label class="checkbox"><input type="checkbox" name="allowLateJoin" ${c.settings.allowLateJoin!==false?'checked':''} ${unlocked ? '' : 'disabled'}> Permitir entrada durante a sessão</label><label class="checkbox"><input type="checkbox" name="continueWithAbsentees" ${c.settings.continueWithAbsentees!==false?'checked':''} ${unlocked ? '' : 'disabled'}> Fechar turno automaticamente sem jogadores offline, mantendo o mínimo ativo</label><label class="checkbox"><input type="checkbox" name="experimentalDice" ${c.settings.experimentalDice?'checked':''} ${unlocked?'':'disabled'}> Dados D20 experimentais (1 falha, 20 crítico)</label><label class="checkbox"><input type="checkbox" name="allowActionEdit" ${c.settings.allowActionEdit?'checked':''} ${unlocked ? '' : 'disabled'}> Permitir alterar ação antes do fechamento</label><label class="checkbox"><input type="checkbox" name="allowPvp" ${c.settings.allowPvp?'checked':''} ${unlocked ? '' : 'disabled'}> Permitir combate entre jogadores</label>${unlocked ? '<button class="button">Salvar outras configurações</button>' : '<p class="muted tiny">Pause a campanha para alterar regras ou provedor.</p>'}</form><button class="button ghost small" id="test-ai" type="button">Testar chave já salva</button></div>${game.devTools?'<button class="button secondary" data-tab="dev">Laboratório de testes</button>':''}<details class="card"><summary>Correção administrativa</summary><p class="muted tiny">Pause em um turno sem ações. Toda correção exige motivo.</p><form id="admin-form"><label>Operação<select name="operation"><option value="grant-ai-item">Criar item com IA e enviar à mochila</option><option value="grant-item">Conceder item pronto do catálogo</option><option value="remove-item">Remover item pelo ID</option><option value="hp">Corrigir HP</option><option value="reopen">Reabrir turno sem cálculo</option></select></label><label data-admin-character>Personagem<select name="characterId">${game.party.map(p=>`<option value="${p.character.id}">${esc(p.character.name)}</option>`).join('')}</select></label><label data-admin-item><span data-admin-item-label>Pedido do item</span><input name="itemId" maxlength="500" placeholder="Ex.: espada lendária de gelo, elegante e adequada ao nível atual"></label><p class="muted tiny" data-admin-item-help>A IA cria nome final, descrição, raridade e bônus; o servidor limita os números para não quebrar o equilíbrio.</p><label data-admin-quantity>Quantidade<input name="quantity" type="number" min="1" max="20" value="1"></label><label data-admin-hp hidden>HP<input name="value" type="number" min="0" value="1"></label><label>Motivo<input name="reason" minlength="3" maxlength="200" placeholder="Ex.: recompensa do Host" required></label><button class="button danger" data-admin-submit>Criar e conceder item</button></form></details><div class="card"><h2>Memória persistente</h2><p class="muted tiny">Cânone, fatos, capítulos e memórias privadas dos NPCs ficam no servidor. A IA recebe só o contexto relevante; fichas e segredos não são enviados aos jogadores.</p></div>${onlineConnectionCard(true)}${interfaceControls()}${saveControls(game)}</section>`;
}

function guideMarkup() {
  if (!state.guideOpen) return '';
  const step = GUIDE_STEPS[state.guideStep];
  return `<div class="guide-shade"></div><aside class="guide-panel"><div class="guide-head"><div class="guide-avatar">🤖</div><div><span class="eyebrow">Íris · ${state.guideStep + 1}/${GUIDE_STEPS.length}</span><h3>${esc(step.title)}</h3></div><button class="guide-close" id="guide-close">×</button></div><p>${esc(step.text)}</p><div class="guide-dots">${GUIDE_STEPS.map((_, index) => `<i class="${index === state.guideStep ? 'active' : ''}"></i>`).join('')}</div><div class="row between"><button class="button ghost small" id="guide-prev" ${state.guideStep === 0 ? 'disabled' : ''}>Voltar</button><button class="button small" id="guide-next">${state.guideStep === GUIDE_STEPS.length - 1 ? 'Concluir' : 'Próximo'}</button></div></aside>`;
}

function moreMenuMarkup(){if(!state.moreOpen)return '';const entries=[['progression','⬡','Evolução','Atributos, talentos e caminhos'],['classes','◫','Classes','24 arquétipos e 72 caminhos'],['worldhub','⌘','Mundo','Pulso, facções e relógios'],['map','⌖','Atlas','Rotas e localização pessoal'],['journal','◇','Diário','Missões, NPCs e vínculos'],['group','⌁','Grupo','Jogadores e mestragem'],['history','◷','Crônica','Histórico persistente'],['settings','⚙','Ajustes','IA, regras e interface']];return `<div class="more-backdrop" id="more-close"></div><aside class="more-drawer" aria-label="Mais áreas"><div class="more-handle"></div><div class="row between"><div><span class="eyebrow">Navegação avançada</span><h2>Mais do mundo</h2></div><button class="guide-close" id="more-x">×</button></div><div class="more-grid">${entries.map(([tab,icon,label,desc])=>`<button data-tab="${tab}" class="more-link ${state.tab===tab?'active':''}"><span>${icon}</span><div><strong>${label}</strong><small>${desc}</small></div><i>›</i></button>`).join('')}</div></aside>`;}

function renderGame() {
  const game = state.game; if (!game) return;
  const previous=app.querySelector('.page-content');const same=previous?.dataset.scene===`${state.campaignId}:${state.tab}:${game.turn?.id}`;
  const fields=same?[...app.querySelectorAll('form input, form textarea, form select')].map(el=>({form:el.form?.id,name:el.name,value:el.value,checked:el.checked})):[];
  const active=same&&document.activeElement;const focused=active?.name?{form:active.form?.id,name:active.name,start:active.selectionStart,end:active.selectionEnd}:null;

  applyVisualMode(game.campaign.settings.visualTheme);
  const tabContent = { story: () => storyTab(game), character: () => characterTab(game), progression:()=>progressionTab(game), classes:()=>classesTab(game), inventory: () => inventoryTab(game), history: () => historyTab(), skills:()=>skillsTab(game), worldhub:()=>worldHubTab(game), map:()=>mapTab(game), journal:()=>journalTab(game), group:()=>groupTab(game), dev:()=>devTab(game), settings: () => settingsTab(game) }[state.tab]?.() || storyTab(game);
  const primaryTabs=[['story','✦','Aventura'],['character','♙','Herói'],['skills','✺','Códice'],['inventory','◇','Arsenal']];const moreTabs=new Set(['progression','classes','worldhub','map','journal','group','history','settings','dev']);
  app.innerHTML = `<div class="page-content" data-scene="${esc(`${state.campaignId}:${state.tab}:${game.turn?.id}`)}"><header class="header"><button class="button ghost small" id="back">←</button><div class="header-copy"><span class="eyebrow">${game.campaign.isDemo ? 'Tutorial' : esc(statusName(game.campaign.state))}</span><h1>${esc(game.campaign.settings.campaignIcon || '✦')} ${esc(game.campaign.name)}</h1><span class="connection"><i class="dot ${state.socketStatus==='online'?'online':''}"></i>${state.socketStatus==='online'?'tempo real':state.socketStatus==='connecting'?'conectando':'reconectando'} · salvo ${savedTime(game.campaign.lastSavedAt)}</span></div><div class="header-badges">${game.isMaster?'<span class="pill gold">Mestre</span>':game.isCoMaster?'<span class="pill">Co-mestre</span>':''}<span class="pill">T${game.turn?.number || '—'}</span></div></header>${state.tab !== 'story' ? resources(game.character) : ''}<div style="height:12px"></div>${tabContent}</div><button class="guide-bot" id="guide-bot" aria-label="Abrir tutorial">🤖<small>Ajuda</small></button><nav class="bottom-nav bottom-nav-v73" aria-label="Navegação da aventura">${primaryTabs.map(([tab,icon,label])=>`<button data-tab="${tab}" class="${state.tab===tab?'active':''}"><span>${icon}</span>${label}</button>`).join('')}<button id="more-menu" class="more-button ${state.moreOpen||moreTabs.has(state.tab)?'active':''}" aria-expanded="${state.moreOpen}"><span class="plus-glyph">+</span>Mais</button></nav>${moreMenuMarkup()}${guideMarkup()}`;
  bindGameEvents();
  for(const f of fields){const el=document.getElementById(f.form)?.elements.namedItem(f.name);if(el){el.value=f.value;el.checked=f.checked;if(focused&&focused.form===f.form&&focused.name===f.name){el.focus({preventScroll:true});if(typeof el.setSelectionRange==='function'&&focused.start!=null)el.setSelectionRange(focused.start,focused.end??focused.start);}}}
}

async function chooseTab(tab, { historyMode = 'push' } = {}) {
  const changed = tab !== state.tab;
  state.tab = tab;
  state.moreOpen=false;
  if (changed && historyMode !== 'none') setNavigation('game', tab, historyMode);
  if (tab === 'history' && !state.history) { renderGame(); const result = await api(`/api/campaigns/${state.campaignId}/history`); state.history = result.history; }
  renderGame();
}

async function changeGuide(direction) {
  const next = state.guideStep + direction;
  if (next >= GUIDE_STEPS.length) { state.guideOpen = false; localStorage.setItem('germinal_tutorial_done', '1'); renderGame(); return; }
  if (next < 0) return;
  state.guideStep = next;
  await chooseTab(GUIDE_STEPS[next].tab);
}

async function saveAndExit() {
  try { await saveCampaignOnly(false); await loadLobby(); }
  catch (error) { toast(error.message, true); }
}

async function saveCampaignOnly(refresh=true){const result=await api(`/api/campaigns/${state.campaignId}/save`,{method:'POST'});toast(result.checkpointCreated?'✓ Campanha salva e checkpoint criado.':'✓ Campanha salva.');if(refresh)await loadGame();return result;}

function bindGameEvents() {
  app.querySelector('#back').onclick = () => {
    if (history.state?.eidryss && history.state.view === 'game' && history.length > 1) history.back();
    else saveAndExit();
  };
  app.querySelectorAll('[data-tab]').forEach((button) => button.onclick = () => { if(button.dataset.codexJump)state.codexSection=button.dataset.codexJump; chooseTab(button.dataset.tab); });
  const moreMenu=app.querySelector('#more-menu');if(moreMenu)moreMenu.onclick=()=>{state.moreOpen=!state.moreOpen;renderGame();};
  const closeMore=()=>{state.moreOpen=false;renderGame();};app.querySelector('#more-close')?.addEventListener('click',closeMore);app.querySelector('#more-x')?.addEventListener('click',closeMore);
  app.querySelectorAll('[data-codex-section]').forEach((button)=>button.onclick=()=>{state.codexSection=button.dataset.codexSection;renderGame();});
  app.querySelectorAll('[data-class-style-filter]').forEach((button)=>button.onclick=()=>{state.classStyle=button.dataset.classStyleFilter;renderGame();});
  const classSearch=app.querySelector('#class-search');if(classSearch)classSearch.addEventListener('input',()=>{state.classQuery=classSearch.value;clearTimeout(classSearch._t);classSearch._t=setTimeout(()=>renderGame(),100);});
  app.querySelectorAll('[data-class-pick]').forEach((button)=>button.onclick=async()=>{if(!confirm(`Confirmar ${button.textContent.replace('Escolher ','')} como sua classe? Essa escolha fica travada para o personagem.`))return;button.disabled=true;try{await api(`/api/campaigns/${state.campaignId}/character`,{method:'PATCH',body:JSON.stringify({classId:button.dataset.classPick})});toast('Classe confirmada e poderes iniciais concedidos.');await loadGame();}catch(e){toast(e.message,true);button.disabled=false;}});
  app.querySelectorAll('[data-copy]').forEach((button) => button.onclick = async () => { await navigator.clipboard.writeText(button.dataset.copy).catch(() => {}); toast(`Código ${button.dataset.copy} copiado.`); });
  app.querySelectorAll('[data-transfer-master]').forEach((button)=>button.onclick=async()=>{try{button.disabled=true;await api(`/api/campaigns/${state.campaignId}/master`,{method:'POST',body:JSON.stringify({targetUserId:button.dataset.transferMaster})});toast('Mestragem transferida. O servidor e as chaves continuam no seu celular.');await loadGame();}catch(e){toast(e.message,true);button.disabled=false;}});
  const reclaimMaster=app.querySelector('#reclaim-master');if(reclaimMaster)reclaimMaster.onclick=async()=>{try{reclaimMaster.disabled=true;await api(`/api/campaigns/${state.campaignId}/master`,{method:'POST',body:JSON.stringify({targetUserId:state.user.id})});toast('Você retomou a mestragem.');await loadGame();}catch(e){toast(e.message,true);reclaimMaster.disabled=false;}};
  const toggleAway=app.querySelector('#toggle-away');if(toggleAway)toggleAway.onclick=async()=>{try{toggleAway.disabled=true;const away=toggleAway.dataset.away==='1';await api(`/api/campaigns/${state.campaignId}/availability`,{method:'POST',body:JSON.stringify({away})});toast(away?'Ausência marcada. Seu personagem permanece na campanha.':'Você voltou a ficar disponível para os próximos turnos.');await loadGame();}catch(e){toast(e.message,true);toggleAway.disabled=false;}};

  const lobbyReady=app.querySelector('#lobby-ready');if(lobbyReady)lobbyReady.onclick=async()=>{try{lobbyReady.disabled=true;await api(`/api/campaigns/${state.campaignId}/lobby-ready`,{method:'POST',body:JSON.stringify({ready:lobbyReady.dataset.ready==='1'})});await loadGame();}catch(e){toast(e.message,true);lobbyReady.disabled=false;}};
  app.querySelectorAll('[data-co-master]').forEach(button=>button.onclick=async()=>{try{button.disabled=true;await api(`/api/campaigns/${state.campaignId}/co-master`,{method:'POST',body:JSON.stringify({targetUserId:button.dataset.coMaster,enabled:button.dataset.enable==='1'})});toast('Delegação de mestragem atualizada.');await loadGame();}catch(e){toast(e.message,true);button.disabled=false;}});
  app.querySelectorAll('[data-vote-option]').forEach(button=>button.onclick=async()=>{try{await api(`/api/campaigns/${state.campaignId}/vote/cast`,{method:'POST',body:JSON.stringify({optionId:button.dataset.voteOption})});await loadGame();}catch(e){toast(e.message,true);}});
  const closeVote=app.querySelector('#close-vote');if(closeVote)closeVote.onclick=async()=>{try{closeVote.disabled=true;await api(`/api/campaigns/${state.campaignId}/vote/close`,{method:'POST'});toast('Votação encerrada.');await loadGame();}catch(e){toast(e.message,true);closeVote.disabled=false;}};
  const voteForm=app.querySelector('#vote-form');if(voteForm)voteForm.onsubmit=async e=>{e.preventDefault();setBusy(voteForm,true);try{const data=Object.fromEntries(new FormData(voteForm));const options=[data.optionA,data.optionB,data.optionC].filter(Boolean);await api(`/api/campaigns/${state.campaignId}/vote`,{method:'POST',body:JSON.stringify({prompt:data.prompt,options})});toast('Votação aberta.');await loadGame();}catch(err){toast(err.message,true);setBusy(voteForm,false);}};

  app.querySelector('#guide-bot').onclick = () => { state.guideOpen = true; state.guideStep = 0; chooseTab('story'); };
  const guideClose = app.querySelector('#guide-close'); if (guideClose) guideClose.onclick = () => { state.guideOpen = false; renderGame(); };
  const guidePrev = app.querySelector('#guide-prev'); if (guidePrev) guidePrev.onclick = () => changeGuide(-1);
  const guideNext = app.querySelector('#guide-next'); if (guideNext) guideNext.onclick = () => changeGuide(1);
  const restartGuide = app.querySelector('#restart-guide'); if (restartGuide) restartGuide.onclick = () => { state.guideOpen = true; state.guideStep = 0; chooseTab('story'); };
  const start = app.querySelector('#start-campaign'); if (start) start.onclick = async () => { try { start.disabled = true; await api(`/api/campaigns/${state.campaignId}/start`, { method: 'POST' }); await loadGame(); } catch (error) { toast(error.message, true); start.disabled = false; } };
  const actionForm = app.querySelector('#action-form'); if (actionForm) actionForm.onsubmit = async (event) => {
    event.preventDefault(); const form=event.currentTarget; const body = Object.fromEntries(new FormData(form)); document.activeElement?.blur(); setBusy(form, true); toast('Enviando ação…');
    try { const result=await api(`/api/campaigns/${state.campaignId}/action`, { method: state.game.turn.myAction ? 'PUT' : 'POST', body: JSON.stringify(body) }); saveDraft('');saveSecretDraft('');state.secretOpen=false; toast(result.resolved?'Turno concluído.':result.shouldResolve?'Ações seladas. O mestre está processando…':'Ação recebida pelo servidor.'); state.history = null; await loadGame(); }
    catch (error) { toast(error.message, true); setBusy(event.currentTarget, false); }
  };
  const draftField=app.querySelector('[data-action-draft]'); if(draftField){let draftTimer;draftField.addEventListener('input',()=>{clearTimeout(draftTimer);draftTimer=setTimeout(()=>saveDraft(draftField.value),120);});}
  const secretToggle=app.querySelector('#secret-toggle');if(secretToggle)secretToggle.onclick=()=>{const current=app.querySelector('[data-secret-draft]')?.value||'';saveSecretDraft(current);state.secretOpen=!state.secretOpen;renderGame();};
  const secretField=app.querySelector('[data-secret-draft]');if(secretField){let secretTimer;secretField.addEventListener('input',()=>{clearTimeout(secretTimer);secretTimer=setTimeout(()=>saveSecretDraft(secretField.value),120);});}
  app.querySelectorAll('[data-inventory-type]').forEach(button=>button.onclick=()=>{state.inventoryType=button.dataset.inventoryType;renderGame();});
  const inventorySearch=app.querySelector('#inventory-search');if(inventorySearch)inventorySearch.addEventListener('input',()=>{state.inventoryQuery=inventorySearch.value;clearTimeout(inventorySearch._t);inventorySearch._t=setTimeout(()=>renderGame(),120);});
  const force = app.querySelector('#force-resolve'); if (force) force.onclick = async () => { if (!confirm('Fechar o turno preenchendo a ação dos ausentes automaticamente?')) return; try { force.disabled = true; await api(`/api/campaigns/${state.campaignId}/force-resolve`, { method: 'POST' }); await loadGame(); } catch (error) { toast(error.message, true); force.disabled = false; } };
  const characterForm = app.querySelector('#character-form'); if (characterForm) characterForm.onsubmit = async (event) => {
    event.preventDefault(); setBusy(event.currentTarget, true);
    try { const values=Object.fromEntries(new FormData(event.currentTarget)); const identity=Object.fromEntries(['name','race','description','appearance','origin','gender','hair','eyes','height'].map(k=>[k,values[k]]));await api(`/api/campaigns/${state.campaignId}/character`,{method:'PATCH',body:JSON.stringify({identity,classId:values.classId,presentation:{avatar:values.avatar,accent:values.accent,aura:values.aura}})});toast('Personagem salvo.');await loadGame(); }
    catch (error) { toast(error.message, true); setBusy(event.currentTarget, false); }
  };
  const operate=async(body)=>{try{await api(`/api/campaigns/${state.campaignId}/character-operation`,{method:'POST',body:JSON.stringify(body)});toast('Ficha atualizada.');await loadGame();}catch(e){toast(e.message,true);}};
  const allocator=app.querySelector('[data-allocator]');
  if(allocator){
    const total=Number(allocator.dataset.points||0);const form=allocator.querySelector('#attributes-form');
    const values=()=>Object.fromEntries([...form.querySelectorAll('input[type=hidden][name]')].map(input=>[input.name,Number(input.value||0)]));
    const sync=()=>{const current=values();const spent=Object.values(current).reduce((sum,value)=>sum+value,0);const remaining=Math.max(0,total-spent);const remainingEl=allocator.querySelector('[data-remaining]');if(remainingEl)remainingEl.textContent=String(remaining);const submit=allocator.querySelector('[data-allocate-submit]');if(submit){submit.disabled=spent<=0;submit.textContent=spent>0?`Aplicar ${spent} ponto${spent===1?'':'s'}`:(total?'Escolha onde investir':'Sem pontos livres');}for(const input of form.querySelectorAll('input[type=hidden][name]')){const key=input.name;const value=Number(input.value||0);const pending=allocator.querySelector(`[data-attr-pending="${key}"]`);if(pending)pending.textContent=value?`+${value}`:'+0';const dec=allocator.querySelector(`[data-attr-dec="${key}"]`);const inc=allocator.querySelector(`[data-attr-inc="${key}"]`);if(dec)dec.disabled=value<=0;if(inc)inc.disabled=remaining<=0;}};
    allocator.querySelectorAll('[data-attr-inc]').forEach(button=>button.onclick=()=>{const input=form.elements[button.dataset.attrInc];if(!input)return;const spent=Object.values(values()).reduce((sum,value)=>sum+value,0);if(spent>=total)return;input.value=String(Number(input.value||0)+1);sync();});
    allocator.querySelectorAll('[data-attr-dec]').forEach(button=>button.onclick=()=>{const input=form.elements[button.dataset.attrDec];if(!input||Number(input.value||0)<=0)return;input.value=String(Number(input.value||0)-1);sync();});
    sync();
  }
  const attrs=app.querySelector('#attributes-form');if(attrs)attrs.onsubmit=e=>{e.preventDefault();const allocation=Object.fromEntries([...new FormData(attrs)].map(([k,v])=>[k,Number(v)]));if(!Object.values(allocation).some(v=>v>0))return;operate({operation:'allocate',allocation});};
  app.querySelectorAll('[data-train]').forEach(b=>b.onclick=()=>operate({operation:'train',skillId:b.dataset.train}));
  app.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>operate({operation:'equip',itemId:b.dataset.equip}));
  app.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>operate({operation:'buy',marketId:b.dataset.buy,quantity:1}));
  app.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>operate({operation:'sell',itemId:b.dataset.sell,quantity:1}));
  app.querySelectorAll('[data-specialize]').forEach(b=>b.onclick=()=>{if(confirm('Confirmar esta especialização?'))operate({operation:'specialize',name:b.dataset.specialize});});

  app.querySelectorAll('[data-path-pick]').forEach(b=>b.onclick=()=>{if(confirm('Este caminho é permanente para o personagem. Confirmar?'))operate({operation:'path',pathId:b.dataset.pathPick});});
  app.querySelectorAll('[data-talent]').forEach(b=>b.onclick=()=>operate({operation:'talent',talentId:b.dataset.talent}));
  app.querySelectorAll('[data-downtime-train]').forEach(b=>b.onclick=()=>operate({operation:'downtime',kind:'train',attribute:b.dataset.downtimeTrain}));
  const downtimeRecover=app.querySelector('#downtime-recover');if(downtimeRecover)downtimeRecover.onclick=()=>operate({operation:'downtime',kind:'recover'});
  const downtimeStudy=app.querySelector('#downtime-study');if(downtimeStudy)downtimeStudy.onclick=()=>operate({operation:'downtime',kind:'study'});
  app.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>operate({operation:'craft',recipeId:b.dataset.craft}));

  const prepare=text=>{chooseTab('story');const field=app.querySelector('#action-form textarea');if(field){field.value=text;field.focus();}else toast('Aguarde um turno aberto.');};
  app.querySelectorAll('[data-use-skill]').forEach(b=>b.onclick=()=>prepare(`Uso ${b.dataset.useSkill} `));
  app.querySelectorAll('[data-travel]').forEach(b=>b.onclick=()=>prepare(`Viajo para ${b.dataset.travel}.`));
  app.querySelectorAll('[data-dialogue]').forEach(b=>b.onclick=()=>prepare(`Converso com ${b.dataset.dialogue}: `));
  const devCall=async body=>{try{await api(`/api/campaigns/${state.campaignId}/dev-operation`,{method:'POST',body:JSON.stringify(body)});toast('Cenário aplicado.');await loadGame();}catch(e){toast(e.message,true);}};
  const df=app.querySelector('#dev-set-failure');if(df)df.onclick=()=>devCall({operation:'failure',value:app.querySelector('#dev-failure').value});
  const dx=app.querySelector('#dev-xp');if(dx)dx.onclick=()=>devCall({operation:'xp'});
  const dr=app.querySelector('#dev-run');if(dr)dr.onclick=async()=>{const n=Math.min(10,Math.max(1,Number(app.querySelector('#dev-turns').value)));if(!confirm(`Executar até ${n} turnos usando a API configurada?`))return;dr.disabled=true;try{for(let i=0;i<n;i++){const result=await api(`/api/campaigns/${state.campaignId}/action`,{method:'POST',body:JSON.stringify({text:'Observo o ambiente e procuro pistas.'})});if(!result.resolved)break;}await loadGame();toast('Simulação encerrada.');}catch(e){toast(e.message,true);dr.disabled=false;}};
  const admin=app.querySelector('#admin-form');if(admin){const syncAdmin=()=>{const op=admin.elements.operation.value;const ai=op==='grant-ai-item',catalog=op==='grant-item',remove=op==='remove-item',hp=op==='hp',reopen=op==='reopen';const item=admin.querySelector('[data-admin-item]'),help=admin.querySelector('[data-admin-item-help]'),qty=admin.querySelector('[data-admin-quantity]'),hpField=admin.querySelector('[data-admin-hp]'),character=admin.querySelector('[data-admin-character]'),label=admin.querySelector('[data-admin-item-label]'),submit=admin.querySelector('[data-admin-submit]');if(item)item.hidden=hp||reopen;if(help)help.hidden=hp||reopen;if(qty)qty.hidden=!(ai||catalog);if(hpField)hpField.hidden=!hp;if(character)character.hidden=reopen;if(label)label.textContent=ai?'Descreva o item':catalog?'ID do catálogo':'ID do item no inventário';if(admin.elements.itemId)admin.elements.itemId.placeholder=ai?'Ex.: espada lendária de gelo, elegante e adequada ao nível atual':catalog?'potion, sword, robe, sigil':'Cole o ID do item que será removido';if(help)help.textContent=ai?'A IA cria nome final, descrição, raridade e bônus; o servidor limita os números para manter o equilíbrio.':catalog?'Use um item já existente no catálogo interno.':'O ID aparece nos dados do inventário.';if(submit)submit.textContent=ai?'Criar e conceder item':'Aplicar correção';};admin.elements.operation?.addEventListener('change',syncAdmin);syncAdmin();admin.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(admin));data.value=Number(data.value);data.quantity=Number(data.quantity||1);const ai=data.operation==='grant-ai-item';if(!ai&&!confirm('Aplicar correção administrativa e registrar no histórico?'))return;const button=admin.querySelector('[data-admin-submit]');if(button)button.disabled=true;try{if(ai)toast('A IA está criando e balanceando o item…');const result=await api(`/api/campaigns/${state.campaignId}/admin-operation`,{method:'POST',body:JSON.stringify(data)});await loadGame();toast(result.item?`${result.item.name} foi enviado para a mochila.`:'Correção registrada.');}catch(error){toast(error.message,true);if(button)button.disabled=false;}};}
  const settingsForm = app.querySelector('#settings-form');
  const aiValues=()=>{const data=new FormData(settingsForm);return {provider:String(data.get('aiProvider')||''),apiKey:String(data.get('aiApiKey')||'').trim(),model:String(data.get('aiModel')||'').trim(),baseUrl:String(data.get('aiBaseUrl')||'').trim()};};
  const aiCampaignPayload=(values,includeKey=false)=>({aiProvider:values.provider,aiModel:values.model,aiBaseUrl:values.baseUrl,...(includeKey&&values.apiKey?{aiApiKey:values.apiKey}:{})});
  const refreshKeyManager=()=>{if(!settingsForm)return;const provider=settingsForm.elements.aiProvider?.value;const info=credentialUi(state.game?.aiCredentialMeta,provider);const status=app.querySelector('[data-key-status]');const badge=app.querySelector('[data-key-badge]');const del=app.querySelector('#delete-ai-key');const savedTest=app.querySelector('#test-ai');if(status)status.textContent=info.text;if(badge)badge.textContent=info.badge;if(del)del.disabled=!info.removable||settingsForm.elements.aiProvider?.disabled;if(savedTest)savedTest.disabled=!state.game?.aiCredentialMeta?.[provider]?.configured;};
  if (settingsForm) settingsForm.onsubmit = async (event) => {
    event.preventDefault(); setBusy(event.currentTarget, true);
    try { const data = new FormData(event.currentTarget); const payload={ aiProvider: data.get('aiProvider'), aiFallbackProvider:data.get('aiFallbackProvider'), aiApiKey: data.get('aiApiKey'), aiModel: data.get('aiModel'), aiBaseUrl: data.get('aiBaseUrl'), tone: data.get('tone'), narrativeDepth:data.get('narrativeDepth'), worldEventFrequency:data.get('worldEventFrequency'), worldRules: data.get('worldRules'), allowActionEdit:data.has('allowActionEdit'), minPlayers:Number(data.get('minPlayers')||state.game.campaign.settings.minPlayers), allowLateJoin:data.has('allowLateJoin'), continueWithAbsentees:data.has('continueWithAbsentees'), ...(state.game.turn?.status==='WAITING_FOR_AI'?{}:{allowPvp:data.has('allowPvp'),experimentalDice:data.has('experimentalDice')}) }; if(data.has('visualTheme'))payload.visualTheme=data.get('visualTheme');if(data.has('campaignIcon'))payload.campaignIcon=data.get('campaignIcon');await api(`/api/campaigns/${state.campaignId}/settings`, { method: 'PATCH', body: JSON.stringify(payload) }); toast(data.get('aiApiKey')?'Nova chave e configurações salvas.':'Configurações salvas.'); await loadGame(); }
    catch (error) { toast(error.message, true); setBusy(event.currentTarget, false); }
  };
  bindProviderFields(settingsForm);
  settingsForm?.elements.aiProvider?.addEventListener('change',refreshKeyManager);
  refreshKeyManager();
  const saveAiKey=app.querySelector('#save-ai-key');if(saveAiKey)saveAiKey.onclick=async()=>{saveAiKey.disabled=true;try{const values=aiValues();if(values.apiKey.length<10)throw new Error('Cole uma nova chave antes de salvar.');await api(`/api/campaigns/${state.campaignId}/settings`,{method:'PATCH',body:JSON.stringify(aiCampaignPayload(values,true))});toast('Nova chave cifrada e salva. A anterior deste provedor foi substituída.');await loadGame();}catch(e){toast(e.message,true);saveAiKey.disabled=false;}};
  const testTyped=app.querySelector('#test-ai-key');if(testTyped)testTyped.onclick=async()=>{testTyped.disabled=true;try{const values=aiValues();if(values.apiKey.length<10)throw new Error('Cole uma nova chave para testá-la.');await api('/api/profile/ai/test',{method:'POST',body:JSON.stringify({provider:values.provider,apiKey:values.apiKey,model:values.model,baseUrl:values.baseUrl})});toast('Nova chave testada com sucesso. Ainda não foi salva.');}catch(e){toast(e.message,true);}finally{testTyped.disabled=false;}};
  const testSaved=app.querySelector('#test-ai');if(testSaved)testSaved.onclick=async()=>{testSaved.disabled=true;try{const values=aiValues();await api('/api/profile/ai/test',{method:'POST',body:JSON.stringify({provider:values.provider,model:values.model,baseUrl:values.baseUrl})});toast('Chave salva respondeu corretamente.');}catch(e){toast(e.message,true);}finally{testSaved.disabled=false;}};
  const deleteAiKey=app.querySelector('#delete-ai-key');if(deleteAiKey)deleteAiKey.onclick=async()=>{const values=aiValues();if(!confirm(`Excluir a chave salva de ${values.provider}? A campanha não será apagada.`))return;deleteAiKey.disabled=true;try{await api('/api/profile/ai',{method:'PATCH',body:JSON.stringify({provider:values.provider,remove:true})});toast('Chave excluída. A campanha e a memória foram preservadas.');await loadGame();}catch(e){toast(e.message,true);deleteAiKey.disabled=false;}};
  const retryAi = app.querySelector('#retry-ai'); if (retryAi) retryAi.onclick = async () => { try { retryAi.disabled = true; const result = await api(`/api/campaigns/${state.campaignId}/retry-ai`, { method: 'POST' }); if (result.awaitingAi) toast('A IA ainda não respondeu. O turno segue protegido.', true); await loadGame(); } catch (error) { toast(error.message, true); retryAi.disabled = false; } };
  const saveRetry=app.querySelector('#save-retry-ai');if(saveRetry)saveRetry.onclick=async()=>{saveRetry.disabled=true;try{const values=aiValues();const configured=Boolean(state.game?.aiCredentialMeta?.[values.provider]?.configured);if(!values.apiKey&& !configured)throw new Error('Cole uma nova chave antes de tentar novamente.');await api(`/api/campaigns/${state.campaignId}/settings`,{method:'PATCH',body:JSON.stringify(aiCampaignPayload(values,Boolean(values.apiKey)))});toast(values.apiKey?'Nova chave salva. Tentando o turno…':'Configuração salva. Tentando o turno…');const result=await api(`/api/campaigns/${state.campaignId}/retry-ai`,{method:'POST'});if(result.awaitingAi)toast('A IA ainda não respondeu. O turno segue protegido.',true);await loadGame();}catch(e){toast(e.message,true);saveRetry.disabled=false;}};
  app.querySelectorAll('[data-action-template]').forEach((button) => button.onclick = () => {
    const field = app.querySelector('#action-form textarea');
    if (!field) return;
    field.value = button.dataset.actionTemplate;
    saveDraft(field.value);
    field.focus();
  });
  const togglePerformance = app.querySelector('#toggle-performance'); if (togglePerformance) togglePerformance.onclick = () => {
    state.performanceLow = !state.performanceLow;
    localStorage.setItem('germinal_performance', state.performanceLow ? 'low' : 'normal');
    renderGame();
  };
  const toggleCompact = app.querySelector('#toggle-compact'); if(toggleCompact) toggleCompact.onclick=()=>{state.compactMode=!state.compactMode;localStorage.setItem('germinal_compact',state.compactMode?'1':'0');renderGame();};
  const installApp=app.querySelector('#install-app');if(installApp)installApp.onclick=async()=>{try{await state.installPrompt?.prompt();state.installPrompt=null;renderGame();}catch{}};
  const toggleMotion = app.querySelector('#toggle-motion'); if (toggleMotion) toggleMotion.onclick = () => {
    state.motionReduced = !state.motionReduced;
    localStorage.setItem('germinal_motion', state.motionReduced ? 'reduced' : 'full');
    renderGame();
  };
  const pause = app.querySelector('#pause'); if (pause) pause.onclick = async () => {try{await api(`/api/campaigns/${state.campaignId}/pause`, {method:'POST'});await loadGame();}catch(e){toast(e.message,true);}};
  const resume = app.querySelector('#resume'); if (resume) resume.onclick = async () => {try{await api(`/api/campaigns/${state.campaignId}/resume`, {method:'POST'});await loadGame();}catch(e){toast(e.message,true);}};
  const saveExit = app.querySelector('#save-exit'); if (saveExit) saveExit.onclick = saveAndExit;
  const saveCampaign = app.querySelector('#save-campaign'); if(saveCampaign)saveCampaign.onclick=async()=>{saveCampaign.disabled=true;try{await saveCampaignOnly();}catch(error){toast(error.message,true);saveCampaign.disabled=false;}};
  const exportBackup = app.querySelector('#export-backup'); if (exportBackup) exportBackup.onclick = () => { window.location.href = `/api/campaigns/${encodeURIComponent(state.campaignId)}/export`; toast('Backup preparado para download.'); };
  const exportRaw=app.querySelector('#export-raw');if(exportRaw)exportRaw.onclick=()=>{if(!confirm('Este arquivo contém todos os segredos da campanha. Baixar o backup bruto do proprietário?'))return;window.location.href=`/api/campaigns/${encodeURIComponent(state.campaignId)}/export/raw`;toast('Backup bruto preparado. Proteja este arquivo.');};
}

function disconnectSocket() {
  clearTimeout(state.reconnectTimer); clearInterval(state.pollTimer);
  if (state.socket) { state.socket.onclose = null; state.socket.close(); }
  state.socket = null;
}

function connectSocket() {
  disconnectSocket(); if (!state.campaignId) return;
  state.socketStatus='connecting';
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  state.socket = new WebSocket(`${protocol}//${location.host}/ws?campaignId=${encodeURIComponent(state.campaignId)}`);
  state.socket.onopen = () => { state.socketStatus='online'; state.reconnectAttempts=0; scheduleGameRefresh(0); };
  state.socket.onmessage = (event) => { try { const message=JSON.parse(event.data); if(message.type==='PRESENCE_CHANGED') return scheduleGameRefresh(60); } catch{} scheduleGameRefresh(160); };
  state.socket.onclose = () => { if (!state.campaignId) return; state.socketStatus='offline'; if (!isEditingField()) renderGame(); const delay=Math.min(15_000,1000*(2**Math.min(4,state.reconnectAttempts++))); state.reconnectTimer = setTimeout(connectSocket, delay); };
  state.socket.onerror = () => state.socket.close();
  state.pollTimer = setInterval(() => { if (state.socket?.readyState !== WebSocket.OPEN) scheduleGameRefresh(0); }, 20_000);
}

async function boot() {
  if(!(await checkClientMeta(false))) return;
  try {
    state.user = (await api('/api/auth/me')).user;
    if (state.campaignId) {
      try {
        setNavigation('lobby', '', 'replace');
        await openCampaign(state.campaignId, { historyMode: 'push' });
        return;
      } catch {}
    }
    await loadLobby({ historyMode: 'replace' });
  } catch { renderAuth(); }
}

if(typeof window.addEventListener==='function'){
  window.addEventListener('beforeinstallprompt',(event)=>{event.preventDefault();state.installPrompt=event;if(state.game)renderGame();});
  window.addEventListener('popstate', async (event) => {
    const nav = event.state;
    if (!nav?.eidryss) return;
    if (nav.view === 'lobby') {
      try { await loadLobby({ historyMode: 'none' }); } catch { renderAuth(); }
      return;
    }
    if (nav.view === 'game' && nav.campaignId) {
      try {
        const campaignChanged = state.campaignId !== nav.campaignId || !state.game;
        state.campaignId = nav.campaignId;
        localStorage.setItem('germinal_campaign', nav.campaignId);
        state.tab = nav.tab || 'story';
        if (campaignChanged) { await loadGame(); connectSocket(); }
        else if (state.tab === 'history' && !state.history) { const result = await api(`/api/campaigns/${state.campaignId}/history`); state.history = result.history; renderGame(); }
        else renderGame();
      } catch { await loadLobby({ historyMode: 'replace' }); }
    }
  });
}
boot();

if('serviceWorker' in navigator && window.isSecureContext)navigator.serviceWorker.register('/sw.js?v=750').catch(()=>{});
