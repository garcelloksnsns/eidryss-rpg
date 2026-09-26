# Germinal RPG 3.1.3

- Host pode descrever um item em linguagem natural e usar **Criar item com IA e enviar à mochila**.
- A IA gera nome, descrição, categoria, raridade, ícone e bônus apropriados à campanha/personagem.
- O servidor sanitiza e limita atributos, cura, quantidade, valor e requisito de nível para impedir itens absurdos de quebrarem as regras.
- Itens gerados são persistidos normalmente no inventário e podem ser equipados/removidos como os demais.
- Armas, armaduras e acessórios gerados podem ser equipados; consumíveis gerados suportam cura dentro dos limites do motor atual.
- O evento administrativo registra quem recebeu o item e qual item foi criado.
- O fluxo de criação por IA não exige confirmação extra: o Host descreve, informa o motivo e envia.
