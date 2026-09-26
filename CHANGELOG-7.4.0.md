# Eidryss 7.4.0 — Atlas Vivo

## Identificação

| Item | Valor |
|---|---:|
| Versão | 7.4.0 |
| Schema persistente | 13 |
| clientRevision | 740 |
| Cliente Android | preservado, sem alteração nativa |

## Arquitetura encontrada

O projeto mantém um servidor Node.js sem framework pesado, armazenamento JSON transacional em fila, autenticação e sessões próprias, motor mecânico autoritativo, integração multprovedor de IA e interface web mobile-first servida ao cliente Android WebView. Dados operacionais permanecem fora da versão, em `~/.eidryss` no Termux.

## Mudanças principais

- A localização do personagem passou a ser a referência autoritativa em diálogos, memória, investigações, eventos, descobertas, missões, consequências e ações privadas.
- O diretor agrupa personagens em `activeScenes` por local. Clima, encontros e tensão local atingem apenas cenas ocupadas; eventos realmente globais continuam globais.
- O Context Builder recupera somente a cena relevante, participantes, recursos importantes, NPCs presentes, missão relacionada, memórias pertinentes e poderes/itens citados.
- NPCs importantes receberam identidade persistente estruturada, localização atual/habitual, facção, conhecimentos, segredos, modo de falar e memórias privadas.
- Afeto, Confiança e Desconfiança continuam separados por NPC e personagem, com motivo resumido; cortesia isolada não gera progressão automática.
- Atlas, diário, descobertas, fatos, bestiário e segredos são filtrados pelo conhecimento do personagem.
- Conversa presencial exige co-localização. A interface mostra a última localização conhecida quando o NPC está distante.
- Ações secretas continuam em staging independente. Falha da narrativa privada não refaz a chamada pública; sem ação privada não existe chamada adicional.
- Exportação normal redige ações, narrativas e memórias privadas de terceiros. O backup bruto foi separado e exige proprietário autenticado e confirmação explícita.
- O mapa agora é canônico: rotas têm direção, distância, terreno, estrada, rio, ponte, perigo, tempo e requisitos. O motor valida a travessia antes da narrativa.
- Missões possuem origem, objetivos, progresso, local, NPC, risco, recompensa, estado e consequências; conclusão depende do motor.
- O Atlas ganhou terreno, rio, serra, trilhas, ícones, posição do jogador, neblina de guerra e indicação visual de bloqueios, mantendo SVG/HTML/CSS leve.
- O salvamento manual aguarda escritas pendentes, cria checkpoint rotativo e não chama IA.
- Menu móvel, ação secreta, modos leves e banner do Santuário foram preservados; o banner mantém conteúdo e decoração em camadas sem sobreposição em telas estreitas.

## Migração e compatibilidade

O schema 13 migra dados existentes incrementalmente, sem banco novo. Antes da primeira migração é criada uma cópia `.pre-v13`. A migração adiciona campos ausentes com valores seguros, enriquece mapas e NPCs antigos, estrutura missões e cria memória regional/pessoal. Contas, sessões, campanhas, personagens, turnos, relações, segredos e chaves continuam no armazenamento existente.

## Economia de tokens

O servidor não envia automaticamente inventários completos, todos os poderes, talentos, maestrias, cidades, NPCs ou bestiário. Referências presentes na ação — como o nome de uma técnica, item ou NPC — acionam recuperação sob demanda. Cenas locais são resolvidas mecanicamente em uma única passagem, sem uma chamada de IA por local. Resumos estruturados são mantidos pelo servidor; a extensão narrativa permanece adaptativa nos modos Balanceado, Cinematográfico e Épico.

## Arquivos de código alterados

- `src/game/world.js`, `engine.js`, `memory.js`, `narrative.js`
- `src/data/store.js`
- `src/services/game-service.js`, `src/server.js`
- `src/core/config.js`, `src/core/system-status.js`
- `public/app.js`, `style.css`, `index.html`, `manifest.json`, `sw.js`
- `package.json`
- testes de compatibilidade e `tests/v7.4-local-context.test.js`

## Verificações executadas

- `node --check` nos módulos alterados do servidor, motor, persistência e interface.
- 4 testes novos de localização, cenas, geografia, contexto seletivo, privacidade e checkpoint.
- 4 testes direcionados de caminhos privados, retry e interface 7.3.
- 31 testes direcionados de engine, memória/narrativa, persistência, falhas de IA simuladas, templates e cliente.
- 13 testes direcionados de mundo/sandbox; duas incompatibilidades foram encontradas e corrigidas, e o arquivo afetado passou com 9/9 na repetição mínima.
- A suíte completa foi executada uma única vez no encerramento: 102/103 passaram. A única falha revelou compatibilidade ausente no conhecimento legado do Atlas; ela foi corrigida e somente o teste afetado foi repetido, passando 1/1.

Nenhum teste chamou Groq, OpenRouter, Gemini ou OpenAI reais. A suíte completa existente contém uma simulação offline de 20 turnos, executada apenas nessa passagem final; não foram feitas simulações adicionais ou campanhas com API real.

## Bugs corrigidos

- NPC podia esquecer interação quando a localização global diferia da localização do ator.
- Eventos locais e retaliação podiam vazar para personagens em outras cidades.
- Contexto carregava dados distantes ou irrelevantes.
- Viagem podia contradizer rios, pontes e obstáculos do mapa.
- Exportação podia expor material privado em backups comuns.
- Relações podiam variar por falas triviais sem consequência concreta.
- Salvamento visual não garantia um checkpoint concluído.

## Limitações restantes

- O Atlas usa ilustração vetorial procedimental; ainda não há editor geográfico visual para o Host.
- Comunicação remota entre cidades depende de futuras mecânicas de carta, mensageiro ou artefato.
- O cliente Android não foi recompilado nesta etapa porque o shell nativo não mudou.
- APIs reais, dispositivos Android físicos e campanhas extensas não foram usados nos testes para preservar cota e evitar efeitos externos.

## Próximos passos sugeridos

Editor de geografia para o Host, canais remotos autoritativos, ferramentas de inspeção de cenas e métricas locais de orçamento de contexto por provedor.
