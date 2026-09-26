# Germinal RPG 3.0 — relatório da evolução

**Base encontrada:** versão 2.3, Node.js sem dependências externas, frontend HTML/CSS/JS, REST, WebSocket, autenticação scrypt, banco JSON e cofre AES-GCM. Nenhum framework ou banco foi substituído. Branch de restauração `backup/pre-isekai-3`, commit original `ee4d7d4`.

**Alterações:** oito classes com habilidades controladas, XP/níveis, distribuição de atributos, treinamento, especializações e habilidade de missão; itens equipáveis; PvP com validação; D20 no servidor com log; retaliação de inimigos; mapa de cinco nós com descobertas e viagem consensual; introduções isekai alternativas com entidade narrada pela IA.

**Interface:** identidade original evoluída com cena/portal, seis abas de jogo, diário, NPCs conhecidos, grimório, fichas de itens e status, XP, mapa SVG, controles do Host e laboratório de desenvolvimento. Manifesto PWA sem cache de segredos/campanhas. Atualizações preservam os campos de formulário durante a digitação.

**Banco e memória:** schema 5 aditivo, backup pré-migração, escrita sincronizada antes da publicação em RAM, cópia da revisão anterior, snapshots de turno. Estado objetivo separado de narrativa, eventos, capítulos, fatos e memórias por NPC. Fatos antigos não são apagados para limitar o prompt: a recuperação seleciona os relevantes. NPCs têm conhecimento privado e arquivo de interações.

**API:** configuração preservada no perfil e criação da sala, teste real por botão, troca em Ajustes. Erros sanitizados só para o Host. Turnos calculados são gravados como pendentes e reutilizados em retry/reinício. Narrativa local de reserva continua desativada. A IA não altera diretamente vida, mana, inventário ou localização.

**Problemas corrigidos:** estado em RAM avançava antes de confirmar gravação; retry recalculava aleatoriedade; exportação poderia revelar resultados pendentes; poderes e atributos podiam ser editados livremente; PvP bloqueado gastava recursos; NPC distante podia ganhar relação; evolução de habilidade podia ser confundida com o nome da habilidade básica; controles de pausa tinham handlers mas não botões; cofre inválido e banco corrompido tinham recuperação insegura; atualização da interface perdia digitação.

**Validação:** 25 testes antes da alteração; 48 testes após a evolução, todos aprovados. Quatro jogadores reais via HTTP, concorrência, WebSocket autenticado, sigilo, migração, falha de disco, cofre, falhas da IA, troca de chave, retries concorrentes, reinício, classes, custos, recargas, pontos, PvP, D20, consenso, mapa, memória de 300 turnos e geração/escape das telas. Campanha de 20 turnos pelo serviço e simulador de 3 turnos com 4 personagens concluídos. Testes pagos substituídos por provedores simulados; nenhuma chave real foi utilizada.

**Atenção na atualização:** guarde sua pasta inteira antes de extrair. Poderes livres antigos ficam arquivados, mas deixam de ser habilidades ativas; o catálogo passa a controlar a ficha. O ZIP de restauração contém o código antigo, não os dados de seu celular.

**Limitações:** validação visual real no Chromium/Android e instalação PWA pendentes devido à indisponibilidade do navegador neste ambiente. O motor textual é simples, mapa/conteúdo são finitos, invocações não são agentes autônomos, não há importador de backup por interface, retratos enviados ou recuperação de senha. Recomenda-se ampliar conteúdo e testar equilíbrio com seu grupo antes de uma campanha longa definitiva.

**Principais arquivos:** `src/game/catalog.js`, `world.js`, `engine.js`, `memory.js`, `narrative.js`; `src/services/game-service.js`; `src/data/store.js`; `src/server.js`; `public/app.js`, `style.css`, manifesto e service worker; `tests/evolution.test.js`, `ui-templates.test.js`.
