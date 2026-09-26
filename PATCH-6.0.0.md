# Germinal RPG 6.0.0 — Reforja

A Reforja 6.0 é uma remasterização estrutural do Germinal. O objetivo foi transformar sistemas que antes estavam dispersos ou pouco visíveis em mecânicas persistentes, autoritativas e acessíveis diretamente pela interface mobile.

## Progressão e personagem

- 24 classes preservadas e expandidas para **72 caminhos avançados**: 3 caminhos por classe.
- Cada caminho possui marcos nos níveis **5, 10 e 15** e duas técnicas próprias, totalizando **144 técnicas exclusivas de caminho** no catálogo.
- Novo sistema de **Maestria por Uso** para atributos e habilidades.
- Patamares: Iniciante, Treinado, Especialista, Mestre, Lendário e Transcendente.
- Maestria de atributo interfere nos testes autoritativos do servidor; maestria de habilidade melhora técnicas de dano/cura.
- 12 talentos distribuídos entre Combate, Arcano, Exploração e Social, com modificadores mecânicos reais.
- Atributos derivados: Poder Físico, Poder Arcano, Guarda, Iniciativa, Precisão, Influência e Exploração.
- Pontos de talento são concedidos durante a progressão e gastos permanentemente pelo jogador.
- Novo sistema de **Downtime**: Treinar, Recuperar e Estudar usando pontos acumulados em turnos resolvidos.

## Caminhos avançados

- Caminho pode ser escolhido a partir do nível 5.
- A escolha é persistente e integrada à ficha.
- Habilidades exclusivas entram na lista do personagem conforme o nível necessário é alcançado.
- Bônus do caminho entram nos atributos efetivos e, portanto, afetam o motor de resolução, não apenas a descrição da interface.

## Crafting e Arsenal

- Nova Oficina dentro do hub Arsenal.
- Seis receitas iniciais com ingredientes reais e consumo persistente de materiais.
- Itens criados recebem IDs próprios e entram no inventário salvo.
- Receitas incluem cura, mana, armas, defesa, foco mágico e utilidade de exploração.
- Equipamentos e crafting agora aparecem juntos para reduzir navegação no celular.

## Multiplayer remasterizado

- Mantida a separação entre **Host/Proprietário** e **Mestre da sessão**.
- Adicionados até **dois Co-mestres**, sem entregar Termux, servidor ou chaves de API.
- Co-mestres podem administrar a sessão enquanto o host continua apenas mantendo a infraestrutura online.
- Prontidão de lobby por jogador.
- Entrada tardia e ausência temporária continuam suportadas.
- Nova recapitulação para jogadores que entram depois do início.
- Sistema nativo de votação do grupo, com 2 a 4 opções e histórico das votações encerradas.
- Sala de Expedição mostra visualmente Host, Mestre, Co-mestres, online, ausente e pronto.

## Mundo e IA

- A IA continua narradora, não dona do estado material do jogo.
- Testes, custos, dano, cura, crafting, progressão, inventário e mundo persistente permanecem no servidor.
- Relógios de mundo, facções, memória factual/rumor, eventos probabilísticos e diretor do mundo continuam integrados.
- O contexto narrativo agora recebe caminho, talentos, maestrias e estado de progressão do personagem.
- Groq/OpenRouter e fallback entre provedores continuam sem rerrolar o resultado mecânico do turno.

## Interface 6.0

A navegação principal foi reorganizada em sete hubs:

1. Aventura
2. Herói
3. Evolução
4. Códice
5. Arsenal
6. Mundo
7. Grupo

Principais telas novas/refeitas:

- Herói com painel visual, atributos efetivos e derivados.
- Evolução com maestrias, barra de MXP, caminhos, marcos, talentos e downtime.
- Classes com 24 classes, 72 caminhos e pré-visualização das técnicas.
- Arsenal & Oficina com equipamento, inventário e crafting.
- Atlas Vivo com relógios, facções, NPCs e atalhos do mundo.
- Sala de Expedição com papéis multiplayer, prontidão, votação e recap de entrada tardia.

## Otimizações

- WebSocket segue como atualização principal; polling é fallback.
- Modo leve continua removendo blur, sombras e animações custosas.
- `content-visibility: auto` e contenção de layout aplicados a grades/listas grandes.
- `prefers-reduced-motion` e modo de movimento reduzido respeitados.
- Cache PWA renovado para `v600` / `germinal-static-v600`.
- Manifest atualizado para iniciar em `/?v=600` e reduzir risco de carregar frontend antigo.

## Persistência e compatibilidade

- Schema do banco atualizado para 10.
- Migração inicializa automaticamente maestrias, caminhos, talentos, prontidão, co-mestres e votação em campanhas antigas.
- Especializações antigas são preservadas e reaproveitadas quando compatíveis com um novo caminho.
- Nenhuma chave de API ou banco do usuário é distribuído no ZIP.

## Validação

- **85/85 testes automatizados aprovados**.
- Simulação real: **4 jogadores / 3 turnos**, concluída após a remasterização.
- Testes novos cobrem catálogo de 72 caminhos/144 técnicas, maestria autoritativa, talentos, crafting persistente, prontidão, co-mestre e votação multiplayer.
