# Germinal RPG 4.0.0 — Fundação do aplicativo

Esta versão evolui a 3.1.3 sem trocar Node.js, REST, WebSocket, banco JSON, autenticação, motor de regras ou estrutura das campanhas. O objetivo deste primeiro pacote 4.x é reduzir atrito no celular e criar a fundação para as próximas evoluções aprovadas.

## Experiência de conta

- Avatar e cor de conta persistentes, separados da aparência do personagem.
- Perfil editável sem expor hash de senha.
- Opção **Lembrar login neste aparelho**. Quando desligada, o cookie é somente de sessão; quando ligada, mantém a sessão persistente.
- O navegador pode lembrar apenas o nome de usuário; a senha nunca é colocada em localStorage.

## Lobby e navegação

- Cartão **Continuar aventura** para a última campanha aberta.
- Campanhas favoritas e ordenação com favoritas primeiro.
- Ações rápidas para criar, entrar por código e abrir ambiente de teste.
- Cabeçalho e cards mais compactos, principalmente em telas estreitas.
- Paleta padrão Obsidiana Arcana: base escura, violeta e dourado, reduzindo a predominância de verde.

## Mobile e desempenho

- Modo compacto persistente e layout automático para telas pequenas.
- Ajustes específicos para aparelhos fracos e touch, evitando efeitos caros quando o modo leve estiver ativo.
- Navegação inferior reduzida para ícones em telas muito estreitas.
- CSS e componentes adaptados para safe areas e telas baixas.

## Turnos e digitação

- Rascunho local por campanha e por turno.
- O texto digitado sobrevive a renderizações/reconexões e é apagado somente depois de o servidor aceitar a ação.
- Sugestões de ação usam habilidades realmente disponíveis e consumíveis do inventário.
- Composer de ação mais compacto e com feedback imediato.
- Proteções anteriores contra duplicação e turnos pendentes continuam intactas.

## Multiplayer e conexão

- Presença online/offline por membro da campanha.
- Painel do grupo mostra conexão e estado de envio da ação.
- Reconexão WebSocket com backoff progressivo, evitando recarregar a página inteira.
- Polling de segurança é usado apenas quando o socket não está conectado.

## Mochila e grupo

- Pesquisa de itens por nome/descrição.
- Filtros por tipo.
- Estilos de raridade e slots de equipamento mais compactos.
- Grupo com cards de recursos, classe, nível, presença e prontidão.

## PWA e cache

- Service worker versão 4 com cache somente do shell estático.
- Endpoints `/api`, campanhas, chaves e dados sensíveis nunca entram no cache do PWA.
- Navegação usa estratégia network-first e possui fallback offline do shell.
- Botão de instalação aparece quando o navegador fornece `beforeinstallprompt`.

## Banco e compatibilidade

- Schema 6 aditivo.
- Usuários antigos recebem `presentation.avatar` e `presentation.accent` automaticamente.
- Antes da primeira migração para schema 6 é mantida cópia `.pre-v6` do banco.
- O ZIP contém somente `data/.gitkeep`; extrair sobre a instalação não substitui `germinal.json`, `server.key` ou chaves cifradas existentes.

## Validação

A suíte automatizada passa com 58 testes, incluindo os testes anteriores de motor, memória, IA, API, turnos, persistência e interface, além de novos testes para perfil, sessão lembrada e recursos da experiência 4.0.

A validação visual final ainda deve ser feita em Android/Chromium real, principalmente teclado, PWA e comportamento em telas pequenas, porque o ambiente automatizado não reproduz integralmente o navegador do celular.
