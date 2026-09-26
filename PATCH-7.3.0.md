# Eidryss 7.3.0 — Caminhos Velados

## Interface

- A barra inferior agora contém Aventura, Herói, Códice, Arsenal e **+ Mais**.
- O botão + gira ao abrir e apresenta Evolução, Classes, Mundo, Atlas, Diário, Grupo, Crônica e Ajustes em um drawer lateral; em celular ele vira uma folha inferior.
- O banner da cena ganhou zonas de conteúdo explícitas e reserva de espaço para o orbe de turno. O aviso do prólogo deixou de ser absoluto, eliminando texto escondido atrás dos controles.
- Modos leve, redução de movimento e safe areas do Android continuam respeitados.

## Caminhos individuais e distância

- Cada personagem possui `location` e `knownNpcIds` persistentes.
- Viagens são validadas pelo servidor contra os nós conhecidos e as conexões do Atlas.
- Jogadores podem viajar separadamente; a ficha do grupo mostra a localização de cada um.
- Alvos, inimigos, NPCs e conversas são filtrados pela localização do personagem.
- NPC distante permanece no diário, mas o botão de conversa é substituído por um bloqueio de distância.
- Recursos de outra localidade não são exibidos nem coletados por engano.

## Relações pessoais

O valor escalar legado foi migrado para uma ficha por NPC e personagem:

```text
affection · trust · suspicion · lastInteractionTurn · history
```

Os três eixos são alterados por teste social autoritativo, tom da abordagem e consequência. A IA recebe os números como estado; ela não decide os valores.

## Ação secreta

- Pode ser escrita no campo próprio ou depois de `Ação secreta:` no campo normal.
- A ação normal fecha o turno como antes; o segredo não aumenta o número de jogadores esperados.
- O motor resolve a tentativa secreta no servidor em uma fase privada, com as mesmas limitações de poder, custo, alcance, distância e PvP.
- A IA recebe um prompt compacto de 120–260 palavras, contendo somente personagem, local, NPCs presentes, resultado mecânico e memória relevante.
- Narrativa, intenção, resultado e eventos secretos são visíveis somente ao autor nas APIs de estado e histórico.
- O banco continua sendo a fonte de verdade; a narrativa secreta não pode inventar mudanças materiais.

## Economia de API e retry

- Sem ação secreta: nenhuma chamada extra.
- Com ação secreta: uma chamada curta adicional por jogador que usar o recurso.
- A narrativa compartilhada válida é armazenada no staging antes das cenas privadas.
- Se a chamada secreta falhar, retry reutiliza a narrativa compartilhada e os resultados mecânicos; somente a parte faltante é chamada novamente.
- Trocar a API durante a falha funciona sem rerrolar dados ou perder o turno.
- O prompt compartilhado contém apenas localidades ocupadas e reduz inventário/poderes aos recortes úteis.

## Persistência e compatibilidade

- Banco atualizado para schema 12.
- Antes da migração, o arquivo original é copiado para `.pre-v12`.
- Campanhas antigas recebem localização inicial e NPCs conhecidos sem perder turnos, personagens ou chaves.
- Relações numéricas antigas são convertidas sem descarte.
- Campos de staging nunca entram no backup exportado.
- Client revision 730; o APK atual pode carregar a interface nova sem reinstalação.

## Testes

Foram adicionados testes de isolamento entre contas, ação secreta por sintaxe textual, retry sem chamada compartilhada duplicada, caminhos individuais, distância de NPC, migração e componentes mobile.
