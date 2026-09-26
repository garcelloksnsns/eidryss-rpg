# GitHub do Eidryss

O repositório deve ser preferencialmente **privado** enquanto o projeto usa infraestrutura e código ainda em desenvolvimento.

Arquivos seguros para commit incluem o servidor, interface, testes, cliente Android e workflows. Arquivos de campanha, chaves de IA e chave Android são excluídos pelo `.gitignore`.

## Build automático

O workflow `Build Eidryss APK` roda quando:

- há `push` na `main` alterando `android-client/**` ou o próprio workflow;
- ele é iniciado manualmente em `Actions → Build Eidryss APK → Run workflow`.

Antes de compilar Android, ele executa `npm test`. Se a suíte falhar, nenhum APK é produzido.

## Fluxo recomendado de atualização do jogo

Mudança somente no servidor/interface:

1. Host ativa manutenção;
2. arquivos são atualizados no celular servidor;
3. testes são executados;
4. Host desativa manutenção;
5. clientes detectam revisão nova e recarregam.

Mudança no shell Android:

1. commit/push para GitHub;
2. Actions compila o APK;
3. baixar o artifact;
4. distribuir o APK release assinado apenas quando realmente necessário.
