# Crítica P12: sistema de design, fidelidade e desempenho

Crítico de contexto limpo, passada 12, 03/11/2026. Julgo e não corrijo. Não li as críticas anteriores, os registros de conflito, o `design-loop.md`, o `HANDOFF.md`, o histórico do git nem o cofre.

## Veredito

| Peça | Veredito | Por quê |
|---|---|---|
| P1 Palco anatômico e alertas | **REPROVA** | G1: fechar o popover aberto com o mouse abre a lista de estruturas sobre o palco e acende uma estrutura que ninguém escolheu. G2: com 3 ou mais estados, o texto do resumo de estados sai da pílula de vidro. O resto passa: plexo, hover, uma estrutura por vez, vidro legível (≥ 5,4:1 medido por pixel) e palco sem custo em repouso. |
| P2 Colunas | **APROVA** | Tudo medido passa: ordem Perfil → Pastas → Diagnósticos, cards opacos de raio 28, card de escala no padrão do biomarcador e pasta com 85% da largura do card. Sobram só menores (M3, M4, M5, M11). |
| P3 Navegação e seções | **REPROVA** | G3: ficha, documento e remarcação levam de 325 a 415 ms para aparecer na primeira abertura, por causa do atraso fixo de 300 ms do Suspense do React. A segunda abertura leva de 11 a 47 ms. Pílulas, `?secao=`, Esc, voltar do navegador, foco, inércia e as 8 seções nas 5 larguras não têm estouro, corte nem rolagem lateral. |
| P4 Faixa de consultas e estados | **APROVA** | Faixa única, 2 itens de texto por cápsula, traço de hoje 1×32 px e base alinhada com os controles (842 = 842 px). Os estados vazio, leitura que falhou, 300 consultas, sem WebGL e janela baixa estão certos. Sobra M1 (cápsula cortada a 1280). |

**Nota de fidelidade: 8,0/10.** Seis mecanismos cumprem e um é parcial (o nº 6, o leque das pastas). Não houve comparação lado a lado: a captura da Quantis não está em `.claude/design-loop/refs/`, que só tem outras referências (Callivio, Ledgerix, Veri, Luma, Modern CRM etc.). Julguei pela régua `bar.md` e pelo guia §2.

**Contagem:** BLOQUEIA 0 · GRAVE 3 · MENOR 11.

---

## Método

- **Build de produção:** `npx vite build --outDir <scratchpad>/dist-p12 --emptyOutDir`, que passou sem erro em 5,8 s. Usei esse build para medir o tamanho dos pedaços. Para medir em tempo de execução, fiz um segundo build idêntico em `<scratchpad>/dist-p12i`, com uma linha a mais injetada por plugin só no scratchpad: ela expõe `useAdapter`/`mode` do repositório em `window`. Nenhum arquivo do projeto foi alterado. Servi esse build com `vite preview` em `127.0.0.1:5199`.
- **Navegador:** Chrome 156 headless próprio, na porta 9555, com o perfil copiado de `.claude/design-loop/profile` (sem caches e sem travas). A GPU é real: `ANGLE Metal, Apple M2`. As capturas foram feitas por CDP direto. Não usei as portas 9333 e 9444.
- **Base em memória, sem senha.** A base do perfil é cifrada com a senha, e a regra é não digitar senha. Por isso não copiei as lojas reais: reconstruí a clínica de verificação **em memória**, rodando a mesma lógica de `seed-verificacao.js` (sem financeiro e insumos) e de `seed-prontuario.js`. Resultado: 42 pacientes, e a Clara (Clara Macedo Farias) com o id `16df5f04-…`, alergia a dipirona, G40.9 e F90.0, 3 escalas (7 aplicações), 2 medicações, 4 marcos, 7 anexos (6 imagens desenhadas em canvas e 1 PDF) e 3 consultas.
  - O adapter em memória (`mode() === 'memoria'`, conferido) imita o `idb-adapter`: guarda envelopes cifrados em AES-GCM com uma chave gerada na hora, filtra pelos campos em claro e decifra cada registro com `crypto.subtle.decrypt`. Assim o custo e a contagem de decifragens são os do caminho real. A troca de adapter acontece antes da primeira escrita.
  - A sessão entra pelo estado do `SessionProvider` (`status`, `user`, `plaza`, pela fibra do React), não pela tela de login.
  - Nada foi gravado no IndexedDB: o contador de requisições reais de IDB ficou em zero. Nenhum botão que grava foi clicado.
