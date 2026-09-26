# Germinal RPG 4.2.1 — Groq direto

Hotfix para sessões ao vivo.

- adiciona provedor Groq nativo, separado do OpenRouter;
- aceita chaves Groq `gsk_...` no cofre já existente;
- endpoint padrão: `https://api.groq.com/openai/v1`;
- preset principal: `openai/gpt-oss-120b`;
- preset econômico: `openai/gpt-oss-20b`;
- teste de chave, substituição e exclusão funcionam como nos demais provedores;
- criação de itens por IA também funciona com Groq;
- saída narrativa Groq limitada a 4096 tokens por chamada para reduzir risco de estourar o limite por minuto no tier gratuito, ainda suficiente para o perfil cinematográfico do Germinal;
- nenhum banco, campanha ou chave é incluído no ZIP.

Validação: 68/68 testes aprovados, incluindo endpoint Groq, header Bearer e ambos os presets GPT-OSS.
