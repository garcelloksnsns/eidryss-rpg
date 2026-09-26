# Eidryss 7.0.1 — navegação e persistência

Hotfix focado nos três problemas encontrados no primeiro APK em uso real.

## Barra inferior

- A barra de Aventura/Herói/Evolução/Códice/Arsenal/Mundo/Grupo foi retirada de dentro do contêiner que recebe animação de página.
- Em WebView, um ancestral animado com `transform` podia virar o bloco de referência de `position: fixed`, fazendo a barra aparecer somente no fim do conteúdo.
- Agora ela é irmã da página e fica permanentemente presa à viewport, acima da área de gesto do Android.
- Foi reservado espaço inferior no conteúdo para nenhum card ficar escondido atrás da barra.

## Voltar do Android e gesto lateral

- Troca de abas agora usa a History API (`pushState`).
- O botão/gesto Voltar do Android passa a retornar para a aba anterior.
- Ao voltar da primeira tela da campanha, o histórico interno retorna ao lobby em vez de encerrar imediatamente o aplicativo.
- O botão de voltar dentro do jogo também usa o histórico quando há uma tela anterior.

## Contas, campanhas e turnos não devem mais sumir a cada versão

- No Termux, banco, cofre das chaves e status passam a morar por padrão em `~/.eidryss/`, fora da pasta do código.
- `git pull`, troca de arquivos e nova versão deixam de criar um banco vazio só porque a pasta do projeto mudou.
- Na primeira execução, se houver `data/eidryss.json`, `data/germinal.json` ou `data/server.key` na instalação atual, eles são copiados automaticamente para a área persistente.
- Foi adicionado `RECUPERAR-DADOS-ANTIGOS-TERMUX.sh` para localizar bancos de instalações antigas e restaurar um deles com backup do estado atual.
- O `server.key` correspondente é restaurado junto quando existe, preservando também a possibilidade de ler credenciais de IA cifradas.

## Atualização

- servidor/interface: 7.0.1
- client revision: 701
- não exige APK novo para a barra ou histórico; o APK 1.0 já carrega a nova interface do servidor.