- **Instrumentação na página, antes de qualquer script:**
  - gancho do React DevTools, para contar commits;
  - `longtask` e `long-animation-frame`;
  - contagem de `SubtleCrypto.decrypt` e de requisições de IDB;
  - contagem de quadros por canvas WebGL: o palco (`.an-canvas`) separado do fundo do shell;
  - registro dos ouvintes `keydown`;
  - contextos WebGL vivos.
- **Tracing** (`toplevel`, `gpu`, `viz`, `devtools.timeline`): soma das tarefas de nível superior por thread, em ms por segundo. Medi com `Emulation.setCPUThrottlingRate` em 1 e em 4.
- **Fidelidade por pixel:**
  - busto isolado: captura com tudo escondido menos o canvas e fundo transparente, depois a caixa do alfa;
  - contraste do texto sobre o vidro do palco: pixel de fundo real na caixa de cada texto, sem os pixels de antisserrilhado; reporto a mediana e o 10º pior percentil.
- **Varredura:** 6 tamanhos (1440×900, 1920×1080, 1280×800, 1024×768, 768×1024 com toque e 390×844 celular). Em cada um, a visão geral e os 8 painéis (a 1920, só a visão geral): 46 estados. Em cada estado medi rolagem lateral, estouro, texto cortado, tamanhos de fonte, contraste calculado, alvos, vidro, azul preenchido, sobreposição e alergia visível.
- **Scripts e capturas** ficam em `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/b66e8cad-c129-42d0-8ba7-78e62caa1819/scratchpad/p12/`: `lib.mjs`, `instrument.js`, `setup-mem.js`, `audit.js`, `sweep.mjs`, `perf.mjs`, `pixels.mjs`, `states.mjs`, `focus.mjs`, `nav.mjs`, `g1.mjs`, `summary.mjs` e as capturas em `shots/`.

### O que não consegui testar

- **Comparação lado a lado com a Quantis:** não há captura dela em `refs/`.
- **A base real da Clara:** está cifrada e exige senha. Usei a reconstrução em memória a partir dos scripts de semeadura, com a mesma forma de dado. Os números de "leituras de IndexedDB" são as chamadas ao adapter, que no `idb-adapter` viram 1 requisição cada, não a latência real de disco.
- **GPU integrada de notebook:** a máquina é um M2. Os tempos de GPU tiveram **ruído alto** (±100 ms/s entre execuções iguais): havia outro Chrome headless (porta 9444) usando a mesma GPU. Reporto as faixas, e o efeito do vidro ficou inconclusivo, exceto o fato de que sem o fundo do shell tudo cai para cerca de 3 ms/s.
- **Gestos reais de toque** (pinça, giro com um dedo) e aparelho físico: só emulei toque.
- **Latência de rede dos pedaços sob demanda:** o servidor é local.
- **Leitor de tela e impressão.**
- **Ações que gravam** (salvar ficha, emitir, remarcar): proibidas pela regra.

---

## 1. Fidelidade: os 7 mecanismos de `bar.md`

