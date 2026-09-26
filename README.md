# Eidryss 7.5 — Realidade Compartilhada

Eidryss é um RPG sandbox multiplayer mobile-first com servidor autoritativo em Node.js, Mestre IA, mundo persistente e cliente Android. O celular do Host continua sendo o servidor pelo Termux; o APK funciona como cliente e recebe a interface atualizada do próprio servidor.

## Novidades da 7.5

- uma única realidade autoritativa com várias janelas narrativas por cena;
- **uma requisição narrativa por turno**, mesmo com jogadores separados;
- ações secretas podem voltar na mesma resposta estruturada, com fallback seguro preservado;
- eventos canônicos com `eventId` e alcance PERSONAL, LOCAL, NEARBY, REGIONAL ou GLOBAL;
- visibilidade decidida pelo servidor conforme posição, zona, rota, distância e região;
- monstros e NPCs possuem posição e última ação únicas, projetadas para todos os observadores;
- movimento por oito direções, estrada, trilha, rio, ponte, floresta, montanha e “para frente”;
- viagens longas guardam progresso em quilômetros e não teleportam o personagem;
- jogadores em sentidos opostos podem se encontrar no mesmo trecho da rota;
- encontros de viagem pertencem à rota e são criados uma única vez para viajantes próximos;
- descobertas visíveis são propagadas aos presentes sem misturar conhecimento privado;
- schema 14, revisão web 750 e backup automático `.pre-v14`.

Veja `CHANGELOG-7.5.0.md` e `PATCH-7.5.0.md`.

## Recursos preservados da 7.4

- **cenas ativas por localização**: jogadores separados vivem acontecimentos locais diferentes sem multiplicar chamadas de IA;
- geografia canônica com rotas, terreno, direção, distância, obstáculos, pontes e requisitos de travessia;
- Atlas de fantasia em SVG/CSS, com terreno, rios, serras, estradas, neblina de guerra e rotas bloqueadas;
- Context Builder seletivo que recupera cena, região, personagem, referências citadas e fatos globais resumidos;
- NPCs persistentes com personalidade, valores, objetivos, medos, voz, localização, conhecimento e relações individuais;
- relações por jogador com Afeto, Confiança e Desconfiança fundamentadas em acontecimentos relevantes;
- conhecimento, descobertas, bestiário e memórias privadas por personagem;
- missões estruturadas, cujos objetivos avançam pelo motor autoritativo;
- exportação normal protegida e backup bruto separado, disponível apenas ao proprietário;
- botão **Salvar campanha** com flush e checkpoint local sem gasto de API;
- compatibilidade automática com campanhas 7.2/7.3, backup pré-migração e schema 13;
- revisão web 740; o cliente Android existente atualiza a interface sem alteração nativa.

O relatório técnico completo está em `CHANGELOG-7.4.0.md` e as instruções do pacote incremental em `PATCH-7.4.0.md`.

## Recursos preservados da 7.3

- navegação inferior enxuta com quatro áreas principais e botão **+ Mais** animado;
- correção do banner do Santuário: título, descrição, aviso e ornamentos não se sobrepõem;
- localização persistente por personagem, permitindo que o grupo se divida;
- Atlas marca **onde você está**, não um local global fictício do grupo;
- conversa com NPC exige presença física na mesma localidade;
- diário pessoal de NPCs conhecidos por personagem;
- relações individuais com **Afeto, Confiança e Desconfiança**;
- compositor dedicado de ação secreta e atalho textual `Ação secreta:`;
- cena secreta narrada em chamada compacta separada e devolvida somente ao autor;
- retry de cena secreta reutiliza a narrativa compartilhada já válida, evitando cobrar tokens novamente;
- contexto principal da IA carrega somente as localidades ativas, entidades locais e memórias relevantes;
- migração e backup legados preservados.

Detalhes técnicos e garantias de privacidade da versão anterior continuam em `PATCH-7.3.0.md`.

## O que mudou na 7.0

