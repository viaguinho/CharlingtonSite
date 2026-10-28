# Crítica P9 — lente DESEMPENHO — prontuário `#/pacientes/<id>`

- **Data:** 2026-10-27
- **Crítico:** contexto limpo, lente desempenho. Não li design-loop, críticas anteriores, registros p7/p8, histórico git nem o Obsidian. Não editei código-fonte.
- **Veredito em uma linha:** o prontuário só desenha quando algo muda e não vaza contexto WebGL. Mas cada abertura trava o main por ~0,3 s num notebook comum, e o painel de vidro sobre o fundo animado multiplica o custo de composição enquanto o médico escreve.

## Método e ambiente

| Item | Como |
|---|---|
| Build | `npx vite build --outDir <scratchpad>/p9/desempenho/dist-perf` (nada em `dist/`), servido com `vite preview`. |
| Porta | **5199**, não 4174. A origem 4174 não tem base local (cai em "Configuração inicial"). Para não criar conta, usei a origem 5199, que já tem a base de verificação no perfil (42 pacientes, Clara e Rafael). |
| Navegador | Google Chrome 156 headless, **instância própria na porta 9444** com uma CÓPIA do perfil de verificação no scratchpad. O Chromium compartilhado (9333) tinha a aba de outro agente aberta, e ela contaminava os totais do processo da GPU. As primeiras medidas de abertura foram feitas na 9333 e repetidas na 9444; a tabela usa as da 9444. |
| Máquina | Apple M2 (8 núcleos, 8 GB), GPU M2 via ANGLE/Metal. "Notebook comum" = **CPU 4× mais lenta** (`Emulation.setCPUThrottlingRate`). A limitação **não** se aplica à GPU nem ao processo da GPU. |
| Tela | 1366×768 DPR 1 (padrão). Também 1440×900 DPR 2 e 1536×864 DPR 1,25 (Windows a 125%). |
| Rede | Sem limitação (localhost), ou "4G" emulado (60 ms, 9 Mbit/s de descida). "Cache frio" = `Network.clearBrowserCache` antes da sessão. |
| Fluxo medido | Entrar → `#/pacientes` → trocar o hash para `#/pacientes/<id>`. É o caminho real: a chave do cofre vive só na memória, então não há abertura direta sem login. |
| Sondas (minhas, via CDP) | Script injetado antes da página: PerformanceObserver de `longtask` e `layout-shift`, contagem de chamadas a IndexedDB e a `crypto.subtle.decrypt`, registro de todo contexto WebGL criado (perdido? no DOM?), contagem de commits do React pelo gancho do DevTools, medidor de rAF. Tracing (`toplevel`, `viz`, `gpu`, `cc`) para a ocupação de cada thread, Profiler para atribuir CPU, `ps` para a RSS dos processos da GPU e do renderer. |
| Dados pesados | **Só em memória, no build de produção.** Interceptei `IDBObjectStore.getAll` e `crypto.subtle.decrypt`: envelopes falsos entram no resultado e são "decifrados" a partir de um registro real do mesmo paciente usado como molde. Assim criei 300 consultas, 40 exames e 150 evoluções para Clara. Imagens grandes (JPEG 4032×3024, 5,3 MB) entraram do mesmo jeito. Nada é gravado. O adaptador em memória do repositório (`useAdapter`) só existe no servidor de desenvolvimento, e lá os tempos não valem; para medir no build de produção a interceptação dá o mesmo efeito sem tocar o banco. |
| Escala da clínica | Num banco IndexedDB **separado** (`perf-scratch-p9`), dentro do perfil copiado, com envelopes de 1,2 kB (o tamanho médio medido na base real). O banco do painel não foi tocado. |
| Gravações | Nenhum botão que grava foi clicado. Abrir um prontuário grava, por regra do próprio app, uma entrada de auditoria de leitura na base local de verificação. |

**Não consegui testar:** uma GPU fraca de verdade (Intel UHD/Iris): o processo da GPU roda sem limitação no M2, então medi o custo do lado da CPU (tempo de thread), não o tempo real de execução do blur na GPU. Também ficaram de fora Windows, Firefox e Safari; os diálogos "Emitir documento", "Remarcar" e "Aplicar escala" (não os abri, para não chegar perto de botões que gravam); a latência de digitação nos formulários; e uma base real grande (usei banco sintético). Vi picos de 1,6–1,7 s de tarefa longa em 2 de 10 aberturas, só no Chromium compartilhado; ficaram como suspeita.