| # | Mecanismo | Resultado | Medida |
|---|---|---|---|
| 1 | Anatomia é o maior objeto | **cumpre** | A 1440, o palco tem 576 px de 1316 úteis (**43,8%**) e o busto ocupa **83,5%** da altura do palco. A 1920, o palco tem 1056 px (**58,8%**) e o busto **87,3%**. O palco não tem fundo nem moldura, e o modelo fica direto sobre a matriz de pontos. |
| 2 | Plexo legível, uma estrutura por vez | **cumpre** | Em repouso, só 4,3% dos pixels do busto passam de alfa 150 (são os nós), sem nenhuma área preenchida, e as linhas WebGL têm 1 px (DPR 1). No hover do Lobo frontal direito, 38% dos pixels ficam opacos e azuis, e o resto recua (pixels visíveis caem 45%). |
| 3 | Card de medida no padrão do biomarcador | **cumpre** | O número tem 52 px contra 14 px do título (**3,71×**), peso 300 e a unidade "/54" em 14 px `--ink-500` colada ao número (vão de 2 px). Há o traço de 2×14 px na cor do risco e o gráfico de pontos com faixa tingida, linha-limite de 1 px e anel no último ponto. A nota ocupa 1 ou 2 linhas. |
| 4 | Um acento só | **cumpre** | Na dobra de 1440 e de 1920, em repouso, não há **nenhum** preenchimento azul no prontuário: o único é o item ativo do dock, que está fora de escopo. A estrutura em foco soma 1 no hover, e a pílula "Próxima" soma 1 quando a coluna rola. Vermelho, âmbar e verde aparecem só como estado. |
| 5 | Tudo que flutua sobre o palco é vidro | **cumpre** | Têm desfoque de 16 px a pílula de alerta, a barra de seções e o popover. Têm desfoque de 8 px as cápsulas, as camadas e os controles. O contraste no vidro, medido por pixel, vai de **5,4:1** ("Alergias", o pior caso) a 17:1. Os cards têm raio 28 e nenhum soma borda de 1 px a sombra larga. O defeito de vazamento do resumo de estados está em G2. |
| 6 | A pasta é o herói | **parcial** | A pasta tem 140 de 164 px do card (**85%**; 61% a 768) e é reconhecível como pasta, com aba e frente. O rótulo "3 arquivos" fica na frente, e o título e a data ficam no topo com `↗`. O leque é fraco: as folhas sobem só **14 px** acima da frente, abrem 19–23 px, e as miniaturas escuras viram faixas pretas. No PDF, a folha branca quase some sobre o fundo claro (M4). |
| 7 | Base do palco em faixa única | **cumpre** | É uma fileira só, com 2 itens de texto por cápsula e o traço de hoje de 1×32 px. Os controles `+ − 3D` são quadrados de 44×44 em vidro, com a mesma linha de base das cápsulas (842 px = 842 px) e 16 px da borda direita. A 1280 a primeira cápsula aparece cortada (M1). |

---

## 2. Sistema

