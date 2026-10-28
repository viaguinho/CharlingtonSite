# Crítica P10: sistema, fidelidade e desempenho do prontuário

- Data: 28/10/2026
- Tela: `#/pacientes/16df5f04-4169-4ac5-a458-1668c6221ec3` (Clara Macedo Farias)
- Crítico de contexto limpo. Não li críticas anteriores, registros de conflito, design-loop.md, HANDOFF.md, o histórico do git nem o cofre. Não editei código, não fiz commit e não gravei nada em `dist/`.
- A sessão foi interrompida uma vez e o scratchpad foi apagado. As medidas de desempenho abaixo são da primeira parte e foram copiadas do console antes do corte. A parte de sistema foi refeita depois.

## Método

**Desempenho, no build de produção.** `npx vite build --outDir <scratchpad>/dist-p10`, servido por `vite preview --host 127.0.0.1 --port 5199`. Usei um Chrome só meu (headless, porta 9444, perfil copiado de `.claude/design-loop/profile`) com `--host-resolver-rules="MAP localhost:5173 127.0.0.1:5199"`. Assim a página roda o JS de produção (`assets/admin-BRGVQF41.js`, conferido) na origem `localhost:5173` e lê uma **cópia** da base de verificação. A porta 9333 não foi usada para medir.

**Instrumentação.** Tudo foi injetado com `Page.addScriptToEvaluateOnNewDocument` antes da página carregar:
- gancho falso do React DevTools, para contar commits;
- embrulho de `IDBObjectStore`/`IDBIndex` `get`/`getAll`/`openCursor`/`count`, para contar leituras e saber se usam índice;
- contador de `crypto.subtle.decrypt`;
- contador de `gl.clear` no canvas `.an-canvas`, que dá os quadros da cena;
- registro dos contextos WebGL criados;
- `PerformanceObserver('longtask')`.

**GPU.** `Tracing` com `toplevel`. Somei `ThreadControllerImpl::RunTask` das threads `CrGpuMain` e `VizCompositorThread` do processo da GPU em janelas de 4 s, em ms por segundo. A thread principal foi medida do mesmo jeito em `CrRendererMain`. Os fps vêm de um laço de rAF medido numa janela separada, para não sujar a medida da GPU. A CPU foi limitada com `Emulation.setCPUThrottlingRate` 1 e 4.

**Base pesada.** Acrescentei 300 consultas e 150 evoluções **só em memória**: entram no resultado de `IDBIndex.getAll('pacienteId')` e são "decifradas" por um embrulho de `crypto.subtle.decrypt`, a partir de um registro real usado como molde. Qualquer `put`/`add`/`delete` de id falso, e qualquer escrita em agendamentos ou evoluções durante o teste, lança erro. O app tentou **0** escritas.

**Sistema.**
- Medi 5 larguras (1440×900, 1280×800, 1024×768, 768×1024, 390×844) × visão geral + 8 painéis.
- Contraste por pixel: tirei uma captura com todo o texto transparente e comparei a cor computada de cada retângulo de texto com cada pixel do fundo real. Uso o 5º percentil. Para marcas de dado, comparei a cor da marca com um anel de 3 px em volta dela.
- Alvos: sondei a área real de clique com `elementFromPoint` a partir do centro, com toque emulado até 1024 px.
- Também verifiquei forced-colors e reduced-motion (por `Emulation.setEmulatedMedia`) e o comportamento em janela baixa (1280×480).

**Capturas.** `node .claude/design-loop/cdp.mjs shot` e capturas da instância própria, em `.claude/design-loop/shots/prontuario-p10/`:
- `v-*`: visão geral;
- `p-*`: painéis;
- `m-*`: celular e tablet, com movimento reduzido;
- `fc-*`: forced-colors;
- `h-1440-hover.png` e `h-1440-popover.png`;
- `b-1280x480-*`: janela baixa.

## O que não consegui testar