## Tabela de medidas

Todas no build de produção, na porta 5199, com o Chrome dedicado, salvo onde diz outra coisa.

| Métrica | Valor | Condição |
|---|---|---|
| 1ª abertura na sessão (Clara): esqueleto / útil / palco montado / busto pronto | 317 / 341 / 639 / 765 ms | CPU 1×, cache frio, sem limitação de rede |
| idem | 340 / 405 / 696 / **1.902 ms** | CPU 4×, cache frio, 4G |
| idem, cache HTTP quente (nova sessão) | 334 / 400 / 687 / 1.156 ms | CPU 4× |
| 2ª abertura na sessão (Rafael): útil / busto | 21 / 136 ms | CPU 1× |
| idem | 57 / 436–504 ms | CPU 4× |
| Tarefa longa da montagem da cena (toda abertura) | 78–89 ms (1×); **308–363 ms** (4×, 6 de 6 aberturas no trace, tudo num único microtask) | trace CrRendererMain |
| Picos de tarefa longa | 1.579–1.742 ms em 2 de 10 aberturas | CPU 4×, só no Chromium 9333 compartilhado (**suspeita**) |
| Requisições / bytes da 1ª abertura | 16 / 1.026 kB: GLB 777, scene.js 175 (gz; 685 cru), PatientRecordScreen 43, LetterheadPreview 12, AnatomyStage 7, DocumentSheet 4, estruturas 3, cid10 2, print 1, busto.json 2,4, mais 6 blobs | cache frio |
| Aberturas seguintes | 2 requisições (GLB e JSON de novo, 0,1 kB, do cache) | mesma sessão |
| GLB | 795.760 B; gzip -9 dá 680.304 B (−15%). O preview serve sem compressão (`model/gltf-binary`). 108.405 triângulos, 54.854 vértices, 32 malhas | arquivo e cabeçalhos |
| CLS na abertura | 0,000 | layout-shift, CPU 1× |
| Commits do React na abertura | 13 (Clara), 5 (Rafael) | gancho do DevTools |
| Leituras por abertura | 1 `get` de paciente, 9 `getAll` de loja **inteira**, 1 `add` de auditoria, 6 `get` de blob. Linhas lidas: responsáveis 44 (todos decifrados), agendamentos 146, evoluções 95, consentimentos 112. Decifrações: 79 (Clara) / 51 (Rafael) | base de verificação |
| Ler a loja inteira × pelo índice `pacienteId` | 150 env.: 2 × 0 ms · 2.000: 9 × 0 ms · **12.000 (≈14 MB): 67 × 7 ms (1×); 99–119 × 6 ms (4×)** | banco separado, mediana de 3 |
| fps (rAF) | 60 em todos os cenários (p95 16,8 ms), parado, girando, hover, arrasto e painel aberto | CPU 1× e 4×; a 4× o hover dá 59,4 fps (2 quadros >33 ms) |
| Main thread, prontuário parado | 54 ms/s (1×), 91 ms/s (4×). Quase todo é o fundo animado: sem ele, 32 / 19 ms/s | trace, 4 s |
| Main, busto girando sozinho (14 s depois de pronto) | 86 ms/s (1×), **279 ms/s (4×)** | trace |
| Main, hover sobre o busto | 241 ms/s (1×), **704 ms/s (4×)** | caminho circular sobre a cabeça, 60 eventos/s |
| Main, arrasto para girar | 117–141 ms/s (1×), 217–270 ms/s (4×); com popover aberto 229 / 295 ms/s | trace |
| Processo da GPU (CrGpuMain + Viz), lista de pacientes (só o fundo) | 229 ms/s | DPR 1 |
| idem, prontuário parado / SEM vidro / SEM fundo | **168 / 80 / 2 ms/s** (DPR 1) · 209 / 122 / 2 (DPR 2) · 320 / 160 / 3 (DPR 1,25) | trace 4 s, sem medidor de rAF |
| idem, **painel Evoluções aberto** / SEM vidro / SEM fundo | **405 / 107 / 3 ms/s** (DPR 1) · **371 / 66 / 3** (DPR 2) · **416 / 176 / 3** (DPR 1,25) | trace 4 s, palco pausado |
| DrawFrame (Viz) por quadro, painel aberto × sem vidro | 1,9 × 0,12 ms/quadro (DPR 1) | 60 quadros/s nos dois |
| Elementos com `backdrop-filter` | visão geral: 34 (21 na tela, 37% da área); painel aberto: 37 (**81% da área**). Blur de 8 a 24 px, sempre com saturate | DOM computado, 1366×768 |
| Dados pesados (300 consultas / 40 exames / 150 evoluções): abrir prontuário | 188 ms (1×); **850 ms com tarefas de 174, 87 e 331 ms** (4×). Sem os dados: 140 / 542 ms | em memória |
| idem: DOM total / cápsulas na faixa | 3.550 nós / 291 cápsulas (sem os dados: 954 / 3) | |
| idem: abrir Linha do tempo | 191 ms (1×); **917 ms, TBT 687 ms** (4×); painel com **5.539 nós** | |
| idem: tique do relógio (60 s) com a Linha do tempo aberta | 58 ms (1×); **279 ms, tarefa de 268 ms** (4×). Com o painel fechado: 18 / 26 ms | `visibilitychange` dispara o mesmo tique |
| idem: abrir Evoluções / trocar para Exames / fechar | 544 (TBT 351) / 174 / 60–216 ms (4×); Evoluções com 5.324 nós | |
| Miniaturas: 8 imagens 4032×3024 na tela | aparecem ~0,75 s (1×) / ~1,2 s (4×) depois da abertura. Desenhadas a 96×65 px a partir do bitmap inteiro (≈48 MB RGBA nominais cada). Nenhuma tarefa longa nova no main | em memória; medida de RSS com ruído de ±100 MB, inconclusiva |
| 30 aberturas e fechamentos seguidos | contextos WebGL vivos: sempre 1 (o `shell__bg`, nunca perdido); 30 `an-canvas` perdidos por `forceContextLoss` e fora do DOM. Heap depois de GC: 4,8 → 8,5 (5 aberturas) → 9,7 MB (30). Nós +1/abertura, ouvintes JS +2/abertura. Processo da GPU estável em 115–119 MB; renderer 226–246 MB depois das 5 primeiras | Performance.getMetrics, `ps` |
| Commits do React | hover 4 s: 36 (um por troca de estrutura); arrasto 4 s: 1; ocioso 65 s: 2 (o tique) | gancho do DevTools |

