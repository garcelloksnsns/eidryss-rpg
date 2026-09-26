# Pesquisa de design — Germinal RPG 5.0

## Objetivo

A pesquisa foi orientada por um problema específico: construir um RPG sandbox multiplayer para celular em que a IA tenha liberdade narrativa, mas **não tenha liberdade para trapacear a favor do jogador, apagar continuidade ou inventar mudanças mecânicas sem validação**.

Não foi usado apenas D&D. Foram comparados RPGs de mesa, estruturas sandbox, sistemas solo/oráculo, videogames/procedurais, VTTs mobile e relatos de pessoas construindo RPGs com LLM.

---

## 1. West Marches — roster flexível e mundo que não espera todo mundo

Fonte principal: Ben Robbins, *Grand Experiments: West Marches*  
https://arsludi.lamemage.com/index.php/78/grand-experiments-west-marches/

O experimento original foi construído sem horário fixo, sem grupo fixo e sem trama fixa. Os próprios jogadores decidiam quando jogar, com quem e para onde ir. Um objetivo explícito era fazer a campanha continuar mesmo quando alguém não pudesse comparecer.

### Aplicação no Germinal

- sala de quatro pessoas não precisa exigir quatro presentes;
- jogador ausente não perde personagem;
- entrada tardia não deve quebrar a continuidade;
- o mundo e o histórico pertencem à campanha, não a uma composição fixa do grupo;
- sessões podem continuar com quem estiver disponível.

Isso levou diretamente ao estado `awayUserIds`, ao mínimo ativo separado da capacidade da sala e ao Mestre transferível.

---

## 2. Blades in the Dark — relógios, facções e downtime

Fontes oficiais:  
https://bladesinthedark.com/progress-clocks  
https://bladesinthedark.com/downtime  
https://bladesinthedark.com/downtime-activities-play

Blades usa relógios de progresso para projetos longos e objetivos de facções. Durante downtime, NPCs e facções podem avançar projetos próprios. O mundo, portanto, não existe apenas como reação imediata à última frase do jogador.

### Aplicação no Germinal

- ameaças e facções ganham progresso persistente;
- o mundo pode mudar sem a participação direta dos jogadores;
- objetivos de longo prazo podem ser modelados por segmentos;
- a IA recebe o resultado desses relógios, mas não decide sozinha quantos segmentos avançaram.

A 5.0 implementa relógios de mundo autoritativos e eventos de avanço/conclusão.

---

## 3. Pathfinder 2e — modos diferentes para combate, exploração e downtime

Fontes oficiais (Archives of Nethys):  
https://2e.aonprd.com/Rules.aspx?ID=2440  
https://2e.aonprd.com/Rules.aspx?ID=3103

Pathfinder separa o jogo em modos com granularidades diferentes. Exploração não precisa virar combate em rodadas; o jogador declara uma intenção geral e o sistema escolhe a atividade adequada. Hexploration ainda adiciona recursos, descoberta de locais e chance de encontros aleatórios por terreno.

### Aplicação no Germinal

- não transformar toda interação em combate por turno rígido;
- ações livres em linguagem natural podem ser classificadas pelo servidor;
- investigação, conversa, coleta, viagem e descanso têm procedimentos próprios;
- exploração pode gerar encontros, recursos e descobertas probabilísticos.

O Germinal mantém turnos de sincronização multiplayer, mas a intenção do jogador é resolvida por categoria mecânica em vez de obrigá-lo a apertar apenas botões de combate.

---

## 4. Mythic Game Master Emulator — incerteza contextual e eventos inesperados

Referência: *Mythic Game Master Emulator 2e* e resumos/revisões do sistema.  
Exemplo de discussão da estrutura: https://www.rpg.net/reviews/archive/13/13308.phtml

Mythic trabalha com perguntas de destino, probabilidades e eventos aleatórios que entram em cena sem simplesmente obedecer à expectativa do jogador. O contexto da aventura é usado para interpretar o resultado, e não para substituir a rolagem.

### Aplicação no Germinal

Regra central adotada:

> **A IA interpreta o resultado. Ela não escolhe o resultado depois de ler o que seria mais agradável ao jogador.**

A 5.0 aplica checagens de servidor a ações criativas, sociais e investigativas. Isso impede “eu procuro uma espada lendária” -> “você encontra uma espada lendária” apenas porque a frase foi escrita.

---

