import path from 'node:path';
import { SystemStatus } from '../src/core/system-status.js';

const root = process.cwd();
const status = await new SystemStatus(path.join(root, 'data', 'system-status.json')).init();
const command = String(process.argv[2] || 'status').toLowerCase();
const message = process.argv.slice(3).join(' ').trim();

if (['on', 'ativar', '1'].includes(command)) {
  const next = await status.write({ maintenance: true, ...(message ? { message } : {}) });
  console.log(`MANUTENÇÃO ATIVA\n${next.message}`);
} else if (['off', 'desativar', '0'].includes(command)) {
  await status.write({ maintenance: false, ...(message ? { message } : {}) });
  console.log('MANUTENÇÃO ENCERRADA');
} else if (['bump', 'revision'].includes(command)) {
  const current = await status.read();
  const next = await status.write({ clientRevision: current.clientRevision + 1 });
  console.log(`CLIENT REVISION ${next.clientRevision}`);
} else {
  const current = await status.read();
  console.log(JSON.stringify(current, null, 2));
}
