# Germinal RPG 3.1.2 — gerenciamento de chaves

- A tela da campanha agora mostra claramente se o provedor selecionado tem chave salva.
- É possível adicionar/substituir a chave do provedor diretamente na campanha.
- É possível testar uma chave nova antes de salvá-la.
- É possível testar a chave já salva separadamente.
- É possível excluir a chave atual sem apagar campanha, personagens ou memória.
- Chaves ficam separadas por provedor; substituir Gemini não remove OpenAI/OpenRouter/Grok etc.
- Em turno preservado por falha de IA, o Host pode salvar a nova chave e tentar o mesmo turno em uma única ação.
- O teste de chave digitada usa a chave temporariamente sem gravá-la no banco.
- A API continua cifrada no cofre do servidor e nunca é devolvida ao navegador.
- Cache de frontend atualizado para 3.1.2.

Validação: 52 testes aprovados.
