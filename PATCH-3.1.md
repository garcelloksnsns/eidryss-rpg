# Germinal RPG 3.1 — estabilidade mobile

- Tema padrão alterado de verde para paleta obsidiana/índigo com detalhes dourados.
- Campos de texto protegidos contra rerender de WebSocket/polling durante digitação e composição do teclado Android.
- `touch-action` corrigido para inputs, textareas e selects.
- Atualizações em tempo real deixam de reconstruir a tela enquanto o usuário está digitando.
- Polling vira apenas fallback quando o WebSocket não está conectado, reduzindo CPU/rede.
- Modo leve automático em aparelhos com pouca memória/CPU, com opção manual em Ajustes.
- Modo leve remove blur, sombras pesadas, animações e elementos decorativos custosos.
- Envio de ação dá feedback imediato e libera o foco do teclado para a atualização de estado aparecer rapidamente.
- Cache-busting de CSS/JS/service worker para evitar interface antiga após atualização.
- Versão 3.1.0.

Validação: 48/48 testes aprovados.