- **A imagem da Quantis não está no disco.** Nenhum arquivo em `.claude/design-loop/refs/` é a Quantis (Dribbble 27474777). Comparei com a descrição do guia §2/§3, com a régua `bar.md` e com a referência clara mais próxima que existe, `refs/03-aihealth/` ("Biomechanics AI", modelo anatômico translúcido com cards brancos).
- **GPU real.** É Chrome headless: os ms/s absolutos são aproximados. As comparações entre cenários na mesma instância valem.
- **O tique de 60 s** foi disparado pelo `visibilitychange`, que chama o mesmo `setTick`. Não esperei o intervalo real.
- Não testei iPad físico, leitor de tela nem os modais Documento e Remarcar. Não abri nada que grave.
- **Capturas que faltaram.** O lote do `cdp.mjs` foi cortado em 768×1024: faltam alguns painéis nessa largura em `p-*`. As medidas de sistema dessas larguras foram feitas na instância própria.

## Tabela de medidas

### Abertura do prontuário (lista de Pacientes → prontuário, 1440×900)

| Abertura | CPU | Dados na tela | Palco pronto | Tarefas longas | TBT | Commits |
|---|---|---|---|---|---|---|
| 1ª da sessão | 1× | 346 ms | 840 ms | 89, 79 ms | 68 ms | 16 |
| 2ª | 1× | 30 ms | 84 ms | — | 0 | 9 |
| 3ª | 1× | 28 ms | 93 ms | — | 0 | 11 |
| 1ª da sessão | 4× | 416 ms | 1258 ms | **385**, 61 ms | 346 ms | 14 |
| 2ª | 4× | 123 ms | 324 ms | 56, 50 ms | 6 ms | 9 |
| 3ª | 4× | 96 ms | 255 ms | — | 0 | 9 |

Perfil de CPU da 1ª abertura a 4× (tarefa de 401 ms, um *microtask checkpoint*):
- ~260 ms de tempo próprio no grafo do plexo (`plexoData`, vizinhança por hash espacial);
- 58 ms em `_stepLift`, que lê `canvas.clientHeight` a cada quadro;
- 75 ms no centramento da faixa de consultas.

Na 2ª abertura o plexo sai, porque o cache por sessão funciona. Sobram `_stepLift` (75 ms) e o centramento da faixa (25 ms).

### Leituras de banco por abertura (iguais nas 3)

16 leituras:
- 1 `get` do paciente;
- 1 `get` por responsável da ficha (Clara tem 1);
- 8 `index('pacienteId').getAll(IDBKeyRange.only(id))`;
- 6 `get` em `anexosBinarios` (miniaturas).

**Nenhum `getAll` sem índice.** São 38 decifragens por abertura.

### GPU, thread principal e quadros (janelas de 4 s)

| Cenário | GPU 1× | GPU 4× | Principal 1× | Principal 4× | Quadros da cena/s 1× / 4× |
|---|---|---|---|---|---|
| Lista de Pacientes (só o shell) | 97 | 59 | 13 | 24 | — |
| Visão geral, giro automático (14 s) | 148 | 128 | 39 | 126 | 41 / 41 |
| Visão geral parada | 100 | 88 | 11 | 24 | 0 / 0 |
| Visão geral, hover no cérebro | 148 | 169 | 159 | **615** | 58 / 55 |
| Visão geral, arrastando | 145 | 137 | 59 | 207 | 59 / 59 |
| **Painel Evoluções aberto, parado** | **257** | **290** | 11 | 60 | 0 |
| Painel Linha do tempo, rolando | 248 | 283 | 27 | 100 | 0 |
| **Painel Linha do tempo, parado** | **304** | **307** | 12 | 40 | 0 |
| Visão geral depois de fechar o painel | 126 | 96 | 12 | 26 | 0 |

- fps por rAF: 60 em todos os cenários a 1×.
- A 4×, o **hover cai para 57,8 fps**: 9 quadros acima de 25 ms em 4 s, pior quadro de 34 ms e 1 tarefa longa de 81 ms. Arrastar e o painel seguem em 60.
- Perfil do hover a 4×: `_pick → _raycastAt → Raycaster.intersectObjects` (triângulo a triângulo, sem BVH) somou 1585 ms dos 4 s, cerca de 11 ms por sondagem em 142 movimentos.

