# Eidryss 7.5.0 — Realidade Compartilhada

| Item | Valor |
|---|---:|
| Versão | 7.5.0 |
| Schema | 14 |
| clientRevision | 750 |
| Android nativo | inalterado |

## Uma chamada, várias narrativas

O servidor resolve primeiro todas as ações, inimigos, deslocamentos, danos, eventos, missões e consequências. Cada fato recebe um `eventId` imutável. Em seguida, o servidor calcula as Active Scenes e entrega numa única requisição um pacote com todas as cenas, fatos visíveis e fragmentos privados necessários.

A resposta exige uma narrativa por `sceneId`. IDs de cena, evento e destinatário inexistentes invalidam a resposta inteira; o turno permanece em staging para retry. Jogadores juntos compartilham a mesma cena. Jogadores separados recebem textos diferentes, mas todos fazem referência aos mesmos eventos canônicos quando observam o mesmo acontecimento.

Ações secretas podem voltar em `private_fragments` nessa mesma resposta. Se o provedor não suportar o formato novo ou omitir o fragmento, o staging privado 7.4 continua disponível como fallback sem refazer a narrativa pública.

## Visibilidade

- `PERSONAL`: autor, alvo ou destinatário privado.
- `LOCAL`: mesma zona física ou sala.
- `NEARBY`: distância espacial configurada, inclusive trechos de rota.
- `REGIONAL`: personagens na mesma região canônica.
- `GLOBAL`: o mesmo `eventId` é projetado em todas as cenas válidas.

O cliente recebe somente eventos cujo `observerCharacterIds` contém seu personagem. Histórico, estado, exportação normal e última narrativa usam essa mesma filtragem.

## Entidades únicas

NPCs e criaturas agora mantêm `locationId`, zona, estado espacial, cena atual e `lastAction`. A iniciativa inimiga continua sendo calculada uma vez. Vários observadores recebem projeções do mesmo movimento ou ataque; a IA não pode criar uma segunda ação da entidade.

## Movimento direcional

O motor reconhece norte, sul, leste, oeste, diagonais, estrada, trilha, rio acima/abaixo, ponte, floresta, montanha e continuação em frente. A rota é escolhida a partir da geografia do Atlas, nunca inventada pela IA.

Distância por turno considera velocidade, terreno, clima e montaria. Viagens incompletas persistem `routeId`, origem, destino e `progressKm`. Pontes destruídas permitem alcançar o obstáculo, mas bloqueiam a travessia sem um meio válido. Dois deslocamentos opostos na mesma rota podem convergir numa cena compartilhada.

## Migração

O schema 14 adiciona campos espaciais de forma incremental. Campanhas anteriores ganham zona central padrão, estado de viagem nulo e metadados de cena vazios. Antes da migração, o banco recebe uma cópia `.pre-v14`. `~/.eidryss`, contas, chaves, turnos, relações e segredos permanecem preservados.

## Arquivos principais

- novo `src/game/perception.js`;
- `src/game/world.js`, `engine.js`, `narrative.js`;
- `src/services/game-service.js`, `src/data/store.js`;
- `public/app.js`, `style.css`, cache/PWA e metadados;
- `tests/v7.5-canonical-reality.test.js`.

## Testes durante o desenvolvimento

- verificações `node --check` nos módulos alterados;
- 9 testes novos cobrindo entidade única, cenas, evento global, proximidade, segredo, validação de IDs, direção, ponte, convergência e encontro único de rota;
- 15/15 testes direcionados das versões 7.3–7.5;
- 48/48 testes mecânicos e de compatibilidade;
- 21/22 testes direcionados de memória/persistência/interface na primeira passagem; a única falha textual foi corrigida e repetida isoladamente com 1/1.
- suíte completa executada uma única vez no final: **112/112 passaram**.

Nenhuma API real foi chamada. Uma simulação offline de 20 turnos já existente acabou incluída no grupo mecânico direcionado; ela foi executada uma vez e não foi repetida.

## Limitações

- a posição em rota usa distância linear por trecho, não coordenadas GPS ou física contínua;
- o Atlas ainda não possui editor visual de rotas para o Host;
- provedores que retornem o formato narrativo antigo usam compatibilidade e, em ações secretas, o fallback privado pode consumir uma chamada adicional;
- Android físico e APIs reais não foram testados.
