# Eidryss 7.2.0 — Horizonte Vivo

Atualização de interface, mundo procedural e usabilidade mobile. O objetivo desta versão é aprofundar sistemas existentes sem remover mecânicas da 7.0/7.0.1.

## Interface pessoal por jogador

- Novo botão de configurações pessoais acessível dentro de qualquer campanha.
- Preferências são salvas na conta do jogador no servidor e não afetam os colegas.
- Cinco perfis de desempenho: Automático, Cinemático, Equilibrado, Leve e Ultra leve.
- Controle independente de animações, densidade, tamanho do texto, detalhe do mapa e efeitos ambientais.
- Modo leve mantém layout e identidade, mas corta blur, sombras e animações caras.
- Modo Ultra leve remove efeitos decorativos pesados e prioriza estabilidade.
- Listas longas usam `content-visibility` para reduzir custo de renderização no WebView.

## Aventura e narrativa

- Tela principal redesenhada com HUD de cena, clima, horário, ameaças e estado do turno.
- Missão acompanhada aparece no topo da aventura.
- Radar compacto mostra a pressão atual de eventos sem prometer que algo vai acontecer.
- Narrativa ganhou superfície própria, largura de leitura controlada e separação em parágrafos.
- Perfis narrativos permanecem razoáveis: Balanceado ~300–520 palavras, Cinematográfico ~520–900, Épico ~850–1400.

## Atlas Vivo 2.0

- Mapa deixou de ser apenas pontos e linhas.
- Dez locais-base com bioma, categoria, perigo, ícone, descrição e posição.
- Terreno ilustrativo vetorial, rio, relevo, trilhas, rotas curvas e bússola no modo Rico.
- Modos Rico, Padrão e Mínimo por jogador.
- Nó atual pulsa; rotas alcançáveis ficam destacadas.
- Cartões de rota mostram risco e se o local já foi visitado.
- Fronteiras desconhecidas são contadas sem revelar locais ainda não descobertos.
- Migração preserva mapas antigos, local atual e locais visitados.

## Missões e diário

- Missões agora têm tipo, categoria, risco, origem, objetivos estruturados, progresso e recompensa.
- Filtros: Ativas, Concluídas e Todas.
- Jogador pode fixar uma missão para acompanhar na tela principal.
- Objetivos suportam viagem, descoberta, conversa, derrota e eventos.
- Ganchos procedurais podem criar missões de rumor persistentes.
- Conclusão gera eventos próprios e recompensas autoritativas de XP e Coroas.

## Eventos contextuais

- Eventos aleatórios agora podem acontecer durante exploração, viagem e combate.
- Durante combate, ruído/tensão podem atrair uma nova criatura como reforço.
- Durante viagem podem aparecer rastros, viajantes, clima, ruínas fora da rota ou ameaças.
- Eventos ambientais de combate podem alterar o contexto da cena sem obrigatoriamente criar outro inimigo.
- Chance pública é limitada a 90%; evento nunca é garantido só porque a tensão está alta.
- O servidor decide o evento primeiro; a IA recebe o resultado e apenas narra.

## Mundo vivo

- Relógios continuam progredindo como ameaças e projetos do cenário.
- Central de mundo agora mostra radar de eventos, relógios, facções, NPCs, missões e atlas em conjunto.
- Director de mundo usa contexto de viagem/combate/exploração para escolher eventos.
- Até três hostis podem coexistir, permitindo reforços sem virar enxame infinito.

## Persistência e compatibilidade

- Schema do banco: 11.
- Migração adiciona preferências pessoais sem apagar usuários, campanhas ou personagens.
- Banco persistente continua em `~/.eidryss/` no Termux.
- Antes de migrar banco antigo é criado backup `.pre-v11`.
- Client revision: 720.
- Service Worker/cache atualizados para v720.
- Não exige APK novo: esta versão altera servidor/interface carregada pelo APK atual.

## Validação

- 101/101 testes automatizados aprovados.
- Simulação adicional: 4 jogadores, 3 turnos completos, exploração, combate, coleta, descanso e interação social.
- `node --check` aprovado nos principais arquivos JavaScript alterados.