## Vereditos

| Peça | Veredito | Motivo |
|---|---|---|
| **P1 Palco anatômico** | **REPROVA** | G9-1: toda abertura bloqueia o main por 308–363 ms a 4× (o GLB é reprocessado e o plexo recalculado a cada visita). Também pesam o hover a 70% do main (G9-5) e um ouvinte que vaza a cada abertura (G9-6). O resto é bom: só desenha quando algo muda (2–3 ms/s de GPU sem o fundo), pausa sob o painel e não vaza contexto WebGL. |
| **P2 Colunas** | **APROVA** | Renderizam sem tarefa longa e sem deslocamento de layout. As miniaturas carregam só quando a pasta entra na tela e decodificam fora do main. Ficam itens MENOR: vidro em 12 camadas das pastas (entra no G9-2) e bitmaps em resolução cheia (G9-8, suspeita de memória). |
| **P3 Seções e modais** | **REPROVA** | G9-2: o painel de vidro (81% da tela) sobre o fundo animado multiplica por 2,4 a 5,6 o tempo do processo da GPU durante todo o tempo em que o painel fica aberto. G9-4: com 300 consultas ou 150 evoluções, abrir o painel custa ~0,5–0,9 s a 4×, e o tique de 60 s trava 268 ms com a Linha do tempo aberta. |
| **P4 Faixa de consultas e estados** | **REPROVA** | G9-3: cada abertura lê 9 lojas inteiras e decifra todos os responsáveis da clínica. A 12.000 agendamentos, só essa loja custa 99–119 ms a 4× (índice: 6 ms), e cresce para sempre. A faixa em si, os estados e o CLS (0) estão bem; a faixa renderizar as 291 cápsulas é MENOR (G9-7). |

## Achados

### BLOQUEIA

Nenhum. O prontuário abre e funciona em todas as condições medidas.