## 5. Dungeon World — Frentes / perigos que avançam

Referência geral do SRD: https://www.dungeonworldsrd.com/gamemastering/fronts/

As Frentes organizam perigos, objetivos e acontecimentos iminentes. Elas ajudam a criar uma campanha em que antagonistas têm direção própria e consequências aparecem se nada for feito.

### Aplicação no Germinal

Os relógios do mundo são uma versão computável dessa ideia: ameaças têm progresso, podem se concluir e entram na memória como acontecimentos do mundo.

---

## 6. Ironsworn — resultados graduais

Referência: https://www.ironswornrpg.com/

Ironsworn populariza uma estrutura em que o resultado não é apenas “sim/não”: há sucesso forte, sucesso com custo e falha. Esse tipo de resolução é especialmente adequado para narrativa emergente porque mantém movimento mesmo quando a ação não sai perfeitamente.

### Aplicação no Germinal

A 5.0 usa quatro graus:

- sucesso crítico;
- sucesso;
- sucesso parcial;
- falha.

Sucesso parcial gera avanço + consequência. Isso é melhor para sandbox do que aceitar tudo ou bloquear tudo.

---

## 7. Fate — consequências e escolhas em vez de simples punição

Referência: https://fate-srd.com/

Fate mostra como complicações podem alimentar a história em vez de funcionar apenas como “você falhou, nada acontece”.

### Aplicação no Germinal

O evento `COMPLICATION` existe para que falhas e sucessos parciais tenham consequência narrativa estruturada. A IA pode dramatizar essa consequência, mas não removê-la.

---

## 8. Mausritter / OSR — inventário como estado concreto

Referência: https://mausritter.com/

Sistemas OSR e jogos como Mausritter tornam recursos, capacidade e equipamentos parte real da tomada de decisão. Isso contrasta com RPGs puramente conversacionais nos quais o modelo pode “lembrar” ou “esquecer” itens conforme a narrativa.

### Aplicação no Germinal

Inventário, equipamento, quantidade, consumo, coleta e itens gerados são persistidos pelo servidor. A IA não recebe autoridade para criar ou apagar inventário por prosa.

---

## 9. Wildermyth e narrativa procedural — eventos precisam respeitar estado

Referência: https://wildermyth.com/

Wildermyth é uma referência útil para narrativas procedurais em que personagens acumulam relações, transformações e história ao longo da campanha. O valor não está em gerar texto infinito, mas em reutilizar estados e relações anteriores para que eventos futuros tenham peso.

### Aplicação no Germinal

- memória dividida em cânone, fatos, capítulos, turnos recentes e memória privada de NPCs;
- relações persistentes;
- fatos com origem e status de verdade;
- contexto enviado à IA é selecionado, não o transcript inteiro.

---

## 10. RimWorld / storytellers — diretor de eventos não deve ser roteiro fixo

Referência: https://rimworldgame.com/

RimWorld é útil como inspiração de “storyteller”: eventos são escolhidos a partir do estado do mundo e tensão, não de uma história fixa que precisa acontecer numa ordem predeterminada.

### Aplicação no Germinal

O diretor do mundo usa tensão, tempo desde evento, perigo e frequência configurada para calcular chance. A 5.0 remove a garantia de evento após N turnos: mesmo um mundo tenso continua probabilístico.

---

## 11. Relatos de campanhas emergentes no Reddit

Discussões de GMs sobre narrativa emergente ressaltam uma tensão recorrente: tabelas aleatórias são boas para surpresa, mas podem virar ruído se tudo for independente; por outro lado, conectar tudo artificialmente também quebra a verossimilhança.

Exemplos pesquisados:

- https://www.reddit.com/r/rpg/comments/1b7zzbb — experiência com campanha emergente sem “final predeterminado”.
- https://www.reddit.com/r/DMAcademy/comments/1u7010p/ — discussão sobre combinar conteúdo aleatório com coerência contextual.
- https://www.reddit.com/r/RPGdesign/comments/15ne0sf — eventos dirigidos pelo estado de facções em vez de calendário roteirizado.

### Aplicação no Germinal

Evento aleatório não é sinônimo de “qualquer coisa acontece”. O evento precisa nascer de tabelas/estado, ser persistido e depois interpretado no contexto existente.

---

## 12. Relatos de RPGs com LLM — separar narrativa de estado é a decisão mais importante

