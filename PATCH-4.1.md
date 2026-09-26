# Germinal RPG 4.1.0 — Mundo Vivo

Atualização incremental sobre a 4.0. Nenhum framework, banco ou formato de autenticação foi substituído.

## Narrativa

- `cinematic` é o padrão: mira aproximadamente 520–900 palavras, 5–8 parágrafos e até 6144 tokens de saída no Gemini.
- `balanced`: 300–520 palavras e até 4096 tokens.
- `epic`: 850–1400 palavras e até 8192 tokens.
- Teste de conexão (`turno 0`) usa orçamento curto para não gastar cota produzindo uma cena desnecessária.
- O contrato da IA exige causa/consequência, uso de todos os eventos autoritativos, diálogos coerentes e ganchos naturais.
- A narrativa aceita até 30 mil caracteres após sanitização.

## Diretor de Mundo

`world.director` mantém tensão, intervalo entre eventos, tipos recentes e fios de história. O sorteio acontece dentro do cálculo `staged`, portanto retries não geram acontecimentos diferentes.

Eventos possíveis nesta etapa:

- `ENCOUNTER_STARTED`: inimigo persistente e balanceado pelo nível médio do grupo.
- `NPC_ARRIVED`: viajante persistente com papel, personalidade e objetivo.
- `WORLD_EVENT`: fenômeno/pista ambiental.
- `STORY_THREAD_STARTED`: fio narrativo persistente para alimentar arcos futuros.
- `ENEMY_ACTED`: iniciativa de inimigo já presente; dano continua calculado pelo motor.

Inimigos criados num turno ganham `spawnTurn` e não atacam imediatamente. Se permanecerem vivos, podem agir nos turnos seguintes.

## Interface

- Controle de profundidade narrativa e frequência de eventos na criação e em Ajustes.
- Cartão do Mundo Vivo mostra tensão, ameaças na cena, NPCs, fios narrativos e acontecimentos recentes.
- Acontecimentos importantes do último turno aparecem como cartões compactos de consequência.

## Persistência

Schema 7, com migração aditiva. Antes da primeira migração, o banco existente recebe cópia `.pre-v7`. Campanhas antigas recebem `narrativeDepth=cinematic`, `worldEventFrequency=normal` e estado inicial do Diretor de Mundo.

## Testes

A suíte inclui os testes anteriores e novos cenários de Mundo Vivo, orçamento narrativo e segurança de encontros. Nenhuma API real é usada por `npm test`.
