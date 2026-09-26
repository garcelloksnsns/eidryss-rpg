import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createConfig } from '../src/core/config.js';

const root = new URL('..', import.meta.url).pathname;

test('bottom navigation lives outside the animated page-content container', async () => {
  const app = await fs.readFile(path.join(root, 'public/app.js'), 'utf8');
  assert.match(app, /\$\{tabContent\}<\/div><button class="guide-bot"/);
  assert.match(app, /<nav class="bottom-nav"/);
});

test('tab navigation participates in browser history so Android back returns to the previous tab', async () => {
  const app = await fs.readFile(path.join(root, 'public/app.js'), 'utf8');
  assert.match(app, /history\[method\]\(navigationState/);
  assert.match(app, /addEventListener\('popstate'/);
  assert.match(app, /setNavigation\('game', tab, historyMode\)/);
});

test('Termux launchers use a persistent data directory outside the release folder', async () => {
  const online = await fs.readFile(path.join(root, 'INICIAR-ONLINE-TERMUX.sh'), 'utf8');
  const local = await fs.readFile(path.join(root, 'INICIAR-TERMUX.sh'), 'utf8');
  const helper = await fs.readFile(path.join(root, 'scripts/termux-persistence.sh'), 'utf8');
  assert.match(online, /termux-persistence\.sh/);
  assert.match(local, /termux-persistence\.sh/);
  assert.match(helper, /\$HOME\/\.eidryss/);
  assert.match(helper, /VAULT_KEY_FILE/);
});

test('config honors EIDRYSS_DATA_DIR for database, vault and system status', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'eidryss-persist-'));
  const previous = process.env.EIDRYSS_DATA_DIR;
  process.env.EIDRYSS_DATA_DIR = tmp;
  try {
    const config = createConfig({ rootDir: root, port: 0 });
    assert.equal(config.dataDir, path.resolve(tmp));
    assert.equal(config.dataFile, path.join(path.resolve(tmp), 'eidryss.json'));
    assert.equal(config.vaultKeyFile, path.join(path.resolve(tmp), 'server.key'));
    assert.equal(config.systemStatusFile, path.join(path.resolve(tmp), 'system-status.json'));
  } finally {
    if (previous === undefined) delete process.env.EIDRYSS_DATA_DIR; else process.env.EIDRYSS_DATA_DIR = previous;
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