### GRAVE

**G9-1 · P1 · Montar a cena trava o main por ~0,3 s em toda abertura**
- **Onde:** `AnatomyStage.jsx` (efeito de montagem) e `scene.js` (`load()` → `_build()` → `plexoGraph()` por malha, `mergeVertices`, criação de 2 materiais de shader por malha).
- **Evidência medida:** uma tarefa única de 78–89 ms a 1× e **308–363 ms a 4×** em 6 de 6 aberturas no trace (prod, Chrome dedicado), inteira num microtask (`RunMicrotasks` = 100% da tarefa; GC < 8 ms). Acontece também na 2ª, 3ª… abertura: Rafael a 4× tem útil em 57 ms e depois um bloqueio de 308 ms. Ela cai logo depois de o prontuário ficar útil, justo quando o médico começa a clicar: o atraso de entrada chega a ~350 ms (faixa "precisa melhorar" do INP). Perfil no servidor de desenvolvimento (só para atribuição): `plexoGraph` + `near` ≈ 60 ms por abertura a 1×. Picos de 1,6–1,7 s foram vistos só no Chromium compartilhado (suspeita, ver abaixo).
- **Deveria:** a geometria do plexo não muda entre pacientes. Calcular uma vez por sessão e guardar em cache no módulo (ou pré-calcular no build, ou fazer num Web Worker) e, em cada visita, só criar os objetos WebGL. Se ficar no main, dividir `_build` em fatias com cedência (`scheduler.yield`/`setTimeout`) por malha, para nenhuma tarefa passar de 50 ms a 4×.
- **Reproduzir:** build de produção; `open.mjs <base> 4 none warm` (ou trace de `CrRendererMain` com `Emulation.setCPUThrottlingRate {rate: 4}`); abrir Clara, voltar, abrir Rafael; olhar as tarefas `RunTask` com mais de 200 ms.

**G9-2 · P3 (e P2) · Vidro do prontuário sobre o fundo animado: o custo de composição se multiplica enquanto o painel está aberto**
- **Onde:** `.pr-panel` (blur 16 px + saturate, 81% da tela) e, na visão geral, `.pr-card`, `.pr-folder`, `.gf-front` (22 px), `.gf-key-face`, `.pr-scale`, `.pr-alert`, `.an-glass-btn`, `.pr-visit` (21 elementos na tela, 37% da área). Todos amostram o `canvas.shell__bg`, que redesenha a 60 quadros/s.
- **Evidência medida (processo da GPU, CrGpuMain + Viz, ms por segundo):**
  - painel aberto: **405 → 107 sem vidro → 3 sem fundo** (DPR 1); 371 → 66 → 3 (DPR 2); 416 → 176 → 3 (DPR 1,25). O DrawFrame do Viz vai de 0,12 para 1,9 ms por quadro.
  - visão geral parada: 168 → 80 → 2 (DPR 1); 320 → 160 → 3 (DPR 1,25).
  - Sem o fundo animado o vidro custa zero (nada redesenha). Com o fundo, o vidro do prontuário acrescenta de **+90 a +300 ms/s** de trabalho contínuo. Isso dura todo o tempo do painel aberto, que é quando o médico lê ou escreve uma evolução.
  - No M2 o fps não cai (60). A GPU de um notebook comum não foi testada: a medida é o tempo de CPU do processo da GPU, sem o custo de execução do blur.
- **Deveria:** o painel de seção é uma folha para ler e escrever, e atrás dele só há o palco pausado. Ele deveria ter superfície opaca, ou quase, sem `backdrop-filter`, ou o prontuário deveria deixar de amostrar um fundo que se move enquanto o painel está aberto. O fundo do shell não é desta peça, então a correção tem que ser do lado do prontuário. Na visão geral, limitar o vidro aos elementos pequenos (pílulas, botões do palco) e tirar as 3 camadas de blur por pasta.
- **Reproduzir:** `gpu.mjs <base> 1366 768 1` no Chrome dedicado. O script alterna os estilos injetados `*{backdrop-filter:none!important}` e `canvas.shell__bg{display:none!important}` e soma `ThreadControllerImpl::RunTask` de CrGpuMain e VizCompositorThread em janelas de 4 s.