| Critério | Resultado | Medida e evidência |
|---|---|---|
| Hexadecimal fora de `tokens.css` | passa | Nenhum em `patient-record.css`, `anatomy.css`, `glass-folder.css`, `record/*`, `anatomy/*` e `GlassFolder.tsx`. |
| Tokens em vez de valores soltos | **falha parcial** (M7) | `anatomy.css` tem 33 declarações de espaçamento em px cru, várias fora da escala de 4 (10, 6, 18, 3). `patient-record.css` tem 12. Há z-index cru (1 e 2) em `patient-record.css:839, 1308, 1309, 1327`, além de `font-size: 14px` e durações cruas (`.35s`, `.6s`, `.7s`, `.12s`) em `glass-folder.css:266, 280`. |
| Escala de z-index | passa, com ressalva | O global usa `--z-sticky` e `--z-drawer`, e o palco usa tokens locais (`--an-z-*`) dentro de `isolation`. As ressalvas são os valores crus de M7. |
| Alvos ≥ 40 px nos controles principais | passa | Nenhum alvo menor que 40 px sem área de 44 px em 46 estados. "Ver dados" (63×24) e "escolha do computador" (146×21) têm área de 44 px por `::after`. |
| Fontes (nada principal < 12 px; até 4 tamanhos) | passa, com ressalva | Visão geral em 11 · 14 · 32 · 52 e painéis em 14 · 22, mais 11 e 32 em Escalas. O micro de 11 px aparece fora das exceções em M6. |
| Contraste AA | passa | Calculado: nenhum texto abaixo de AA em 46 estados (o falso positivo de `.btn` está fora de escopo). Por pixel sobre o palco: mínimo de 5,4:1. Popover: 6,0 a 17:1. Crédito: 9,6:1. |
| Anel de foco visível | passa | 69 paradas de Tab, todas com anel dentro do prontuário: outline de 2 px em `--blue-500`, anel na pasta por `:has()` e traço de 2 px na opção ativa da lista. |
| Raio, sombra e espaçamento coerentes | passa | Cards, pastas e escalas usam 28 px; pílulas e cápsulas usam 999; botões de vidro usam 12; popover e lista usam 26. A sombra é `--e-glass`. Nenhum elemento soma borda de 1 px a sombra larga. |
| Um acento só | passa | Veja o mecanismo 4. |
| Vidro só em pílulas e botões pequenos | **falha parcial** (M8) | Cards, pastas, escalas e painel não têm `backdrop-filter` (conferido em tempo de execução). Sobram com vidro a faixa grudada da barra (`.pr-pills::before`, 1316×64) e 12 vidros do palco que continuam ativos debaixo do painel opaco. |
| Estouro, texto cortado e rolagem lateral (5 larguras × 9 estados) | **falha** (G2, M1, M9, M11) | Em 46 estados não há rolagem lateral nem estouro. Há textos cortados no resumo de estados (G2), na cápsula de borda a 1280 (M1), nos nomes das folhas a 768 e 390 (M11) e no fragmento de alergia na janela baixa (M9). |
| Decisões do dono | respeitadas | A alergia fica visível nos 46 estados e na janela de 560 e 600 px, e o painel cobre o palco. Só o modelo tem cor, e a coluna esquerda segue Perfil → Pastas → Diagnósticos. A faixa mínima de alergia aparece até 600 px de altura. |

---

## 3. Desempenho (build de produção)

### Abertura do prontuário (do `status = active` ao palco pronto)

| Medida | 1× | 4× | 1× (300 + 150) | 4× (300 + 150) |
|---|---|---|---|---|
| Barra da página na tela | 357 ms | 486 ms | 373 ms | 671 ms |
| Palco 3D pronto | 772 ms | 1260 ms | 816 ms | 1599 ms |
| Commits do React até a barra / até o palco | 5 / 13 | 5 / 13 | 5 / 13 | 5 / 13 |
| Tarefas longas (total; maior) | 0 | 2 (133 ms; 68 ms) | 0 | 4 (370 ms; 113 ms) |
| `crypto.subtle.decrypt` | 36 (30 registros + 6 imagens) | 36 | **485** | 485 |
| Leituras do adapter, cada uma = 1 requisição de IDB no real | 2 `get` (paciente, responsável), 8 `getAll` por índice, 6 `getBlob` e 1 escrita de auditoria | igual | igual | igual |
| IndexedDB real tocado | 0 | 0 | 0 | 0 |
| Cápsulas na faixa / nós do prontuário | 3 / 563 | | 43 + "Anteriores +229" / 885 | |

Na abertura a 4×, a pior tarefa é o commit do React com 48 ms de estilo e layout forçados, mais duas tarefas de 57 ms com 40 ms de layout forçado (leituras de geometria nos efeitos de layout). Não registro como achado.

**Pedaços:** o prontuário (`PatientRecordScreen`) tem 138,2 kB (44,5 kB gzip); o palco (`AnatomyStage`), 17,4 kB (6,6); `scene`, com o three.js, 686,5 kB (178,8); `estruturas`, 7,6 kB (2,6); o modelo `busto.glb`, 796 kB, mais o `busto.json` de 13 kB.

Pedaços sob demanda:
- `PatientForm` (12,8 kB / 4,8) e `ClinicalDocumentModal` (11,7 kB / 4,7) não descem na abertura: certo.
- `RescheduleDialog` (5,8 kB) já desce na abertura, junto com Overview e Agenda.
- `DocumentSheet` + `LetterheadPreview` (40,4 kB / 15,7 kB gzip) descem na abertura (M10).

