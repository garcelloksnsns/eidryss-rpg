# Eidryss 7.0.0 — Ascensão

Grande remasterização sobre a base 6.0.

## Identidade e interface

- Germinal passa a se chamar **Eidryss**.
- Novo sigilo vetorial próprio usado em splash, ícone web e cliente Android.
- Splash web com anéis, núcleo, nós orbitais e progresso animado.
- Identidade visual 7.0 com transições focadas em `transform`/`opacity` e fallback para modo leve/redução de movimento.
- 24 classes recebem sigilos SVG próprios nos cards principais.
- Botão de retorno continua acessível no cabeçalho da campanha; botão Voltar do Android passa a ser tratado pelo cliente nativo.

## Progressão

- Alocação manual de atributos retorna ao centro da tela **Evolução**.
- Cada nível continua concedendo **3 pontos livres de atributo**.
- Novo alocador com `+`/`−`, prévia, saldo restante e confirmação única.
- Maestrias continuam independentes: atributo base é investimento deliberado; maestria é experiência de uso.
- Corrigido bloqueio excessivo: o jogador pode administrar progressão enquanto outros membros já enviaram ações; só fica bloqueado depois que **a própria ação** foi selada no turno.

## Economia viva

- Personagens passam a possuir carteira persistente em Coroas.
- Arsenal ganha Mercado da Travessia com compra e venda server-authoritative.
- Preços reagem a perigo e tensão do mundo em vez de serem apenas decorativos.
- Itens equipados e itens de missão não podem ser vendidos por engano.
- Materiais comprados entram no mesmo inventário usado pelo crafting.

## Atualização sem novo APK

- Novo `SystemStatus` persistente.
- `GET /api/client/meta` informa versão, revisão e manutenção.
- Manutenção responde HTTP 503 nas demais APIs e impede novas mutações.
- `MANUTENCAO-ON.sh` ativa bloqueio com mensagem personalizada.
- `MANUTENCAO-OFF.sh` libera o jogo e incrementa a revisão do cliente.
- Interface web e Service Worker passam para revisão 700.
- Ao detectar revisão diferente, o cliente limpa cache de interface e recarrega.

## Android

- Novo projeto `android-client/` em Java/Android SDK 35.
- Splash e estado de conexão são nativos, não HTML.
- Sigilo nativo desenhado por Canvas e animado por `ValueAnimator`.
- WebView bloqueia acesso a arquivos locais, desativa mixed content e abre links externos no navegador.
- Tela de manutenção nativa consulta o servidor a cada 5 segundos.
- Endereço do servidor é salvo no aparelho e pode ser trocado.
- Back do Android navega para trás dentro do cliente antes de sair.

## GitHub Actions

- `.github/workflows/build-apk.yml` compila APK em Ubuntu sem computador do usuário.
- Executa a suíte Node antes do build Android.
- Produz sempre `Eidryss-Android-debug.apk`.
- Se secrets de assinatura estiverem configurados, produz também `Eidryss-Android-release.apk` com assinatura persistente.
- Script Termux incluído para gerar a chave release sem PC.

## Compatibilidade e dados

- Banco padrão novo: `data/eidryss.json`.
- Se só existir o banco legado `data/germinal.json`, ele é usado automaticamente para não perder campanhas.
- Cookies/localStorage legados continuam aceitos onde necessário para preservar sessões e preferências.
- Códigos de sala novos usam prefixo `EIDRYSS-####`.
- Backups novos usam formato `EIDRYSS_CAMPAIGN_BACKUP`.

## Validação

- suíte ampliada para manutenção, revisão de cliente, Android/Actions e progressão em sessão;
- 91/91 testes aprovados na fonte durante a preparação da versão.
