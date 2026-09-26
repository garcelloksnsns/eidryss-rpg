# Eidryss 7.0.1 — Ascensão

Eidryss é um RPG sandbox multiplayer mobile-first com servidor autoritativo em Node.js, Mestre IA, mundo persistente e cliente Android. O celular do Host continua sendo o servidor pelo Termux; o APK funciona como cliente e recebe a interface atualizada do próprio servidor.

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

A 7.0 possui testes de engine, autenticação, persistência, multiplayer, mundo vivo, progressão, manutenção, cache e pipeline Android.

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