### Palco 3D

| Situação | Quadros do palco por s (1× / 4×) | Página (rAF) | Thread principal ms/s (1× / 4×) | GPU `CrGpuMain` ms/s |
|---|---|---|---|---|
| Giro automático (14 s, só no começo) | 40 / 40 | 60 | 42 / 125 | 152–238 |
| Repouso (depois do giro) | **0 / 0** | 60 | 51 / 50 | 88–317 (ruído; é o fundo do shell) |
| Hover varrendo o cérebro, 3 s | 44,9 / 36,7 (p95 de 17 ms) | 60 / 58,5 | 127 / **388** (1 tarefa longa de 112 ms a 4×) | 189–280 |
| Rotação por arrasto, 3 s | 54,1 / 49,8 (p95 de 17 ms) | 60 | 151 / 316 | 174–370 |
| Painel aberto (palco pausado) | **0 / 0** | 60 | 53 / 63 | 150–401 |
| Só o shell (`#/pacientes`, sem palco) | — | 60 | 44 / 52 | 99–233 |
| Sem o fundo do shell e sem vidro | — | — | — | **≈ 3** |

O custo do hover a 4× (raycast: 388 ms/s, pico de 112 ms) e o fundo animado do shell (60 quadros por segundo sempre; quase todo o tempo de GPU em repouso) já são conhecidos. Não contam como achado novo.

### Commits do React por interação

| Interação | Commits |
|---|---|
| Hover entra numa estrutura | 1 |
| Mouse andando 2 s sobre a mesma estrutura | 0 |
| Clique abre o popover | 3 |
| Esc fecha o popover | 1 |
| Liga ou desliga uma camada | 1 |
| Troca de vista | 1 |
| Pílula abre o painel | 4 |
| Esc fecha o painel | 2–3 |
| Rolagem de 400 px | 1 |

### Diálogos sob demanda (G3)

| Diálogo | 1ª abertura (1× / 4× / 4× pesado) | 2ª abertura | Pedaço baixado no clique |
|---|---|---|---|
| Editar ficha | 325 / 402 / 411 ms | 11–39 ms | nenhum visível (o pedaço não aparece no resource timing) |
| Emitir documento | 328 / 394 / 414 ms | 10–34 ms | `ClinicalDocumentModal` |
| Remarcar | 328 / 351 / 367 ms | 16–47 ms | nenhum: já estava em cache |

Os três abrem sem erro e fecham com Esc.

### Vazamentos

Medi 6 aberturas e fechamentos de diálogo (2 de cada), 6 do painel, 6 do popover e 6 saídas e voltas ao prontuário (o palco desmonta e monta).

- **Ouvintes `keydown`:** `window` 1, `document` 1 e outros 4, antes e depois. Com um diálogo aberto, `document` sobe para 2 (trava de foco) e volta para 1. **Sem vazamento.**
- **Contextos WebGL vivos:** `shell__bg`, `an-canvas` e 1 contexto desconectado criado pela tela de configuração ou login antes do prontuário (2 na execução de 4× pesado), estáveis depois das 6 remontagens. **Sem vazamento do prontuário.**
- **Heap:** 26 a 31 MB depois do ciclo; 36 a 42 MB com a carga pesada.

### Carga pesada, só em memória (302 consultas e 152 evoluções)

- Painel Linha do tempo: 47 ms a 1× e 278 ms a 4× (2 tarefas longas, a maior de 160 ms), com 60 itens.
- Painel Evoluções: 39 ms a 1× e 136 ms a 4× (a maior tarefa de 80 ms), com 30 itens.
- Faixa: 43 cápsulas mais "Anteriores +229". Abrir mais 40 leva 18 ms, e o foco vai para a cápsula nova.
- Trilha: densa, 42 traços, "239 de 269 realizadas · 30 faltas".

---

## 4. Achados

### BLOQUEIA