**G9-3 · P4 · Cada abertura lê lojas inteiras e decifra todos os responsáveis da clínica, e o custo cresce com o histórico**
- **Onde:** `PatientRecordScreen.load()` chama `repo.list` em 9 lojas. `idb-adapter.list()` faz `getAll()` da loja inteira e filtra em JS, sem usar o índice `pacienteId`, que já existe. `read(STORES.GUARDIANS)` vai sem filtro e decifra todos.
- **Evidência medida:** na base de verificação, uma abertura de Clara lê 146 agendamentos, 95 evoluções, 112 consentimentos e 44 responsáveis (44 decifrações para 1–2 responsáveis). Banco separado com envelopes de 1,2 kB: **12.000 envelopes = 67 ms (1×) / 99–119 ms (4×) para ler a loja inteira, contra 7 / 6 ms pelo índice**. Uma clínica com alguns anos de agenda passa disso, e são 3 lojas grandes por abertura (agendamentos, evoluções, consentimentos), somadas à tarefa do G9-1. Hoje, com 146 linhas, são 2 ms: o problema só aparece com o tempo.
- **Deveria:** `list` com `where.pacienteId` usar `index('pacienteId').getAll(IDBKeyRange.only(id))`. Os responsáveis devem ser lidos pelos ids da ficha (`patient.responsaveis`), por `get`.
- **Reproduzir:** `idbscale.mjs <base> 1|4`; contadores `idb.getAllRows.*` e `decrypt` em `open.mjs`.

**G9-4 · P3 · Painéis com histórico longo renderizam tudo e re-renderizam a cada minuto**
- **Onde:** `TimelineView` e `NotesView` dentro de `SectionPanel`. O `tick` de 60 s (e todo `visibilitychange`) re-renderiza o prontuário inteiro, painel aberto incluído.
- **Evidência medida (300 consultas, 150 evoluções, 40 exames, em memória, prod, 4×):** abrir a Linha do tempo leva **917 ms, com tarefas de 259, 271, 238 e 119 ms (TBT 687)**, e o painel tem 5.539 nós. Com ela aberta, cada tique custa **279 ms (uma tarefa de 268 ms)**; com o painel fechado, 26 ms. Abrir Evoluções: 544 ms (TBT 351), 5.324 nós. Na mesma base sem os dados: 107 / 19 / 56 ms. A 1×: 191 / 58 / 122 ms.
- **Deveria:** a lista do painel não pode depender do `tick`. Memoizar a view (as props hoje mudam de identidade a cada render, porque `viewProps` é um objeto novo) ou passar o relógio só a quem mostra "agora". E renderizar por janela ou por mês, com "carregar mais", em vez de 300 itens de uma vez.
- **Reproduzir:** `heavy.mjs <base> 4 300 40 150 0`.

### MENOR

- **G9-5 · P1 · Hover cobra raycast em todos os triângulos a cada quadro.** `_pick` → `intersectObjects` sem estrutura de aceleração, em 108 mil triângulos. Main thread: 241 ms/s a 1× e **704 ms/s a 4×** (contra 117 / 270 no arrasto, que não faz raycast). Não derruba quadros (59,4 fps). Deveria usar BVH (`three-mesh-bvh`), malhas simplificadas só para o toque, ou raycast limitado (só ao mudar de pixel, no máximo 30 por segundo). Reproduzir: `steady.mjs <base> 4`.
- **G9-6 · P1 · Vaza um ouvinte `keydown` no `document` (e o canvas destacado junto) por abertura.** O `OrbitControls` (three r185) registra `keydown` em `domElement.getRootNode()`. No desmonte, o React tira o host do DOM antes do efeito de limpeza, e `controls.dispose()` tenta remover do nó raiz errado. Medido: +6 `keydown` no `document` em 6 aberturas, nós +1 e ouvintes +2 por abertura, heap +~40 kB por abertura (4,8 → 9,7 MB em 30). Deveria descartar os controles antes de o canvas sair (por exemplo, em `useLayoutEffect`, ou desligando-os enquanto ainda estão conectados). Reproduzir: `leak2.mjs`.
- **G9-7 · P4 · A faixa de consultas monta todas as cápsulas.** 291 cápsulas e +2.600 nós com 300 consultas; parte dos +300 ms da abertura pesada a 4× (850 contra 542 ms). O tique com o painel fechado é barato (26 ms). Deveria montar só uma janela em torno de "hoje" e expandir ao rolar.
- **G9-8 · P2 · Miniaturas decodificam o arquivo inteiro.** Uma foto de 4032×3024 é desenhada a 96×65 px, ≈48 MB RGBA nominais por imagem e 8 na tela. Os tempos não pioram (~0,75 s a 1×), mas a memória não deu para medir (ruído de ±100 MB). Deveria gerar a miniatura uma vez (`createImageBitmap` com `resizeWidth`) e soltar o original.
- **G9-9 · P1 · Giro automático de 14 s cobra 279 ms/s do main a 4× em toda abertura.** São 28% do main durante a janela em que o médico começa a ler, somados à tarefa do G9-1. Deveria girar menos tempo, ou só depois de o main ficar ocioso.
- **G9-10 · P1/P3 · A rota puxa código e bytes que a visão geral não usa.** `ClinicalDocumentModal` traz `LetterheadPreview`, `DocumentSheet`, `print` e `cid10` (≈19 kB gz) em toda 1ª abertura, com o modal fechado. O GLB vai sem compressão (−15% com gzip; o servidor de deploy precisa incluir `model/gltf-binary`). O preview responde `no-cache` para assets com hash: o `SEGURANCA-DEPLOY.md` só define `no-store` para `/admin.html` e não fala de `/assets/*` imutáveis. Deveria carregar o modal sob demanda e configurar cache longo para os assets.

