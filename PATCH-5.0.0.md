# Germinal RPG 5.0.0 — Sandbox Vivo

Esta versão é uma evolução direta do Germinal 4.2.1/Groq. O objetivo é tirar o projeto do modelo “chat que narra RPG” e aproximá-lo de um **motor de RPG multiplayer persistente**, no qual o servidor é a autoridade das regras e a IA é narradora/intérprete.

## Mudanças principais

### 1. Proprietário, Mestre e IA agora são papéis diferentes

- `ownerId`: proprietário do servidor/campanha, responsável pelas chaves e backups.
- `masterUserId`: jogador que está conduzindo a sessão naquele momento.
- IA narradora: serviço separado, sem autoridade para sobrescrever resultados mecânicos.
- O proprietário pode transferir o papel de Mestre para qualquer membro da campanha.
- O novo Mestre pode pausar, retomar, fechar turnos e tentar novamente a IA.
- Transferir Mestre **não move o Termux, não copia o banco e não expõe chaves de API**.
- O proprietário pode retomar o papel a qualquer momento.

### 2. Drop-in / drop-out de verdade

- Entrada tardia continua permitida quando configurada.
- Jogadores podem marcar-se como **ausentes temporariamente**.
- O personagem, inventário, XP, relações e memória permanecem intactos.
- O jogador ausente deixa de bloquear o turno quando a regra da campanha permite.
- Ao voltar, ele é reinserido de forma segura em um turno ainda vazio ou no turno seguinte.

### 3. Ações não são mais aceitas porque o jogador pediu

Foi adicionado `resolveActionCheck()` para ações sociais, investigativas e criativas.

Resultados possíveis:

- `critical_success`
- `success`
- `partial`
- `failure`

A chance considera atributos da ficha, sorte, dificuldade e perigo da região. O jogador pode tentar algo absurdo ou improvável, mas a frase digitada não cria automaticamente o resultado desejado.

Exemplo: “Procuro uma espada lendária atrás da árvore” não cria uma espada. O servidor resolve a tentativa e só a narrativa descreve o resultado que já foi decidido.

Interações sociais também podem falhar e piorar uma relação. Investigações podem não revelar informação confiável. Sucesso parcial cria custo, risco ou escolha difícil.

### 4. Diretor do mundo sem evento garantido

O antigo comportamento que podia forçar um acontecimento após muitos turnos foi removido.

- Chance de eventos cresce com tensão e silêncio do mundo.
- Mesmo em situação caótica, ela é limitada abaixo de 100%.
- Eventos continuam sendo sorteados e persistidos antes da IA narrar.
- Retry da IA reutiliza o mesmo mundo e os mesmos resultados.

### 5. Relógios de mundo

Adicionados relógios persistentes para ameaças, facções e mudanças de cenário.

Relógios iniciais:

- **Instabilidade dos Selos** — 8 segmentos.
- **Rotas Inquietas** — 6 segmentos.

Eventos novos:

- `WORLD_CLOCK_ADVANCED`
- `WORLD_CLOCK_COMPLETED`

Os relógios podem avançar sem depender diretamente de uma ação do jogador, permitindo que o mundo mude enquanto o grupo explora outras coisas.

### 6. Memória com grau de verdade

Fatos da memória agora podem carregar:

- `FACT`
- `CLAIM`
- `RUMOR`
- `HYPOTHESIS`

Também existe `source`.

Isso impede que uma fala de NPC do tipo “o rei é um dragão” seja automaticamente transformada em verdade canônica. A IA recebe instruções para respeitar essa distinção.

### 7. 16 classes + especializações

Classes disponíveis:

1. Guerreiro
2. Espadachim
3. Mago
4. Arqueiro
5. Assassino
6. Sacerdote
7. Cavaleiro
8. Invocador
9. Alquimista
10. Artífice
11. Druida
12. Monge
13. Ocultista
14. Bardo
15. Runista
16. Domador

Cada classe tem:

- quatro habilidades autoritativas, desbloqueadas nos níveis 1, 3, 6 e 10;
- duas especializações no nível 5;
- atributo principal e recurso próprios;
- cooldown, custo, alcance/categoria e progressão controlados pelo servidor.

### 8. Fallback automático de IA

Uma campanha pode configurar um **provedor reserva**.

Fluxo:

`resultado mecânico selado -> IA principal -> falhou -> IA reserva -> mesma mecânica, nova narrativa`

- Nenhum dado é rerrolado.
- Nenhum evento do mundo é recalculado.
- Nenhuma ação é aberta novamente.
- O evento `AI_PROVIDER_FALLBACK` fica registrado no histórico.
- Se os dois provedores falharem, o turno volta para `WAITING_FOR_AI` com o estado preservado.

Isso permite, por exemplo, usar Groq como principal e OpenRouter/Gemini como reserva, desde que as respectivas chaves estejam configuradas.

### 9. Login e segurança

A base já usava senha com hash, cookies de sessão, proteção de origem e limite de tentativas. A 5.0 adiciona:

- troca de senha pelo perfil;
- exigência da senha atual;
- revogação automática das outras sessões após trocar a senha;
- botão para encerrar todas as outras sessões manualmente;
- contador de sessões ativas no perfil;
- a sessão atual permanece conectada.

### 10. Interface mobile

- Mostra claramente proprietário e Mestre atual.
- Permite transferir e retomar autoridade.
- Mostra ausentes e presença do grupo.
- Relógios do mundo aparecem na tela de aventura.
- Configuração de IA ganhou provedor reserva.
- Perfil ganhou painel de segurança.
- Novas microanimações para mudança de Mestre, presença online e relógios, respeitando `prefers-reduced-motion` e modo leve.
- Mantidos modo leve, `prefers-reduced-motion`, PWA e proteção contra rerender enquanto o teclado Android está ativo.

## Compatibilidade e dados

- `package.json`: 5.0.0.
- Banco: schema 9.
- Migração é aditiva.
- Antes de migrar banco antigo, o servidor cria `data/germinal.json.pre-v9`.
- ZIP de distribuição não deve conter banco real, chaves, `.env` ou `server.key`.

## Validação

Resultado final da suíte automatizada:

**77/77 testes aprovados.**

A suíte cobre autenticação, campanha, WebSocket, persistência, cofre de chaves, motores de combate/exploração, memória longa, falhas de API, Groq, OpenRouter, mundo vivo, entrada tardia, ausência temporária, transferência de Mestre, resolução anti-sycophancy, relógios, fallback de IA e segurança de sessões.

## O que NÃO foi fingido como pronto

A 5.0 não cria um APK nativo. O projeto continua como servidor Node.js + PWA mobile-first. Isso é intencional: estabilizar o motor e os contratos de rede antes de duplicar manutenção em um cliente Android nativo.

Também não foi criado um sistema econômico/crafting completo nesta versão. A arquitetura já possui recursos coletáveis, inventário, itens e mundo persistente, então economia, receitas, mercados e facções comerciais podem entrar como módulo seguinte sem dar à IA autoridade sobre o inventário.