Nenhum.

### GRAVE

**G1 · P1 · Fechar o popover aberto com o mouse abre a lista de estruturas e acende uma estrutura que ninguém escolheu.**
- **Como reproduzir:** a 1440×900, clicar no Lobo frontal direito e fechar o popover pelo × com o mouse (ou com Esc).
- **O que acontece:**
  - o foco vai para a `listbox` escondida (`an-list__box`);
  - por `:focus-within`, a lista vira um cartão de vidro de 208 px sobre o lado direito da cabeça;
  - `onListFocus` acende o **Lobo frontal esquerdo**, em azul sólido;
  - no hover seguinte o rótulo do pino some, porque `listFocused` o suprime;
  - nada disso sai com o mouse fora do palco, só com um clique em outro lugar.
- **Evidência:** `focus.mjs` → `{ foco: "an-list__box", listaAberta: true, opcaoAtiva: "Lobo frontal esquerdo" }`; `g1.mjs` → `rotuloDoPino: null`; capturas `shots/foco-mouse-fora.png` e `shots/g1-hover-depois.png`. A causa está em `AnatomyStage.jsx:458-462` (sem foco anterior, a volta cai em `listRef.current`) e em `anatomy.css:516-517` (`.an-list:focus-within` abre a lista para qualquer foco, até o do mouse).
- **Correção:** quando o popover foi aberto pelo ponteiro, devolver o foco ao canvas ou a nada, e abrir a lista só com `:focus-visible`.

**G2 · P1 · Com 3 ou mais estados, o texto do resumo de estados sai da pílula de vidro.**
- **Como reproduzir:** criar, só em memória, sem desfecho, atrasado, na recepção e uma teleconsulta feita sem consentimento (`summary.mjs`). Olhar a visão geral a 1280, 1440 e 1920.
- **O que acontece:** a pílula vai de 597 a 937 px (340 px, `max-width`), e o texto "Sem desfecho · Atrasado · Na recepção · Sem consentimento para tele…" continua por fora do vidro. A 1440 ele é cortado na borda do palco (1036 px); a 1920 corre cerca de 170 px além da pílula, sobre o modelo. Com 2 estados cabe. É o estado padrão (recolhido) de qualquer paciente com 3 ou mais estados; o guia §7 exige o caso de 5 ou mais alertas.
- **Evidência:** `shots/zoom-resumo-1440.png` e `shots/zoom-resumo-1920.png`; `summary.mjs` → `textoCortado: true`. A causa é o `span` com `max-width: 56ch` e `white-space: nowrap` (`patient-record.css:1242`) dentro de um `li` de no máximo 340 px (`:523`), num botão `.pr-alert__summary` (`:1227`) sem `min-width: 0`.
- **Correção:** `min-width: 0; max-width: 100%` no `.pr-alert__summary` e no `.pr-alert__text`, e `max-width: 100%` no `span`, para a reticência cair dentro da pílula.

**G3 · P3 (modais) · Ficha, documento e remarcação levam 325–415 ms para aparecer na primeira abertura.**
- **Como reproduzir:** no build de produção, clicar em "Editar ficha", "Emitir documento" ou "Remarcar" pela primeira vez e medir até o `[role=dialog][aria-modal=true]` aparecer (`perf.mjs`).
- **O que acontece:** a primeira abertura leva 325 a 328 ms a 1× e 351 a 414 ms a 4×; a segunda, 11 a 47 ms. A remarcação leva 328 ms mesmo com o `RescheduleDialog` já em cache, então o tempo não é de rede.
- **Causa:** o atraso fixo de revelação do Suspense no React 19.2.8 (`FALLBACK_THROTTLE_MS = 300`, conferido em `node_modules/react-dom`). Cada diálogo monta um `<Suspense fallback={null}>` novo no clique (`PatientRecordScreen.jsx:523-561`). O pedido era abrir "sem atraso perceptível", e 300 ms é atraso perceptível num clique que abre uma janela (a segunda abertura mostra que o normal é de 10 a 40 ms).
- **Correção:** carregar o módulo com `import()` antes (no `pointerenter` ou `focus` do botão, ou em idle) e montar o componente já resolvido, sem `lazy` e `Suspense` próprios. Outra saída é usar `startTransition` com a fronteira de Suspense que já existe.

