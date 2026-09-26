# Patch Eidryss 7.5.0 sobre 7.4.0

Pare o servidor, extraia o patch e execute:

```bash
bash APLICAR-PATCH-TERMUX.sh /caminho/da/Eidryss-RPG-7.4.0
```

O aplicador valida a versão, cria `backup-pre-7.5-*` dos arquivos substituídos e não altera diretamente `~/.eidryss`. Na primeira inicialização, o servidor cria `.pre-v14` antes da migração do banco.

O cliente Android existente não precisa ser recompilado: a revisão 750 invalida o cache web automaticamente.