### De onde vem a GPU (1×, estilos injetados só em memória, 2 janelas cada)

| Situação | GPU ms/s |
|---|---|
| Visão geral | 119 / 127 |
| Visão geral sem o fundo animado do shell | 0,3 / 0,1 |
| Painel aberto | 347 / 334 |
| Painel aberto **sem `filter: blur(5px)` no palco** | **128 / 142** |
| Painel sem filtro, sem transform e sem opacidade no palco | 154 / 154 |
| Painel sem o véu `.pr-panel-layer::before` | 334 / 299 |
| Painel com o palco `visibility: hidden` | 136 / 161 |
| Painel sem o fundo do shell | 0,5 / 0,1 |

### Base pesada (300 consultas + 150 evoluções em memória)

| Medida | 1× | 4× |
|---|---|---|
| Abertura: dados / palco pronto | 358 / 816 ms | 598 / 1472 ms |
| Abertura: tarefas longas (TBT) | 88 ms (38) | 366, 149, 88, 77, 74 ms (**504**) |
| Cápsulas na faixa / nós no documento | 303 / 3352 (base normal: 952) | igual |
| Linha do tempo: abre / itens / "Mostrar mais" | 64 ms / 60 / 33 ms → 120 | 254 ms (94, 71) / 60 / 118 ms → 120 |
| Evoluções: abre / itens / "Mostrar mais" | 55 ms / 30 / 31 ms → 60 | 176 ms / 30 / 101 ms → 60 |
| Tique do relógio, painel aberto | 2 commits, **0 mutações** na lista | 2 commits, 0 mutações, 0 tarefas longas |
| GPU com 303 cápsulas: parada / rolando a faixa | 116 / 128 | 88 / 117 |

### Vazamentos (30 aberturas seguidas, coleta de lixo antes de cada leitura)

| Momento | Heap | Nós | Ouvintes JS | Ouvintes em `document` | WebGL vivos |
|---|---|---|---|---|---|
| Lista, antes | 4,3 MB | 2822 | 364 | 3 | 1 |
| Lista depois de #1 | 7,3 MB | 2836 | 365 | 4 | 1 |
| Lista depois de #10 | 9,1 MB | 2845 | 374 | 13 | 1 |
| Lista depois de #20 | 9,4 MB | 2855 | 384 | 23 | 1 |
| Lista depois de #30 | 9,7 MB | 2865 | 394 | **33** | 1 |

Com o prontuário aberto há sempre 2 contextos WebGL vivos (o do shell e o da cena). Cada abertura cria um contexto novo e perde o anterior por `forceContextLoss`. Nenhum aviso de WebGL no console.

### Sistema

| Medida | Resultado |
|---|---|
| Rolagem lateral (`document` e `.shell__content`), 5 larguras × 9 estados | 0 px em todos |
| Tamanhos de texto | só 11 · 14 · 22 · 32 · 52 px. Visão geral: 11/14/32/52; painéis: 11/14/22/32 |
| Contraste do texto, por pixel (5º percentil) | 0 reprovações reais. Piores: "7 arquivos" 4,81:1 (link sobre a aurora); "Ver todas" 4,97:1; "Sem desfecho registrado" 4,95–5,48:1; "F90.0" 5,16:1. A única reprovação do script (1280, Linha do tempo, 3,94:1) é um texto cortado pela borda do painel rolável: o fundo amostrado é a sombra do lado de fora. |
| Contraste das marcas de dado | todas ≥ 3:1. O único "1,0:1" é o último ponto do gráfico dentro do próprio anel. |
| z-index | só `--z-base` (painel), `--z-sticky` (barra de seções e cabeçalho do painel) e 1–3 locais dentro de contextos isolados (`.an-stage`, `.gf-root`) |
| Raio e sombra dos cards | 28 px, sem borda, elevação única `--e-glass` |
| forced-colors | cards, escalas, pastas, alertas, cápsulas, botões de vidro e painel ganham borda `CanvasText`; a pílula ativa vira `Highlight` (`fc-1440-*.png`) |
| reduced-motion | 0 quadros da cena em 3 s parados (sem giro); o painel entra sem `pr-panel-in`; as transições caem a 0,001 s |
| Janela baixa (1280×480) com o painel rolado | o cabeçalho do painel gruda com 52 px e a alergia à vista; a barra de seções fica estática |
| Alvos abaixo de 44 px com toque | 390: abas do painel (Tudo, Consultas…), Remarcar da linha do tempo, Remover anexo, Anexar arquivo e Registrar aplicação com 40 px. 1024 (toque): pílulas de seção com 40 px. |

