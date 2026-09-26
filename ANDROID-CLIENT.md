# Cliente Android do Eidryss

## Arquitetura

O APK **não contém uma cópia congelada do RPG inteiro**. Ele é um cliente Android pequeno com:

- splash nativo animado desenhado por `Canvas`;
- tela nativa de conexão ao servidor;
- detecção de manutenção/offline;
- sincronização por `/api/client/meta`;
- invalidação automática de cache por `clientRevision`;
- WebView restrita ao host configurado para executar a interface viva;
- links externos enviados ao navegador;
- botão Voltar do Android integrado ao histórico do cliente;
- cookies/sessão mantidos pelo WebView.

Isso permite que o Host altere o servidor e a interface no Termux sem distribuir outro APK para cada mudança.

## Primeira abertura

1. Inicie `bash INICIAR-ONLINE-TERMUX.sh` no celular Host.
2. Copie o endereço `https://....trycloudflare.com`.
3. Abra o APK Eidryss.
4. Cole o endereço em **Conecte seu mundo**.
5. O endereço fica salvo no aparelho.

Quick Tunnels mudam de endereço quando são recriados. Se o Host receber outro endereço, use **Trocar servidor** no cliente. Para uma URL fixa, use posteriormente um Cloudflare Named Tunnel/domínio próprio.

## Build sem PC

O workflow `.github/workflows/build-apk.yml` usa Java 17, Android SDK 35 e Gradle 8.9. Ele executa os testes do projeto e compila `assembleDebug`.

No GitHub pelo celular:

1. abra o repositório;
2. toque em **Actions**;
3. abra **Build Eidryss APK**;
4. **Run workflow**;
5. quando terminar, baixe o artefato **Eidryss-Android-APK-debug**.

## Assinatura permanente para APK release

Para que uma futura versão nativa seja instalada por cima da anterior, todos os APKs precisam usar a mesma chave de assinatura. Não coloque a chave no repositório.

No Termux:

```bash
pkg install openjdk-21 -y
bash scripts/GERAR-CHAVE-ANDROID-TERMUX.sh
```

O arquivo será criado em `.signing/eidryss-release.jks` e já está ignorado pelo Git.

No GitHub, crie estes **Actions secrets**:

- `ANDROID_KEYSTORE_BASE64` — saída de `base64 -w 0 .signing/eidryss-release.jks`;
- `ANDROID_KEYSTORE_PASSWORD` — senha usada na criação;
- `ANDROID_KEY_ALIAS` — `eidryss`;
- `ANDROID_KEY_PASSWORD` — mesma senha, salvo se você deliberadamente usar outra.

Quando os quatro secrets existirem, o mesmo workflow produz também o artefato **Eidryss-Android-APK-release** com assinatura estável.

Guarde uma cópia da chave `.jks` em local seguro. Perdê-la significa não conseguir assinar uma atualização compatível com instalações antigas.
