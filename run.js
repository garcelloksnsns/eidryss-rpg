import { createApplication } from './src/server.js';
import { networkAddresses } from './src/core/utils.js';

const app = await createApplication();
const address = await app.start();
const port = typeof address === 'object' ? address.port : app.config.port;

console.log('\n=========================================');
console.log('         EIDRYSS RPG SERVER');
console.log('=========================================');
console.log(`Local: http://127.0.0.1:${port}`);
const addresses = networkAddresses(port);
for (const url of addresses) console.log(`Rede:  ${url}`);
if (!addresses.length) console.log('Rede:  IP não detectado; consulte com: ip route');
console.log('Online: use INICIAR-ONLINE-TERMUX.sh para criar um link HTTPS temporário.');
console.log('Mantenha este terminal aberto. Ctrl+C encerra.\n');

async function shutdown() {
  console.log('\nEncerrando Eidryss...');
  await app.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