## Vereditos por peça

| Peça | Sistema | Fidelidade | Desempenho | Veredito |
|---|---|---|---|---|
| P1 Palco anatômico e alertas | APROVA | APROVA | REPROVA (G2) | **REPROVA** |
| P2 Colunas | APROVA | APROVA | APROVA | **APROVA** |
| P3 Seções e modais | APROVA com menores | APROVA com menores | REPROVA (G1) | **REPROVA** |
| P4 Faixa de consultas e estados | APROVA | APROVA | APROVA com menor (M2) | **APROVA** |

## Achados

### BLOQUEIA

Nenhum.

### GRAVE

**G1. O desfoque do palco atrás do painel, agora quase opaco, ainda gasta ~200 ms/s de GPU.**
- Onde: `admin/styles/components/patient-record.css:243`, `.pr-grid.has-panel .pr-stage { filter: blur(5px); opacity: .8; transform: scale(.98); }`.
- Evidência:
  - painel aberto: 257–307 ms/s (1×) e 290–307 (4×), contra 88–127 na visão geral;
  - sem esse `filter`: 128–142 ms/s;
  - com o palco oculto: 136–161 ms/s.
- Por quê: o fundo do shell anima por baixo, e o compositor refaz o desfoque do palco a cada quadro, incluindo os vidros que estão dentro dele (camadas, cápsulas, alertas). O painel tem 96% de opacidade desde a passada 10, então o desfoque quase não aparece. Na captura, só o véu de 8 px em volta do painel deixa ver alguma coisa.
- Deveria: com o painel aberto, o palco não ser mais repintado com filtro. A GPU do painel deveria ficar no nível da visão geral.
- Como reproduzir: build de produção, abrir `?secao=evolucoes` e medir a GPU por 4 s; depois injetar `.pr-grid.has-panel .pr-stage{filter:none!important}` e medir de novo.

**G2. Hover no cérebro faz raycast triângulo a triângulo e derruba quadros num notebook comum.**
- Onde: `admin/modules/patients/anatomy/scene.js`, `_pick` → `_raycastAt` → `Raycaster.intersectObjects` sobre as malhas sólidas.
- Evidência:
  - a 4×, a thread principal fica em 615 ms/s;
  - houve 1 tarefa longa de 81 ms e 9 quadros acima de 25 ms em 4 s (pior de 34 ms);
  - o laço de rAF ficou em 57,8 fps e a cena em 54,5 quadros/s;
  - 1585 ms dos 4 s estão em `intersectObjects` (~11 ms por sondagem).
- Com mouse real (60–120 eventos/s, uma sondagem por quadro), a carga seria maior que a do teste (~35 movimentos/s).
- Deveria: manter 60 fps no hover a 4×, a meta do guia §4.3.
- Como reproduzir: CPU 4×, esperar o giro parar (14 s) e mover o ponteiro em círculo de 55×45 px sobre o crânio por 4 s.

### MENOR

**M1. Um ouvinte `keydown` em `document` e um canvas ficam presos a cada abertura.**
- Evidência: 3 → 33 ouvintes em `document` em 30 aberturas. Nós +1 e ouvintes JS +1 por abertura. Heap de 7,3 → 9,7 MB.
- Causa: o `keydown` do OrbitControls, registrado com `domElement.getRootNode().addEventListener`. Quando `scene.dispose()` roda, o React já desligou o canvas do documento, então `getRootNode()` não devolve mais o `document` e a remoção falha.
- Deveria: zero ouvintes a mais depois de fechar.
- Como reproduzir: abrir e fechar o prontuário 3 vezes e listar `DOMDebugger.getEventListeners(document)`.

