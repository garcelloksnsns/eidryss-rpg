# Germinal RPG 6.0 — Documento da Reforja

## Visão

A 6.0 muda a direção do Germinal de “RPG narrado por IA com vários sistemas auxiliares” para **RPG multiplayer persistente cujo servidor é a autoridade e a IA atua como Mestre narrativo**. O jogador deve perceber evolução, especialização, mundo e grupo pela interface, sem depender de comandos ocultos ou de a IA lembrar de uma regra.

## 1. Maestria de atributos

Cada atributo possui MXP próprio, rank, progresso para o próximo patamar e número de usos relevantes. As ações resolvidas pelo servidor alimentam a maestria correspondente. O bônus do rank entra no teste autoritativo.

Patamares atuais:

| Rank | MXP mínimo | Bônus |
|---|---:|---:|
| Iniciante | 0 | +0 |
| Treinado | 40 | +1 |
| Especialista | 120 | +2 |
| Mestre | 300 | +3 |
| Lendário | 650 | +4 |
| Transcendente | 1200 | +5 |

Isso permite que dois personagens com o mesmo atributo base se comportem de maneira diferente depois de dezenas de sessões.

## 2. Maestria de habilidades

Poderes usados repetidamente também acumulam maestria. Técnicas ofensivas e de cura recebem crescimento mecânico associado ao rank da habilidade. O sistema guarda usos e MXP por técnica, permitindo expansão futura para modificadores, mutações de técnica e desafios de domínio.

## 3. Caminhos

As 24 classes possuem três caminhos, somando 72 rotas avançadas. O jogador escolhe um caminho a partir do nível 5. Cada rota tem:

- identidade própria;
- atributo principal;
- estilo ofensivo, defensivo ou tático;
- marcos nos níveis 5, 10 e 15;
- duas técnicas exclusivas desbloqueadas nos níveis 5 e 12;
- bônus que entram nos atributos efetivos.

A escolha deixa de ser apenas “trocar o nome da especialização”: ela muda efetivamente a ficha e a lista de poderes.

## 4. Talentos

A árvore possui quatro ramos: Combate, Arcano, Exploração e Social. Talentos gastam pontos permanentes, têm pré-requisitos e alteram os atributos efetivos. O modelo foi construído para comportar futuras árvores específicas por classe sem reescrever o motor de progressão.

## 5. Downtime

Turnos resolvidos concedem pontos de downtime, limitados para evitar acúmulo infinito. O jogador pode gastar esses pontos entre aventuras para:

- treinar uma maestria de atributo;
- recuperar recursos;
- estudar, obtendo progresso intelectual e XP.

Isso cria progressão fora do combate e dá utilidade a períodos entre cenas importantes.

## 6. Crafting

Crafting é resolvido pelo servidor. Receita verifica quantidades, consome materiais e gera um item persistente. A primeira coleção de receitas serve como fundação para sistemas maiores de alquimia, ferraria, runas e receitas descobertas no mundo.

## 7. Multiplayer e autoridade

A infraestrutura agora diferencia quatro conceitos:

- **Host/Proprietário**: dono da campanha e do servidor/chaves.
- **Mestre**: autoridade operacional principal da sessão.
- **Co-mestre**: auxiliar delegado pelo proprietário.
- **Jogador**: participante normal da campanha.

Assim, o celular que mantém o Termux pode continuar ligado enquanto outra pessoa administra a sessão. Co-mestres não recebem segredo de API nem acesso ao processo do servidor.

A sala também possui prontidão, presença/ausência, entrada tardia, recap e votação. O servidor pode começar com menos de quatro jogadores e aceitar os demais depois.

## 8. Mundo vivo

A 6.0 mantém e expõe melhor sistemas anteriores: relógios, facções, NPCs, bestiário, memória, tensão, clima e diretor do mundo. A interface Mundo/Atlas Vivo serve como uma camada única para acompanhar essas consequências.

## 9. Divisão IA × regras

Fluxo fundamental:

`Ação do jogador -> Motor de regras -> Estado persistente -> Eventos -> IA narra o resultado`

A IA não pode transformar um pedido em sucesso automático. Ela recebe o que aconteceu mecanicamente e transforma os eventos em narrativa. Se o provedor cair e o fallback assumir, o resultado já calculado não é rerrolado.

## 10. Nova arquitetura de interface

A antiga navegação crescia por abas. Na Reforja, funções relacionadas foram agrupadas em hubs para reduzir a quantidade de elementos permanentes na barra inferior:

- **Aventura:** ação e narrativa.
- **Herói:** ficha, recursos e atributos.
- **Evolução:** maestrias, caminhos, talentos e downtime.
- **Códice:** conhecimento adquirido.
- **Arsenal:** inventário, equipamentos e oficina.
- **Mundo:** atlas, facções, relógios, missões e NPCs.
- **Grupo:** lobby e administração multiplayer.

Telas secundárias continuam disponíveis pelos atalhos internos, preservando recursos existentes.

## 11. Performance mobile

O objetivo não foi adicionar animações indiscriminadamente. A 6.0 usa microanimações em áreas de maior valor visual e desliga efeitos custosos no modo leve. Listas extensas podem ser ignoradas pelo navegador quando fora da viewport, reduzindo trabalho de layout/renderização.

## 12. Próximas expansões possíveis

A arquitetura agora suporta, sem exigir uma nova reescrita central:

- árvores de talentos exclusivas por classe/caminho;
- maestria de armas e escolas mágicas;
- receitas aprendidas por exploração;
- economia regional e comerciantes persistentes;
- guerras e diplomacia de facções;
- reputação por NPC/facção;
- moradia/base de grupo;
- pets e invocações persistentes;
- missões procedurais estruturadas;
- cliente Android/APK sobre a API/WebSocket atual.

Esses itens são expansões futuras; não são apresentados como concluídos nesta distribuição.
