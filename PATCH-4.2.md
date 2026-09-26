# Germinal RPG 4.2 — Códice e Sessão Flexível

Esta versão preserva o motor, campanhas, memória, classes, itens, mundo vivo e integrações anteriores, focando em preparação para sessões reais com grupos incompletos e em informação de RPG mais útil durante a aventura.

## Sessões flexíveis

- Capacidade da sala e mínimo ativo agora são configurações diferentes.
- Uma sala pode ter 4 vagas e começar com 2 jogadores.
- O Host pode permitir entrada tardia depois de a campanha já ter iniciado.
- Jogadores que entrarem no meio da sessão começam a participar a partir do próximo turno, evitando alterar um turno já selado.
- Se alguém sair temporariamente e o número mínimo ativo continuar presente, o grupo pode seguir jogando.
- Ausentes recebem somente uma ação defensiva neutra automática; o sistema não toma decisões estratégicas ou narrativas importantes pelo jogador ausente.
- Ao retornar, o jogador retoma seu personagem normalmente.

## Códice

A antiga área de Habilidades foi evoluída para Códice sem remover treinamento ou uso das habilidades existentes.

O Códice possui:

- Magias: técnicas mágicas e habilidades que usam mana/magia.
- Estilos: técnicas físicas, marciais e demais habilidades de classe.
- Bestiário: criaturas efetivamente encontradas pelo grupo.

O bestiário possui descoberta progressiva em quatro níveis. Encontros, observações e derrotas aumentam o conhecimento. Fraquezas e resistências não são reveladas no primeiro contato; aparecem somente depois de conhecimento suficiente.

## OpenRouter

O OpenRouter continua aceitando qualquer ID de modelo manual e ganhou atalhos de configuração para modelos OpenAI disponíveis via OpenRouter:

- GPT-5.6 Luna — opção econômica para alto volume.
- GPT-5.6 Terra — opção equilibrada.
- GPT-5.6 Sol — opção para maior qualidade.

As chaves continuam armazenadas no cofre cifrado do servidor e separadas por provedor.

## Progressão validada

O fluxo real de progressão foi testado de ponta a ponta:

- 100 XP leva um personagem nível 1 ao nível 2 nas regras atuais.
- Cada nível concede pontos de atributo e habilidade.
- Pontos alocados alteram os atributos persistidos e afetam os cálculos reais do motor.
- Força altera dano físico.
- Resistência aumenta HP e participa da defesa física.
- Inteligência aumenta Mana.
- Velocidade, percepção, magia e sorte continuam participando dos cálculos correspondentes.

A tela de Status agora explica resumidamente o efeito de cada atributo.

## Banco

Schema 8, com migração aditiva e backup automático `data/germinal.json.pre-v8` antes da migração.

## Validação

66 testes automatizados aprovados, incluindo regressões das versões anteriores e novos testes para sessão 4/2, entrada tardia, ausências, progressão mecânica, bestiário progressivo e presets OpenRouter.