Foram encontrados vários relatos independentes chegando à mesma arquitetura.

### “LLM não controla o game state”

https://www.reddit.com/r/aigamedev/comments/1vpixco/i_built_an_ai_rpg_where_the_llm_isnt_allowed_to/

O autor descreve exatamente a regra que o Germinal precisa: o modelo pode descrever a realidade, mas não tornar algo verdadeiro apenas porque o escreveu.

### “Persistent LLM dungeon master”

https://www.reddit.com/r/AI_Coders/comments/1v1758d/i_created_a_persistent_llm_dungeon_master_for/

O relato descreve problemas de inventário esquecido, contradições e eventos narrados sem serem persistidos. A solução foi separar narração de estado, guardar fatos autoritativos e selar resultado antes de pedir ao modelo para narrar.

### Mundo persistente com IA

https://www.reddit.com/r/LocalLLaMA/comments/1v6ol1n/looking_for_advice_building_a_persistent_aidriven/

A discussão converge para a mesma ideia: tudo que precisa ser determinístico deve estar em um motor tradicional; a LLM é melhor usada em diálogo, interpretação e narrativa.

### Aplicação no Germinal

Arquitetura-alvo:

```text
entrada natural do jogador
        ↓
classificador / regras
        ↓
checagem + estado + RNG do servidor
        ↓
resultado mecânico SELADO
        ↓
memória / mundo / eventos
        ↓
LLM recebe somente o que pode narrar
        ↓
validação da resposta
        ↓
texto apresentado aos jogadores
```

Isso é a base da 5.0.

---

## 13. Mobile VTT / interface — não tentar colocar um desktop inteiro na tela

Referências pesquisadas incluem Foundry e projetos de interface mobile. A principal lição prática é que celular precisa de controles tocáveis, ficha compacta, navegação inferior, feedback rápido e degradação de efeitos pesados.

### Aplicação no Germinal

- navegação por abas;
- cards compactos;
- `touch-action` correto;
- proteção contra rerender durante digitação no Android;
- modo leve;
- animações desativáveis;
- PWA standalone;
- presença, mestre e estado de turno visíveis sem abrir painéis técnicos.

---

# Princípios finais usados no Germinal

## A. Servidor é a verdade

HP, mana, stamina, inventário, equipamentos, XP, cooldowns, posição, relações, relógios, dados, eventos e fatos canônicos não podem depender apenas do texto da IA.

## B. IA é Mestre narrativo, não banco de dados

Ela descreve, interpreta, dá voz a NPCs e conecta os resultados. Não decide silenciosamente que a rolagem foi outra.

## C. Mundo tem vontade própria

Facções, perigos, clima, recursos e relógios podem avançar sem esperar o jogador pedir.

## D. O jogador pode tentar qualquer coisa, mas não exigir o resultado

Linguagem natural continua livre; sucesso não é livre.

## E. Ausência não destrói campanha

Uma campanha de amigos precisa tolerar vida real. Entrada tardia, ausência temporária e transferência de Mestre são recursos centrais, não remendos.

## F. Memória precisa diferenciar conhecimento de verdade

“NPC disse X” não significa “X é verdadeiro”. Rumor, alegação, hipótese e fato precisam ser diferentes.

## G. Retry de IA nunca rerrola o mundo

Se a API falhar, o estado mecânico fica selado. Uma nova chave, outro modelo ou fallback apenas narra o mesmo resultado.

---

# Próximas expansões mais valiosas

Estas ideias foram pesquisadas, mas não foram fingidas como prontas na 5.0:

1. **Economia autoritativa** — moedas, preços regionais, oferta/demanda, comerciantes e inflação limitada.
2. **Crafting por receitas** — materiais reais do inventário, testes, qualidade e ferramentas.
3. **Facções completas** — reputação por jogador/grupo, relações entre facções e relógios próprios.
4. **Missões dinâmicas estruturadas** — objetivos, estados, falha, prazo e recompensa persistentes.
5. **Downtime assíncrono** — treinamento, crafting, relações e projetos longos entre sessões.
6. **NPC agenda/objetivos** — ações de NPCs em intervalos controlados, sem simular o planeta inteiro a cada turno.
7. **Atlas procedural por regiões** — nós, rotas, biomas, perigo e tabelas próprias.
8. **Cliente Android** — somente depois de estabilizar contratos HTTP/WebSocket; a PWA já serve como protótipo funcional do cliente.