**M2. A faixa de consultas monta todas as cápsulas, sem janela.**
- Onde: `record/VisitRail.jsx`.
- Evidência: com 300 consultas, 303 cápsulas e 3352 nós (contra 952). A abertura a 4× vai a TBT 504 ms, contra 346 ms na base normal.
- O painel já tem janela de 60/30 itens; a faixa do palco, não.

**M3. Alvos de 40 px em telas de toque.**
- A 390 px: abas do painel, Remarcar, Remover anexo, Anexar arquivo e Registrar aplicação.
- A 1024 px com toque: as pílulas de seção, que só sobem a 44 px abaixo de 768.
- Origem: `--touch: 40px` e `.pr-panel :is(.btn--sm, .btn--md) { height: var(--touch) }`. O guia §8.3 pede 44 px no celular.

**M4. A 1ª abertura da sessão trava 385–401 ms a 4×.**
- O cálculo do plexo (`plexoData`) roda na thread principal, numa tarefa só.
- O cache resolve as aberturas seguintes, mas a primeira criança do dia ainda congela a tela por ~0,4 s num notebook comum.

**M5. CSS de vidro sem efeito depois da passada 10.**
- As regras originais de `.pr-card` (l. 264–265), `.pr-folder` (l. 407–408), `.pr-scale` (l. 607–608) e `.pr-panel` (l. 799–802) declaram `backdrop-filter`. O bloco da passada 10 (l. 1352–1361) anula todas elas.
- O token `--pr-panel-glass: rgba(255,255,255,.55)` em `tokens.css:405` é sempre sobrescrito para `.96`. O comentário dele ("o busto desfocado aparece por baixo") ficou falso.
- O comentário da l. 1351 diz que "ficam com vidro… as teclas das pastas", mas as l. 1363–1364 tiram o vidro de `.gf-key--more` e `.gf-key-face`.
- As pílulas de alerta dentro do cabeçalho do painel, agora opaco, seguem com `backdrop-filter`: desfocam uma superfície lisa.
- Duplicatas na mesma folha:
  - `.pr-milestones__tally > div`, raio declarado duas vezes (l. 673–674);
  - margem de `.pr-panel__states` (l. 844 e 1338);
  - fundo de `.pr-panel` abaixo de 1024 (l. 1117 e 1342);
  - variáveis de repouso de `.pr-folder .gf-root` (l. 439–441 e 1333).

**M6. Duas cores literais novas fora de `tokens.css`.**
- `patient-record.css:1353` (`rgba(255,255,255,.96)` e `.9` no `--card-glass` local) e `:1358` (`--pr-panel-glass` local).
- O guia §0.3 diz que cor nova vira token com prefixo `--pr-*`.

**M7. O véu forma uma moldura cinza em volta do painel opaco, e o cabeçalho tem tom próprio.**
- `.pr-panel-layer::before` (inset −8 px, `--pr-stage-veil`) deixa uma faixa cinza de 8 px ao redor do painel, com a matriz de pontos aparecendo: pixel (233,234,235) contra (241,242,242) do fundo. Lê como caixa atrás de caixa.
- O cabeçalho grudado usa `--pr-panel` sobre `--surface`, pixel (250,250,252), contra (254,254,255) do corpo. São dois brancos na mesma folha.
- Captura: `p-1440x900-evolucoes.png`.

**M8. A 1024 px com o painel aberto, a alergia aparece duas vezes, a 80 px uma da outra.**
- Uma vez na faixa da barra de seções, outra no cabeçalho do painel.
- Numa janela de 768 px de altura com o dock no pé, o cabeçalho, os estados e o título tomam ~210 px e sobra uma linha de conteúdo (`p-1024x768-evolucoes.png`).
- Não peço que a alergia saia de nenhum lugar onde a regra exige que ela fique. O registro é só da redundância.

