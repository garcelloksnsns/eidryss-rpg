# Patch Eidryss 7.4.0 sobre 7.3.0

O pacote incremental contém somente arquivos alterados e novos. Ele não inclui banco, `.env`, chaves, keystore nem dados de campanha.

## Aplicação recomendada no Termux

1. Pare o servidor.
2. Extraia o ZIP do patch em uma pasta separada.
3. Execute `bash APLICAR-PATCH-TERMUX.sh /caminho/da/Eidryss-RPG-7.3.0`.
4. Inicie o servidor normalmente.

O aplicador valida a versão, cria um backup recuperável dos arquivos substituídos e copia o overlay. Na primeira inicialização, o schema 13 cria também o backup do banco antes da migração. O diretório `~/.eidryss` não é movido nem apagado.

## Reversão

O aplicador informa a pasta `backup-pre-7.4-*`. Com o servidor parado, restaure os arquivos dessa pasta sobre o projeto antigo. Se precisar reverter também o schema, use a cópia `.pre-v13` do banco criada automaticamente.

Consulte `CHANGELOG-7.4.0.md` para mudanças, migração, segurança e testes.