### MENOR

**M1 · P4 · A 1280×800, a primeira cápsula da faixa aparece cortada no meio da palavra ("luído").** Com 3 cápsulas, o trilho de cerca de 190 px rola e centra no "Hoje", e a cápsula da esquerda fica parcialmente legível sob a máscara de 24 px. O próprio código promete que nenhum texto fica cortado sob a máscara (`VisitRail.jsx:53-54`, `patient-record.css:719-720`). Evidência: `shots/zoom-base-1280.png`. Correção: alinhar o encaixe ao início da cápsula seguinte, fora da máscara, ou estender a máscara até a cápsula inteira.

**M2 · P1 · Com os estados abertos ("4 estados do paciente" → expandir), quatro pílulas cobrem a cabeça e o cérebro a 1440 e 1280, e o busto não desce.** Evidência: `shots/mosaico-5alertas.png` (quadros da direita). Correção: no modo expandido, recalcular o `topInset` ou abrir os estados em fileira compacta à esquerda do busto.

**M3 · P2 · Os três totais de Marcos (Atingidos, Emergentes, Atrasados) quebram em 2 + 1, com uma célula vazia, a 1440 e a 1024.** São 320 px úteis para `repeat(auto-fit, minmax(104px, 1fr))`: 3 × 104 + 2 × 8 = 328 px. Evidência: `shots/1440x900-rolado-520.png` e `shots/1024x768-rolado-1300.png`; `patient-record.css:668`. Correção: `repeat(3, minmax(0, 1fr))` acima de 300 px, ou mínimo de 96 px.

**M4 · P2 (fidelidade nº 6) · O leque das folhas mal aparece.** As folhas sobem 14 px acima da frente e abrem 19–23 px. Com exames de fundo escuro, as miniaturas viram faixas pretas, e a folha branca do PDF quase some sobre a pasta clara. Evidência: `shots/zoom-pastas-1440.png` e `shots/768x1024-pastas.png`; `glasscost.mjs` → `folhaAcimaDaFrente: 14`, `leque: 19–23`. Correção: em repouso, subir as folhas de 24 a 28 px e dar à folha um filete de 1 px mais claro que a miniatura.

**M5 · P2 · O "+" das pastas só aparece de 0,7 a 1,4 s depois de a pasta entrar na tela.** A causa é `transition: opacity .6s … .7s, scale .7s … .7s` (`glass-folder.css:280`), mais o `appearDelay` de 120 ms por pasta. Nesse intervalo, a ação de anexar parece não existir (capturas a 700 e 900 ms sem o "+" da pasta Pareceres). Além disso, é coreografia fora dos dois momentos que o guia §4.5 permite. Correção: tirar o `transition-delay` da tecla ou reduzi-lo a `--dur-1`.

**M6 · Sistema (P1, P3, P4) · Micro de 11 px fora das exceções** (a data da cápsula, o crédito, o eixo e a contagem de pílula estão liberados). Aparece em:
- no popover, o rótulo "Exames do paciente que costumam avaliar esta região" (`anatomy.css:333-340`) e o chip de lado (`:271-281`);
- no painel de Escalas, a dica da régua com a interpretação ("Sintomas significativos");
- o estado "Abrindo o modelo 3D" (`anatomy.css:86`);
- a cápsula única "Consultas não lidas" ou "Nenhuma consulta", que usa só a linha micro.

Correção: corpo de 14 px em `--ink-400` em todos esses casos.