- nova identidade **Eidryss**, novo sigilo e splash animado;
- interface remasterizada com navegação mobile, microanimações e modo leve;
- 24 classes, 72 caminhos e técnicas de caminho mantidos da 6.0;
- **alocação manual de atributos restaurada e destacada**: +3 pontos por nível, distribuídos como o jogador quiser;
- **maestria continua separada** e cresce pelo uso durante a campanha;
- mestre, co-mestres, entrada tardia, ausência temporária e votações multiplayer;
- mundo vivo, relógios, memória, bestiário, crafting, talentos e downtime;
- economia autoritativa com Coroas, compra/venda e preços influenciados por perigo/tensão do mundo;
- modo de manutenção e revisão de cliente para atualizar a interface sem reinstalar APK;
- cliente Android nativo para splash/conexão/manutenção/cache + WebView segura para a interface viva;
- GitHub Actions pronto para compilar um APK sem computador.


## Persistência entre versões

No Termux, `INICIAR-TERMUX.sh` e `INICIAR-ONLINE-TERMUX.sh` usam `~/.eidryss/` para o banco e o cofre. Assim contas, campanhas, turnos e chaves não dependem da pasta do código. Para tentar recuperar uma instalação antiga, execute:

```bash
bash RECUPERAR-DADOS-ANTIGOS-TERMUX.sh
```

## Rodar no Termux

Primeira vez:

```bash
pkg update
pkg install nodejs-lts cloudflared unzip -y
termux-setup-storage
```

Dentro da pasta do projeto:

```bash
bash INICIAR-ONLINE-TERMUX.sh
```

O script inicia o servidor em `127.0.0.1:8000` e cria um endereço HTTPS temporário do Cloudflare. Esse endereço pode ser colado no APK Eidryss.

Para execução apenas local:

```bash
bash INICIAR-TERMUX.sh
```

## Atualizar sem distribuir outro APK

A maior parte do jogo fica no servidor. Interface, classes, poderes, regras, mapas, crafting, mundo, IA e animações web podem mudar sem reinstalar o APK.

Antes de alterar arquivos durante uma sessão:

```bash
bash MANUTENCAO-ON.sh "Aplicando atualização…"
```

Os clientes passam a mostrar a tela de manutenção e deixam de enviar ações. Depois da alteração:

```bash
bash MANUTENCAO-OFF.sh
```

Esse comando também incrementa a revisão de cliente. O APK detecta a revisão nova, invalida o cache e carrega a interface atualizada.

> Um APK novo só é necessário quando o próprio shell Android muda: permissões, integração nativa, notificações, câmera, armazenamento etc.

## Compilar APK pelo GitHub

O projeto contém `.github/workflows/build-apk.yml`. Em um repositório GitHub, qualquer mudança em `android-client/` dispara o build; também é possível ir em **Actions → Build Eidryss APK → Run workflow**.

O artefato básico é:

```text
Eidryss-Android-debug.apk
```

Ele é instalável diretamente. Para atualizações nativas sem precisar desinstalar o aplicativo, configure uma chave de assinatura permanente conforme `ANDROID-CLIENT.md`.

## Testes

```bash
npm test
```

A suíte cobre engine, autenticação, persistência, multiplayer, mundo vivo, progressão, privacidade, ação secreta, distância, economia de contexto, manutenção, cache e pipeline Android. Consulte `CHANGELOG-7.4.0.md` para saber exatamente quais verificações foram executadas nesta entrega.

## Segurança

Nunca faça commit de:

- `.env`;
- `data/eidryss.json` ou o banco legado `data/germinal.json`;
- `data/server.key`;
- `data/system-status.json`;
- chaves Groq/OpenRouter/Gemini/OpenAI;
- `.jks`/`.keystore` de assinatura Android.

O `.gitignore` já cobre esses arquivos.

## Estrutura

```text
public/                 interface viva do jogo
src/                    servidor, regras, IA e persistência
android-client/         shell Android nativo
.github/workflows/      build automático do APK
scripts/                manutenção e utilitários
MANUTENCAO-ON.sh        bloqueia ações para atualização
MANUTENCAO-OFF.sh       libera e aumenta a revisão do cliente
INICIAR-ONLINE-TERMUX.sh servidor + túnel HTTPS
```
