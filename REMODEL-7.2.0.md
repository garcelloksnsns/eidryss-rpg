# Eidryss 7.2 — Relatório da remodelação Horizonte Vivo

## Objetivo

A 7.2 foi planejada como uma remodelação de experiência, e não como troca de identidade ou aumento artificial de classes. O núcleo do Eidryss continua sendo: servidor autoritativo no Termux, quatro jogadores, Mestre IA, mundo persistente, progressão por atributos + maestria, classes/caminhos, entrada e saída no meio da sessão e cliente Android leve.

O foco foi fazer o jogo parecer menos uma coleção de formulários e mais um RPG vivo: o mapa deve comunicar lugar e risco; missões devem mostrar avanço; eventos devem ser possíveis sem serem garantidos; cada jogador deve conseguir ajustar a própria experiência visual; e a narrativa precisa ter espaço suficiente para contar uma história sem transformar cada turno em um capítulo enorme.

## Referências estudadas

### Blades in the Dark

Os Progress Clocks foram usados como referência para consequências e projetos que avançam aos poucos. A documentação oficial também descreve clocks de facção e ações de NPCs/facções durante downtime, reforçando a ideia de que o cenário não precisa esperar os personagens para mudar.

Referências:
- https://bladesinthedark.com/progress-clocks
- https://bladesinthedark.com/downtime-activities-play
- https://bladesinthedark.com/downtime

Aplicação no Eidryss: relógios permanecem independentes das missões; a Central do Mundo passou a exibi-los como uma camada separada da situação atual.

### Wildermyth

O sistema de eventos de Wildermyth seleciona histórias de acordo com o contexto e critérios dos personagens/situação, em vez de escolher qualquer evento de uma lista global. A documentação também diferencia emboscadas, histórias de intervalo, ganchos e eventos de relação.

Referências:
- https://wildermyth.com/wiki/Event
- https://wildermyth.com/wiki/Event_Types
- https://wildermyth.com/wiki/Relationship

Aplicação no Eidryss: o diretor diferencia exploração, viagem e combate. Em uma luta pode surgir reforço ou mudança de terreno; em viagem podem surgir rastros, viajantes, clima, desvios e ameaças; ganchos do mundo podem criar missões persistentes.

### Pathfinder 2e — Influence

O subsistema de Influence é uma referência de como uma interação social importante pode usar progresso e múltiplas contribuições em vez de depender sempre de uma única rolagem binária.

Referência:
- https://2e.aonprd.com/Rules.aspx?ID=3040&NoRedirect=1

A 7.2 não implementa ainda um sistema completo de Influence por NPC, mas o diário e a arquitetura de objetivos agora comportam progressos multi-etapa; isso deixa uma base adequada para relações e negociações mais profundas em uma próxima etapa.

### Hexcrawls e campanhas sandbox

Discussões de mesas sandbox/hexcrawl reforçam o valor de rotas, pontos de interesse, facções com objetivos próprios e encontros de viagem que não sejam apenas combate. Também mostram que encontro aleatório funciona melhor como fonte de decisão e estado do mundo, não como punição automática a cada deslocamento.

Aplicação no Eidryss: Atlas Vivo 2.0 mostra rotas e fronteira, viagem pode gerar eventos contextuais e o radar explica o que é possível sem revelar ou garantir o sorteio.

### Chrome/WebView no Android

Chrome no Android acelera Canvas e transformações/transições CSS por GPU e oferece `requestAnimationFrame`. A remodelação prefere animações por `transform` e `opacity`, reduz filtros em modos leves e usa contenção/renderização preguiçosa em listas longas.

Referência:
- https://developer.chrome.com/docs/android/overview

## Remodelação visual

A tela Aventura ganhou composição por cena: local, clima, horário, ameaça, turno, missão acompanhada e pressão de eventos ficam visíveis sem ocupar a narrativa. O texto da história usa largura máxima de leitura para não virar uma linha gigantesca em telas largas e mantém parágrafos separados.

O Atlas ganhou camadas vetoriais de terreno, rotas curvas, zonas de relevo, água, trilha, bússola e nós com estados visuais diferentes. Nada disso exige imagens grandes ou assets pesados, portanto o servidor continua pequeno e o WebView continua rápido.

O Diário ganhou cartões próprios para objetivo, tipo, risco, progresso e recompensas. Uma missão pode ser fixada pelo jogador; essa escolha é local e não muda o objetivo dos outros membros.

## Novo sistema de desempenho pessoal

As opções de interface deixaram de ser simples toggles globais. Cada conta agora possui preferências persistentes:

- Automático: detecta aparelho modesto e escolhe uma configuração apropriada.
- Cinemático: efeitos completos e microanimações.
- Equilibrado: qualidade visual alta com custo moderado.
- Leve: remove blur e reduz sombras/movimento pesado.
- Ultra leve: prioriza FPS e bateria, retirando efeitos decorativos e animações desnecessárias.

Também há tamanho de texto, densidade, animações, detalhe do mapa e efeitos ambientais. Isso permite que um colega com aparelho fraco use Ultra leve enquanto outro usa Cinemático na mesma campanha.

## Eventos aleatórios sem “puxar saco”

A chance de evento continua sendo resolvida pelo servidor e tem teto de 90%. Mesmo no modo Caótico e com tensão alta, não existe regra do tipo “o jogador disse que aparece um dragão, então aparece”.

O contexto agora pesa no tipo do evento. Uma batalha pode produzir reforço inesperado, alteração de terreno ou atenção externa. Uma viagem pode produzir clima, pista, viajante, ruína ou criatura. Uma região perigosa deixa claro que descanso pode ser interrompido. O cliente mostra essas categorias como possibilidades, nunca como previsão do resultado.

## Missões mais estruturadas

As missões antigas são migradas para o novo formato. A missão principal inicial passa a possuir objetivo explícito de viagem. Novos ganchos de história podem virar missões de rumor. Objetivos têm contadores e podem reagir a eventos do motor.

A conclusão de missão gera evento de conclusão e pode conceder XP e Coroas pelo motor, não pela narrativa da IA. Isso mantém a mesma regra de autoridade do resto do projeto: o servidor altera estado; a IA descreve.

## Narrativa

Não foi reduzida para textos mínimos. Os perfis permanecem:

- Balanceada: aproximadamente 300–520 palavras.
- Cinematográfica: aproximadamente 520–900 palavras.
- Épica: aproximadamente 850–1400 palavras.

A interface agora apresenta esses intervalos, deixando claro o custo/volume antes da escolha. O objetivo é permitir cenas reais, diálogo e consequência sem deixar todo turno excessivamente longo.

## Compatibilidade

A 7.2 usa schema 11 e client revision 720. A migração preserva dados antigos e adiciona preferências pessoais. O banco continua fora do repositório em `~/.eidryss/`, então atualizar código não reseta conta, turnos ou campanha.

Como o cliente Android continua sendo o shell e a interface vem do servidor, nenhuma alteração desta remodelação exige reinstalar o APK. O aplicativo detecta a revisão 720, limpa cache antigo e carrega a interface nova.

## Validação executada

A suíte final passou 101/101 testes. Também foi executada uma simulação de 3 turnos com 4 jogadores, cobrindo exploração, combate, coleta, descanso e conversa, sem perda de persistência. Nenhum banco, chave de IA ou `server.key` faz parte do pacote final.
