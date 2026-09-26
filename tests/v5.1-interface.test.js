import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLASSES } from '../src/game/catalog.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'public/sw.js'),'utf8');

test('6.0 mantém catálogo de classes e expõe caminhos avançados',()=>{
  assert.equal(CLASSES.length,24);
  assert.match(app,/function classesTab\(game\)/);
  assert.match(app,/24 classes · 72 caminhos/);
  assert.match(app,/\['progression','⬡','Evolução'\]/);
  assert.match(app,/data-class-pick/);
  assert.match(css,/\.class-grid/);
});

test('7.2 mostra sala multiplayer com mestragem distribuída',()=>{
  assert.match(app,/Multiplayer 7\.2/);
  assert.match(app,/Mestre \+ co-mestres/);
  assert.match(app,/Entrada tardia/);
  assert.match(app,/Ausência segura/);
  assert.match(app,/Votação nativa/);
});

test('7.2 invalida cache antigo da interface',()=>{
  assert.match(html,/style\.css\?v=720/);
  assert.match(html,/app\.js\?v=720/);
  assert.match(app,/sw\.js\?v=720/);
  assert.match(sw,/eidryss-static-v720/);
});
