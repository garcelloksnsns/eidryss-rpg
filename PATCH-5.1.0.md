# Germinal RPG 5.1.0 — Interface RPG de verdade

Esta versão corrige o principal problema visual da 5.0: muitos sistemas existiam no motor, mas estavam escondidos em selects, details e telas herdadas da 4.x.

## Mudanças visíveis

- nova aba **Classes** na navegação principal;
- catálogo visual com **24 classes**, busca, filtro Físico/Mágico, descrições, especializações e progressão de habilidades;
- escolha de classe direto pelo cartão quando o personagem ainda não confirmou uma classe;
- Status agora mostra um cartão grande da classe atual com atalho para explorar o catálogo;
- tela Grupo virou uma **Central multiplayer**, mostrando Mestre atual, presença, transferência de mestragem, entrada tardia, continuação com ausentes, eventos, memória, fallback de IA e estado do mundo;
- relógios do mundo aparecem também na Central multiplayer;
- login/lobby identificam claramente **Germinal 5.1**;
- nova animação do orbe de classes e microinterações, respeitando modo leve/redução de movimento;
- cache do PWA atualizado para `v510` e registro do service worker corrigido para não manter a interface 4.x/5.0 por engano.

## Novas classes

Além das 16 anteriores: Necromante, Feiticeiro, Ladino, Pistoleiro, Xamã, Cavaleiro Mágico, Cronomante e Ilusionista. Todas seguem o mesmo contrato de 4 técnicas (níveis 1, 3, 6 e 10) e 2 especializações no nível 5.

## Compatibilidade

Campanhas existentes continuam carregando. Personagens que já confirmaram uma classe mantêm a classe e progressão atuais; o catálogo completo continua visível em modo de prévia.