## Suspeitas (não reproduzidas de forma estável)

- **Piso de ~300 ms na 1ª abertura da sessão.** O esqueleto aparece sempre em 317–340 ms, com cache frio ou quente e com CPU 1× ou 4×. O palco monta ~300 ms depois de o prontuário ficar útil (639 contra 341). Na 2ª abertura são 10–17 ms. Isso combina com a limitação de 300 ms que o React 19 aplica ao revelar um Suspense (a rota e o palco são `lazy`). Se for isso, pré-carregar `PatientRecordScreen` e `AnatomyStage` ao montar a lista de pacientes, ou no hover da linha, tira os dois degraus.
- **Picos de 1,6–1,7 s na montagem da cena** (2 de 10 aberturas, CPU 4×, só no Chromium compartilhado, onde outro agente usava a GPU). No Chrome dedicado foram 6 de 6 aberturas entre 308 e 363 ms. Provável disputa de recursos, mas uma máquina ocupada é o cenário do consultório.
- **Custo real de GPU do blur num iGPU comum.** No M2 não houve quadro perdido. Num Intel UHD com DPR 1,25 o blur de 16 px em 81% da tela a 60 quadros/s pode derrubar quadros; não deu para medir aqui.

## O que está bom

- O palco desenha **sob demanda**: parado e sem o fundo, o processo da GPU gasta 2–3 ms/s e o main ~0. Com o painel aberto, o palco pausa de verdade.
- **Nenhum vazamento de contexto WebGL** em 30 aberturas seguidas: só o `shell__bg` fica vivo e nunca é perdido; cada `an-canvas` é liberado com `forceContextLoss`. O processo da GPU fica estável em ~117 MB.
- three.js e o modelo (685 kB de JS, 777 kB de GLB) **só carregam nesta rota**, e o download começa em paralelo com a leitura dos dados.
- Prontuário útil em 341 ms (1×) / 405 ms (4×, 4G, cache frio); da 2ª abertura em diante, 21 / 57 ms. **CLS 0** do esqueleto ao conteúdo.
- O estado do formulário de evolução é local: digitar não re-renderiza o prontuário. O arrasto do busto gera 1 commit em 4 s; o pino e o popover andam sem React.
- As miniaturas só carregam quando a pasta entra na tela e liberam os object URLs ao desmontar.

## Arquivos da medida (scratchpad, podem sumir)

`/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p9/desempenho/`: `lib.mjs`, `inject.js`, `fakes.js`, `open.mjs`, `steady.mjs`, `gpu.mjs`, `leak.mjs`, `leak2.mjs`, `heavy.mjs`, `thumbs.mjs`, `idbscale.mjs`, `commits.mjs`, `popdrag.mjs`, `outlier.mjs` e os resultados `r-*.txt` / `d-*.json`. Os números essenciais estão copiados acima.