**M9. As abas do painel no celular cortam a última palavra ("Exa…") sem esmaecer a borda.**
- O contêiner `.tabs` rola (`scrollWidth` 411 contra 318 de largura útil na Linha do tempo; 564 contra 318 em Marcos), mas não tem máscara.
- As pílulas de seção já ganharam a pista de rolagem; as abas do painel, não.

**M10. Rótulo da régua de Escalas hifenizado em 3 linhas a 390 px.**
- "Sintomas significati-vos": `hyphens: auto` num rótulo de 77 px (`m-390x844-escalas.png`).

**M11. Espaçamentos soltos fora da escala de 4 px em `anatomy.css`.**
- Exemplos: `.an-popover { padding: 14px 10px 10px 18px }`, `.an-loading { gap: 10px; padding: 0 16px }`, `.an-pin__label { padding: 3px 10px }`, `.an-list { padding: 6px }`.
- Não usam `--s-*`. Ainda há `font-size: 14px` cru em `glass-folder.css:266`.

## Suspeitas (não comprovadas como problema)

- `_stepLift` e `_inset` leem `canvas.clientHeight` a cada quadro, mesmo sem nada em foco. Na montagem isso aparece como tempo de layout forçado (58–75 ms de tempo próprio a 4×). Em regime, com o layout limpo, não medi custo.
- A GPU da visão geral (~100 ms/s) vem toda do fundo animado do shell: cai a 0,3 ms/s sem `.shell__bg`. Fica fora de escopo, mas multiplica o custo de qualquer filtro na página (G1).
- A diferença entre "visão geral parada" (100) e "depois de fechar o painel" (126) a 1× não se repetiu a 4× (88 contra 96). Tomo como variação.

## O que está bom

- **Banco.** As 8 leituras por paciente usam o índice `pacienteId`. Os responsáveis vêm por `get` dos ids da ficha. Nenhuma leitura da loja inteira.
- **Cache do plexo.** Funciona: 2ª e 3ª aberturas sem tarefas longas a 1× e com TBT 0–6 ms a 4×.
- **Listas longas.** As janelas de 60/30 itens e o "Mostrar mais" funcionam. O tique do relógio não refaz nenhuma lista (0 mutações), em nenhum dos dois painéis.
- **Contextos WebGL.** Nenhum vazamento em 30 aberturas.
- **GPU em repouso.** O prontuário parado custa ~0 de GPU. A passada 10 tirou de fato o custo dos cards, das pastas e das escalas.
- **Movimento.** A renderização é sob demanda. O giro automático para em 14 s e roda a ~41 quadros/s; arrastar fica em 59–60 fps mesmo a 4×.
- **Responsivo.** Nenhuma rolagem lateral em 45 estados. A escala tipográfica está rígida em 11/14/22/32/52. Todo texto passa de 4,5:1 por pixel, inclusive sobre o palco. Todas as marcas de dado passam de 3:1.
- **forced-colors, reduced-motion e janela baixa** se comportam como a regra pede.
- **Fidelidade.**
  - O painel quase opaco lê como parte do mesmo sistema: mesmo branco, raio de 28 e sombra longa dos cards da coluna. Ficou mais perto da referência clara (`refs/03-aihealth`, cards brancos opacos com o corpo translúcido ao centro) do que o vidro de antes. A hierarquia do painel (título 22, contagem, ação preta à direita, linhas com separador de 1 px) é a mesma nas 8 seções.
  - O que flutua sobre o palco continua de vidro: alertas, camadas, cápsulas e controles (régua §5).
  - O popover do lobo frontal tem uma estrutura sólida só, a cor vazando pela esquerda, o pino com anel e as ligações reais com exames (`h-1440-popover.png`).
  - Medidas da régua a 1440: palco com 43,8% da largura útil (576 de 1316 px); número da escala com 52 px de peso 300 contra título de 14 (3,7×); nenhum azul preenchido na primeira dobra fora do modelo.