**M7 · Sistema · Valores soltos onde há token.**
- `anatomy.css` tem 33 declarações de espaçamento em px cru (8, 6, 10, 16, 4, 12, 18, 3…), várias fora da escala de 4.
- `patient-record.css` tem 12, entre elas `gap: 6px`, `padding: 5px …` e `padding: 1px 7px`.
- Há z-index cru 1 e 2 em `patient-record.css:839, 1308, 1309, 1327`.
- `glass-folder.css:266` usa `font-size: 14px`, e as durações `.35s`, `.6s`, `.7s` e `.12s` não usam `--dur-*`.

Correção: trocar por `--s-*`, `--t-body` e `--dur-*`, e criar tokens locais de camada (como os `--an-z-*`) para o prontuário.

**M8 · Sistema e desempenho · Vidro fora de pílula e de botão pequeno.**
- A faixa grudada da barra de seções (`.pr-pills::before`, 1316×64 a 1440) desfoca o fundo animado o tempo todo em que a página está rolada, inclusive com o painel aberto (o painel rola a página até grudar).
- Com o painel aberto, as 12 superfícies de vidro do palco (a pílula de alerta, 5 camadas, 3 cápsulas e 3 controles) continuam com `backdrop-filter` debaixo do painel opaco, que as esconde por inteiro.
- O efeito em GPU ficou inconclusivo pelo ruído (±100 ms/s). Sem o fundo animado, o custo do vidro cai para 0–10 ms/s.

Evidência: `sweep-all.json` (`vidro` nos painéis). Correção: `backdrop-filter: none` em `.pr-grid.has-panel .pr-stage *` e faixa grudada opaca (`--pr-panel-solid` com sombra de 1 px).

**M9 · P3 · Na janela baixa (1280×560) com o painel aberto, a alergia aparece duas vezes, na faixa mínima e no cabeçalho do painel, e um pedaço da pílula do palco ("Di…") vaza entre a faixa e o topo do painel.** Evidência: `shots/1280x560-baixa-painel.png`; `states.json` → alergia em `faixa` y = 16, `outro` y = 36 e `painel` y = 73. A faixa mínima é decisão do dono e fica. O que falta é esconder a faixa ou a pílula do cabeçalho com o painel aberto, e garantir que o palco fique coberto por inteiro.

**M10 · Desempenho · `DocumentSheet` + `LetterheadPreview` (40,4 kB, 15,7 kB gzip) descem em toda abertura do prontuário.** A causa é a importação estática em `views/DocumentsView.jsx:6`; só o painel Documentos usa esses módulos. Correção: `lazy` no `DocumentSheet` dentro do `DocumentsView`.

**M11 · P2 · A 768 e a 390, os nomes das folhas dentro das pastas aparecem truncados com reticências.** `gf-sheet-name` tem 79–88 px, e "RM de crânio com contraste" precisa de 269 px. O texto é decorativo (o título inteiro está no painel Exames), mas é texto cortado à vista. Correção: esconder o nome da folha quando ela não cabe, ou mostrar só o tipo e a data.

---

## 5. Evidências principais

Ficam em `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/b66e8cad-c129-42d0-8ba7-78e62caa1819/scratchpad/p12/`:

- **Capturas cegas:** `shots/1440x900-geral.png` e `shots/1920x1080-geral.png`; painéis em `shots/<tamanho>-painel-<seção>.png` (5 tamanhos × 8 seções).
- **Palco:** `shots/mosaico-palco-1440.png` (repouso, hover, sem crânio, lista), `shots/1440x900-px-popover.png`, `shots/*-px-*-alfa.png` (busto isolado).
- **Estados:** `shots/mosaico-5alertas.png`, `shots/1440x900-vazio.png`, `shots/1440x900-pesado.png`, `shots/1440x900-sem-webgl.png`, `shots/1440x900-leitura-falhou.png`, `shots/1280x560-baixa*.png`, `shots/1440x600-baixa*.png`.
- **Números:** `perf-1x.json`, `perf-4x.json`, `perf-1x-heavy.json`, `perf-4x-heavy.json`, `sweep-all.json`, `px-1440.json`, `px-1920.json`, `states.json`, `focus.json`, `glasscost.json`, `opentrace-4x.json`.
