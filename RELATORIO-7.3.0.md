# Relatório técnico — Eidryss 7.3.0 Caminhos Velados

## Arquitetura encontrada

- Backend Node.js modular, com HTTP/WebSocket, autenticação por sessão e serviços de campanha.
- Banco JSON transacional local, cofre separado para chaves de IA e migrações versionadas.
- Motor autoritativo em `src/game`: regras, mundo, progressão, memória e preparação narrativa.
- Frontend mobile-first sem framework, servido pelo próprio celular e reutilizado pelo cliente Android WebView.
- Campanhas multiplayer com turnos persistentes, entrada tardia, ausências, Mestre/co-Mestre e fallback de provedor.

## Mudanças realizadas

- Corrigida a colisão de texto no banner do Santuário do Limiar com um layout em camadas e espaço reservado para controles.
- Barra inferior reduzida às áreas de uso constante e novo botão `+ Mais`, animado, abrindo drawer lateral no desktop e folha inferior no celular.
- Localização deixou de ser apenas global: cada personagem agora possui posição persistente e pode seguir um caminho diferente.
- Atlas, grupo, alvos, encontros, recursos e diário passaram a respeitar a posição individual.
- NPC distante continua registrado como conhecido, mas não pode ser contatado até o personagem alcançar a mesma localidade.
- Vínculos por NPC e jogador foram expandidos para Afeto, Confiança e Desconfiança, com histórico e atualização autoritativa.
- Criado campo específico de ação secreta, mantendo também a sintaxe `Ação secreta:`.
- Cada segredo é resolvido mecanicamente pelo servidor e recebe uma cena narrativa privada, visível somente ao autor.

## Memória e economia de API

- O prompt compartilhado carrega somente localidades ocupadas, entidades presentes, recortes de ficha e memórias relevantes.
- Cidades adormecidas não entram no contexto por padrão; fatos recuperados por memória ainda podem aparecer quando citados ou relevantes.
- Sem ação secreta não existe chamada adicional.
- Uma ação secreta usa um prompt curto próprio, limitado ao personagem, local, testemunhas e resultado mecânico.
- A narrativa compartilhada válida fica em staging. Se a cena privada falhar, o retry não repete a chamada principal nem rerrola as regras.

## Banco e compatibilidade

- Schema elevado para 12 com migração automática.
- Campanhas antigas recebem `location`, `knownNpcIds` e vínculos estruturados sem descartar os valores legados.
- Antes da migração é criado backup `.pre-v12` do banco persistente.
- Campos temporários de staging e snapshots nunca entram no backup exportado ao cliente.

## Autoridade e privacidade

- Distância, poder, recurso, alvo, PvP, dados, cooldown e resultado continuam controlados pelo servidor.
- A narrativa não pode conceder itens, atributos, poderes ou deslocamentos por afirmação do jogador.
- Ação, intenção, resultado, evento e memória privados são filtrados por usuário nas APIs de estado e histórico.
- A fase secreta não avança relógio global, cooldown de terceiros, ecossistema ou iniciativa inimiga uma segunda vez.

## Testes executados

- `npm test`: 99 testes aprovados, 0 falhas.
- `node --check`: servidor, serviço de jogo, engine, mundo, narrativa, persistência e frontend aprovados.
- Cenários cobertos: migração, quatro jogadores, entrada tardia, ausência, caminhos individuais, distância de NPC, segredo privado, retry econômico, troca/falha de API, persistência, memória longa, PvP, dados, progressão e WebSocket autenticado.

## Problemas encontrados e corrigidos

- O banner misturava conteúdo normal e absoluto, permitindo texto atrás dos ornamentos e controles.
- Relação com NPC era um único número compartilhado, insuficiente para histórias pessoais.
- Localização global impedia separação coerente do grupo e contato por distância.
- Um retry de cena privada poderia repetir a narrativa pública e gastar tokens novamente; agora reutiliza o staging válido.
- Testes antigos ainda exigiam consenso de viagem e schema anterior; foram atualizados para validar compatibilidade e o novo comportamento.
- Um teste unitário criava personagens sem localização migrada; a engine agora normaliza esse estado legado com segurança.

## Limitações restantes

- Uma ação secreta com efeito público inevitável permanece privada durante o turno e só deve ser revelada posteriormente por consequência narrativa; não existe ainda uma UI de “revelar segredo”.
- Comunicação remota por item, magia, correio ou facção ainda não possui um sistema formal de alcance; atualmente vale a regra física da mesma localidade.
- O Atlas continua estilizado por nós e conexões, sem mapa gráfico livre.
- O APK existente recebe a interface 7.3 pelo servidor; um novo APK só será necessário para recursos nativos adicionais.

## Próximos passos sugeridos

- Canais de comunicação autorizados por item/habilidade, com custo, atraso e interceptação.
- Revelação voluntária ou automática de segredos e consequências públicas vinculadas.
- Indicadores de presença por local e cenas paralelas agrupadas para reduzir chamadas quando vários jogadores estão juntos.
- Teste visual em aparelhos Android de diferentes proporções antes de publicar o pacote como release estável.
