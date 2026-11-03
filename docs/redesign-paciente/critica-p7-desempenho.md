# Crítica P7 — Desempenho e gargalos (lente `desempenho`)

Pergunta: o que no prontuário é lento, pesado, desperdiça CPU/GPU/memória/rede, vaza recurso ou piora com muitos dados? Só entra como achado o que tem número. O resto é suspeita, com o jeito de medir.

## Ambiente e método

- Chromium for Testing headless (1280×800, DPR 1 salvo indicação), WebGL por software (SwiftShader). Números absolutos de GPU valem só como ordem de grandeza. Contagens, proporções e tendências valem.
- Dois alvos: servidor de desenvolvimento `:5173` (React dev, StrictMode) e build de teste em `<scratchpad>/dist-perf` servido por `vite preview :5199` (já derrubado). Não gravei em `dist/`. Para o `:5199` copiei os envelopes cifrados da base de verificação para o IndexedDB daquela origem (leitura na origem, escrita só na cópia). Tudo que roda em `:5199` está marcado "prod".
- Driver CDP próprio (`scratchpad/p7/desempenho/*.mjs`): `longtask` e `layout-shift` por `addScriptToEvaluateOnNewDocument`; contadores de `getContext`, de `create/delete` de buffer/textura/programa/FBO/VAO, de chamadas de desenho por canvas, de rAF vivo, de object URLs, de ouvintes em `window/document`, de operações IndexedDB (com tempo) e de `crypto.subtle.decrypt`; `Performance.getMetrics`, `SystemInfo.getProcessInfo` (CPU do processo de GPU), `Memory.getDOMCounters`, `HeapProfiler`, `Profiler`, gancho do React DevTools (commits).
- Cargas: 3 repetições, mediana, cache frio (`Network.clearBrowserCache`) e quente, CPU 1× e 4×, rede 4G rápida (9 Mbps, 170 ms) só no build.
- Dados em volume: no `:5173` por Proxy do adaptador em memória (gravações lançam erro; auditoria engolida); no `:5199` por intercepção de `IDBObjectStore.getAll` na aba (clones dos envelopes reais do paciente). Recarregar desfaz. Nada foi gravado na base do dono nem no Supabase.
- Observação honesta: abrir o prontuário no `:5173` gravou 2 linhas de leitura na auditoria da base de verificação em cada abertura que fiz sem Proxy (aberturas de calibração). Ficam só na base de verificação.
- Medido e descartado como achado fica listado em "O que passou".

## Vereditos

| Peça | Veredito | Motivo (resumo) |
|---|---|---|
| Palco | REPROVA | G1 vaza contexto WebGL e mata o fundo do painel na 14ª visita; G2 e G3 seguram o busto por ~1 s (3,2 s em 4G + CPU 4×) com cascata serial e 200 ms de thread principal; G4 desenha a 60 fps o tempo todo |
| Colunas | REPROVA | G6 36 elementos com `backdrop-filter: blur(24px) saturate(1.6)` sobre um fundo que anima sempre; sem o vidro a GPU cai 57–72% |
| Seções | REPROVA | G5 sem virtualização nem paginação: 1.000 registros viram 14.500 nós, 469 ms e 5 tarefas longas (1,9 s a 4×). Com dados do tamanho da base real (≤ 30 registros) abrem em 10–33 ms: o reprovo é por escala |
| Faixa | APROVA | Com 3 consultas custa 20 nós; com 300 custa 1.505 nós e ~30 ms a mais na abertura (G12, MENOR) |

## Tabela de medidas

| O quê | Quanto | Condição | Limite razoável |
|---|---|---|---|
| Chunk da rota `PatientRecordScreen` | 120,6 KB bruto / 38,8 KB gzip | prod | ok |
| Chunk `scene` (three.js + loaders) | 684,9 KB / 178,2 KB gzip (`import * as THREE`) | prod, adiado (só ao montar o palco) | ok por ser adiado |
| Chunk `AnatomyStage` | 24,5 KB / 8,8 KB gzip | prod | ok |
| `busto.glb` | 795,8 KB; gzip só reduz a 680,8 KB (−14%, já é meshopt); 108.405 triângulos, 54.854 vértices, 32 malhas, 0 texturas | prod | ok para o modelo; preload ausente (G2) |
| Entrada (login) | 10 req, 422 KB (inclui `logo.svg` de 70,8 KB usado como ícone da aba) | prod, frio | favicon de 71 KB é desperdício (G11) |
| Prontuário, 1ª visita | 17 req, 1.043 KB (glb 777 KB + scene 175 KB + 12 irmãos) | prod, frio | ok no total, serial no tempo (G2) |
| Nome + cards (1ª visita) | 438 ms mediana (nome=cards=alertas) | prod, CPU 1×, frio/quente iguais | < 300 ms |
| Busto visível e interativo (1ª visita) | 1.009 ms frio / 994 ms quente | prod, CPU 1× | < 600 ms |
| Idem, 4G + CPU 4× | nome 737 ms; busto 3.211 ms frio / 2.384 ms quente | prod | < 2 s |
| Idem no dev | nome 470 ms; busto 1.050 ms (CPU 1×); busto 2.030 ms (CPU 4×) | dev | — |
| Nome/busto na 2ª visita (mesma sessão) | 47 ms / 283 ms (3ª: 33/262; 4ª: 39/259) | prod | — |
| TBT / tarefa longa | 161 ms (uma tarefa de 211–225 ms) em 1×; 871–880 ms (uma de 907–941 ms) em 4×+4G | prod | TBT < 200 ms em 4× |
| CLS | 0,000 em todas as 12 cargas do build | prod | < 0,1 |
| Leituras IndexedDB na abertura | 9 `getAll` + 1 `get`, todos paralelos, terminam em 10 ms; 76 decifragens em 10 ms | prod | ok |
| Escala IndexedDB (loja inteira lida a cada abertura) | `getAll` de 1.000 / 5.000 / 20.000 envelopes: 7 / 28 / 100 ms; decifragem 3–5 µs cada | sintético, `:5199` | ok |
| Auditoria por abertura | 1 gravação (+1 de LOGIN no login), 2 ms, fora do caminho de render | prod. No dev são 2 linhas READ idênticas (StrictMode) | 1 |
| Ocioso, prontuário | main 5,9%, script 4,4%, renderer 12,5%, GPU 35,9% de um núcleo; 120 rAF/s (2 laços); 5.699 chamadas de desenho/s; 0 mutações/s; 0 tarefas longas | prod, 30 s | quase 0 |
| Ocioso, por quadro do palco | 94 chamadas de desenho, 108.405 triângulos, 14.618 vértices de linha, 1.170 pontos; 60 fps; auto-rotação de 0,35 (2°/s: hash do quadro muda a cada 1 s) | dev e prod | — |
| Ocioso, painel de seção aberto | palco 0 chamadas (pausa certo); mas GPU 51,9%, main 1,9%; fundo `shell__bg` continua a 60 fps | prod, 10 s | ≤ 10% |
| Isolando o vidro e o fundo (GPU %, mediana de 3×8 s) | tudo ligado 35,2; sem palco 33,5; sem fundo 35,6; sem palco e sem fundo 0,1; sem palco, sem fundo, sem vidro 0,2; sem vidro 30,6; sem fundo e sem vidro 25,0; sem palco e sem vidro 14,3 | dev | — |
| Painel aberto, GPU % | normal 51,1; sem vidro 14,4; sem `shell__bg` 0,1 | dev, 3×8 s | — |
| `backdrop-filter` | 36 elementos na visão geral (887.514 px² somados, 87% da tela); 39 com painel (+ painel de 840×500); todos `blur(24px) saturate(1.6)` | 1280×800 | ≤ 6 e sem animação por trás |
| Aba oculta (visibilitychange simulado) | main 0%, GPU 0,1%, 0 rAF | dev | ok |
| Palco abaixo da dobra (celular 390×844, palco em y=958) | 0 quadros do palco; mas GPU 29,9–37,2% (só `shell__bg` + vidro) | dev, DPR 3 | ok no palco |
| DPR 2 desde o início | canvas do palco 1.008×1.000 (4× pixels, teto 2 do código); `shell__bg` 1.789×1.118; contagens por quadro iguais | dev | GPU de verdade: medir em aparelho |
| Hover 500 `pointermove` | mediana 16,7 ms por evento (preso ao quadro), p95 17,5, máx 27,5; 41 commits do React (182 ms, dev); 0 tarefas longas. A 4×: p95 33,9, máx 108, uma tarefa longa de 55 ms | dev | ok |
| Arrastar (120 moves), zoom de roda (40), 4 vistas, 10 cliques de camada | tarefa total 239 / 268 / 310 ms; camada até pintar 33 ms (2 quadros); 0 tarefas longas | dev | ok |
| Selecionar estrutura + popover | 133 ms de tarefa; depois ocioso 0 quadros do palco, 0 mutações | dev | ok |
| Construção da cena (`_build`) | 206 ms, dos quais `plexoGraph` 195 ms (`near` 117 ms de self); 1 tarefa longa de 211–225 ms; 941 ms a 4×; refeito a cada visita (≈ 260 ms até o busto na 2ª visita); sem Worker | dev (perfil), prod (tarefa longa) | < 50 ms ou fora da thread |
| Abrir seção, dados reais (≤ 30 regs) | 10–33 ms | prod | ok |
| Abrir seção, sintético (300 consultas, 500 evoluções, 150 escalas, 120 medicações, 80 marcos, 200 anexos, 60 consentimentos, 40 documentos) | Linha do tempo 469 ms / 14.559 nós / 5 tarefas longas (139,137,131,74,72) / rolagem 131.837 px; Evoluções 312 ms / 17.539 nós / 4 tarefas longas; Anexos 97 ms / 2.246 nós; Escalas 86 ms; demais ≤ 42 ms | prod 1× | < 100 ms, < 2.000 nós |
| Idem a CPU 4× | Linha do tempo 1.876 ms (6 tarefas longas, a maior 560); Evoluções 1.273 ms; Anexos 339 ms; abertura do prontuário: nome 610, busto 1.848, TBT 900 | prod 4× | < 400 ms |
| Abertura do prontuário com o volume sintético | nós 975 → 4.042; cápsulas 3 → 300; nome 349 → 378 ms | prod 1× | — |
| Rolar a página (119 quadros) | mediana 16,7 ms, p95 18,6, 1 quadro > 20 ms; sem vidro p95 17,4; a 4× p95 18,0 | dev | ok |
| Memória, 15 ciclos prontuário ↔ lista (1 paciente e 5 pacientes alternados) | heap 4,4 → 9,6 MB (estabiliza: 8,6/9,3/9,6); nós +2,7/ciclo (2.775 → 2.817); ouvintes JS +1/ciclo (363 → 378); nós destacados +1/ciclo (63 → 83 em 20 ciclos); `window/document` estáveis; rAF vivo 1; object URLs 0 vivos | prod | planos |
| Contextos WebGL, 15 ciclos | +2 criados por ciclo (1 sonda + 1 do palco); do palco 15 de 15 perdidos certo; sondas vivas 1 por ciclo (1 → 15); texturas +4/ciclo e FBOs +3/ciclo sem `delete` (liberados pela perda do contexto) | prod | 0 vivos de sobra |
| Miniaturas | só entram na tela (IntersectionObserver), no máximo 4 por pasta; 12 criadas, 12 revogadas ao sair | dev, JPEG sintético | ok |
| Peso das miniaturas | 12 miniaturas de JPEG 1600×1200 (≈ 1 MB cada) = +74 MB de RSS do renderer (≈ 6 MB por miniatura) | dev | miniatura reduzida |

## Achados confirmados (ordem de severidade)

Nenhum achado BLOQUEIA: a tela não fica inutilizável nem esquenta de forma comprovada neste ambiente. Seis são GRAVE (G1–G6) e sete MENOR (G7–G13).

### GRAVE

**G1 — GRAVE — Vazamento de contexto WebGL: na 14ª visita ao prontuário o fundo do painel morre**
- Onde: `admin/modules/patients/anatomy/AnatomyStage.jsx:49-56` (`hasWebGL`), chamada em `:196` (inicializador de `useState`, a cada montagem); `admin/components/Shell.jsx:258` (`ShaderBackground`); nenhum `webglcontextlost` no `admin/`.
- Medida: cada entrada no prontuário cria 1 canvas-sonda com contexto WebGL que nunca é liberado (o canvas do palco, esse sim, é perdido com `forceContextLoss` em `scene.js:484-500`, 15 de 15). Sondas vivas: 1 por ciclo. Com 16 contextos ativos, o Chrome perde o mais antigo: `shell__bg` ficou `lost` no ciclo 14 (prod), com o aviso "Too many active WebGL contexts. Oldest context will be lost." (7 avisos em 20 ciclos). O laço de rAF do fundo continua a 60/s desenhando num contexto morto. Captura em `scratchpad/p7/desempenho/out/ctx_ciclo15_lista.png`: o gradiente azul com grão virou cinza chapado, comparado a `ctx_inicio_lista.png`. No dev são 3 contextos por ciclo (StrictMode): 13 vivos no ciclo 5.
- Causa provada: leitura do código depois da medida. A sonda é um `document.createElement('canvas').getContext(...)` solto; nunca recebe `WEBGL_lose_context`. O mesmo vale para o `auth__bg` do login (esse é perdido certo).
- Deveria: detectar WebGL uma vez por página (variável de módulo) ou perder o contexto da sonda; tratar `webglcontextlost/restored` no fundo.
- Reproduzir: `BASE=http://localhost:5199/admin.html node scratchpad/p7/desempenho/ctxloss.mjs` (ou, na mão, entrar e sair do prontuário 14 vezes sem recarregar a página).

**G2 — GRAVE — Primeira visita: cascata serial com dois vazios de ~300 ms (o busto chega em ~1 s; 3,2 s em 4G + CPU 4×)**
- Onde: `admin/modules/patients/PatientRecordScreen.jsx:32` (lazy do palco) e `:299` (Suspense), `admin/App.jsx:170` (Suspense da rota), import de `scene.js` dentro de efeito em `AnatomyStage.jsx` (~`:262`).
- Medida (prod, CPU 1×, frio): cliques aos 0 ms → rota e 12 irmãos pedidos a 92 ms (chegam em ~100) → thread principal ociosa até ~330 ms (perfil: 50 ms de janela com 49 ms de `(idle)`) → dados lidos em 10 ms → nome/cards a 438 → chunk `AnatomyStage` pedido a 415 (3 ms de rede) → `scene.js` só pedido a 728 (outro vazio de ~310 ms) → `busto.json`/`busto.glb` pedidos a 777, só depois do `scene.js` → primeiro desenho a 1.009 ms. Na 2ª visita (chunks já em memória): nome 47 ms, busto 283 ms. Diferença de 308 ms + 726 ms. Padrão compatível com o atraso mínimo de ~300 ms que o React aplica ao revelar um Suspense depois de mostrar o fallback; como cada degrau só descobre o próximo ao renderizar, o vazio se repete. Em 4G + CPU 4×: `scene.js` pedido a 1.028 ms, glb a 1.401 ms (849 ms de download serial), busto a 3.211 ms; quente 2.384 ms.
- Causa: lazy encadeado (rota → palco → cena → modelo), sem `import()` antecipado nem `<link rel="modulepreload|prefetch">` para `AnatomyStage`, `scene` e `busto.glb`; o vazio de ~300 ms é consequência do fallback do Suspense (inferida da 2ª visita, que não o tem).
- Deveria: disparar `import('./anatomy/AnatomyStage.jsx')`, `import('./anatomy/scene.js')` e o `fetch` do `.glb`/`.json` já ao entrar na rota (ou ao passar o mouse na lista, ou logo após o login) e em paralelo com a leitura de dados. Meta: busto < 600 ms na 1ª visita em CPU 1×.
- Reproduzir: `BASE=http://localhost:5199/admin.html node scratchpad/p7/desempenho/reopen.mjs` (4 visitas) e `load.mjs` (cascata em `out/load_prod.json`, campo `reqs`).

**G3 — GRAVE — Construção da cena bloqueia a thread principal por ~210 ms (940 ms a 4×) e se repete a cada visita**
- Onde: `admin/modules/patients/anatomy/scene.js:506` (`_build`), `:282` (`plexoGraph`), `:294` (`near`).
- Medida: perfil do dev: `_build` 206 ms, `plexoGraph` 195 ms, `near` 117 ms de tempo próprio (+66 ms do laço de `plexoGraph`). No build: uma tarefa longa de 211–225 ms em 1× e de 907–941 ms em 4×; é todo o TBT da carga (161 ms em 1×, 871–880 ms em 4×). Na 2ª visita o busto leva ainda ~260 ms, ou seja, o plexo é recalculado toda vez. Sem Web Worker.
- Causa provada: busca de vizinhos em grade espacial cujas chaves são strings (`${cx},${cy},${cz}` em `grid.get`) montadas até 27 vezes por vértice sobre 54.854 vértices, em duas passagens (Poisson e arestas); mais a ordenação por hash de todos os vértices. O resultado é determinístico ("mesma figura a cada carga", comentário em `:279`).
- Deveria: pré-computar o plexo na exportação do modelo (guardar nós/arestas em `busto.json` ou num buffer), ou ao menos chavear a grade por inteiro (`(cx*K+cy)*K+cz`) e memoizar entre visitas; meta < 50 ms.
- Reproduzir: `node scratchpad/p7/desempenho/buildprof.mjs` (dev) e `load.mjs` com `CONFIGS=cpu4net` (prod).

**G4 — GRAVE — A tela nunca fica em repouso: dois laços de 60 fps permanentes**
- Onde: `scene.js:1145` (`autoRotate` mantém o laço ocupado), `admin/components/Shell.jsx:258` (`ShaderBackground`).
- Medida (prod, 30 s parado, sem tocar em nada): 120 rAF/s, 5.699 chamadas de desenho/s, main 5,9%, renderer 12,5%, GPU 35,9% de um núcleo. O palco desenha 60 quadros/s, 94 chamadas e 108.405 triângulos por quadro (6,5 M triângulos/s) para girar 0,35 de velocidade (2°/s). Com o painel aberto o palco pausa corretamente (0 chamadas), mas o `shell__bg` segue a 60 fps e a GPU sobe a 51,9% porque o painel borra um fundo que se move. Desligar o fundo e o palco leva a GPU a 0,1%. (Aba oculta e palco fora da tela param tudo: ver "O que passou".)
- Causa: auto-rotação lenta atrelada ao rAF a 60 fps; fundo de shader sem teto de quadros nem pausa quando coberto.
- Deveria: limitar o palco em repouso a ~20–30 fps (ou rotacionar por CSS/`requestAnimationFrame` com passo de tempo mais espaçado), parar a rotação após alguns segundos sem interação, pausar o `shell__bg` quando um painel o cobre ou rebaixá-lo a 30 fps.
- Reproduzir: `node scratchpad/p7/desempenho/idle.mjs` e `idle_prod.mjs` (com `BASE`).
- Ressalva: GPU de software; em hardware o custo absoluto é bem menor. O que se sustenta é a proporção (o repouso custa o mesmo que o uso) e a conta de bateria em notebook.

**G5 — GRAVE (escala) — Seções sem virtualização nem paginação**
- Onde: `admin/modules/patients/views/TimelineView.jsx` (junta 6 listas e renderiza tudo), `NotesView.jsx:58` (`ordered.map`), `AttachmentsView`, `MedicationsView`, `ScalesView`.
- Medida (prod, sintético; detalhes na tabela): Linha do tempo com ~1.000 itens: 469 ms, 14.559 nós, rolagem de 131.837 px, 5 tarefas longas; a 4×: 1.876 ms e 6 tarefas longas (maior 560 ms). Evoluções com 500: 312 ms / 17.539 nós (1.273 ms a 4×). Anexos 200: 2.246 nós. Custo cresce linear em nós; nada de janela de renderização.
- Contexto: com os dados reais da base (≤ 30 registros por paciente) as seções abrem em 10–33 ms. O dano é de pacientes de muitos anos (≥ 150–300 registros).
- Deveria: janela de renderização (ou "mostrar mais"/agrupar por mês colapsado) a partir de ~100 itens; meta < 100 ms e < 2.000 nós em qualquer volume.
- Reproduzir: `BASE=http://localhost:5199/admin.html MODE=synth [CPU=4] node scratchpad/p7/desempenho/scale_prod.mjs` (e `scale.mjs` no dev).

**G6 — GRAVE — 36 `backdrop-filter: blur(24px) saturate(1.6)` sobre um fundo que anima o tempo todo**
- Onde: `admin/styles/components/patient-record.css`, `anatomy.css` (`.pr-card`, `.pr-scale`, `.pr-folder`, `.pr-alert`, `.pr-visit`, `.an-glass-btn`, `.pr-panel`, e filhos `gf-front` de 122×71 e `gf-key-face` de 14×14).
- Medida: 36 elementos (39 com painel), 887.514 px² somados (87% da tela). Injetando `backdrop-filter: none` (dev, 3×8 s): fundo sozinho (sem palco) GPU 33,5% → 14,3% (−57%); palco sozinho 35,6% → 25,0%; painel aberto 51,1% → 14,4% (−72%). Sem o vidro o main sobe (renderer 20,4% vs 13,7%) por causa de repintura dos cartões, então o ganho é de GPU e não de CPU. Rolagem não sofre (p95 18,6 ms).
- Causa: cada filtro vira uma passada de borrão de 24 px sobre a região atrás dele, e o que há atrás (fundo shader + palco) muda a cada quadro, então nada fica em cache.
- Deveria: vidro só nos cartões grandes e só em um nível (nada de vidro dentro de vidro: `gf-front`, `gf-key-face`, `.pr-visit`, botões do palco); raio de 24 px → 12–16 px; ou congelar o fundo (G4) enquanto há painel aberto.
- Reproduzir: `node scratchpad/p7/desempenho/glass.mjs` e `glass2.mjs`; contagem em `extra.mjs`.

### MENOR

**G7 — MENOR — Miniaturas de exame são o arquivo original**
- Onde: `admin/modules/patients/record/useAttachmentThumbs.js` (cria um object URL do arquivo inteiro), `ProfileColumn.jsx:291`.
- Medida: 12 miniaturas (3 pastas × 4) de JPEG 1600×1200 (~1 MB cada) = +74 MB de RSS do renderer (~6 MB cada). Só carregam quando a pasta entra na tela e são revogadas ao sair (12 criadas, 12 revogadas): sem vazamento.
- Deveria: gerar miniatura reduzida (canvas 200 px) ao anexar. Ver S1 para fotos de celular.
- Reproduzir: `IMG=1 MODE=synth JW=1600 JH=1200 node scratchpad/p7/desempenho/scale.mjs`.

**G8 — MENOR — 12 chunks irmãos entram com a rota, ainda que só sirvam a diálogos**
- Medida: na carga do prontuário, `PatientForm`, `DocumentSheet`, `LetterheadPreview` (11,8 KB gz), `RescheduleDialog`, `cid10`, `DataTable`, `Tabs`, etc.: 12 requisições, ~52 KB gz, pedidas em paralelo com a rota (sem custo de tempo medido, a 4× + 4G custam 180–530 ms de rede em paralelo).
- Deveria: carregar sob demanda ao abrir editar/emitir.

**G9 — MENOR — `busto.glb` de 796 KB trafega sem compressão útil e a política de cache depende do host**
- Medida: `Content-Type: model/gltf-binary`, sem `Content-Encoding`; o gzip só ganharia 14% (680.802 B). O preview de teste respondeu `Cache-Control: no-cache` (revalida a cada visita: 127 B quando quente). O repositório não tem `vercel.json`, `_headers` nem equivalente; o cache real é o padrão do host.
- Deveria: `Cache-Control: public, max-age=31536000, immutable` para `/assets/*` (os nomes têm hash). Ver S3.

**G10 — MENOR — `list()` lê a loja inteira e decifra todos os responsáveis a cada abertura**
- Onde: `admin/data/idb-adapter.js` (`list` faz `getAll()` da loja toda); `PatientRecordScreen.jsx` (~`:91`, `repo.list(STORES.GUARDIANS)` sem filtro).
- Medida: 76 decifragens na abertura, 44 delas de responsáveis de outros pacientes; tudo termina em 10 ms. Sintético: `getAll` de 20.000 envelopes 100 ms, decifragem 3–5 µs. Hoje não pesa; cresce linear com a clínica (20.000 notas → 100 ms por loja, 9 lojas em paralelo).
- Deveria: índice por `pacienteId` (já existe) em vez de `getAll`; buscar só os responsáveis do paciente (também reduz PII de terceiros em memória).

**G11 — MENOR — Ícone da aba `logo.svg` de 70,8 KB**
- Medida: 70,8 KB transferidos na tela de login (16,8% dos 422 KB da entrada), referenciado em `admin.html` (`rel="icon" href="/assets/logo.svg"`).
- Deveria: favicon otimizado (< 5 KB; existe uma versão de 4,7 KB hashada no build).

**G12 — MENOR — Faixa e colunas não escalam a baixo custo**
- Medida: 300 consultas = 300 cápsulas / 1.505 nós na Faixa; abrir e fechar uma seção gera 826 mutações de DOM fora do painel e do palco (3 consultas: 34). Custo de abertura +30 ms. Sem virtualização.
- Causa não isolada (colunas e Faixa re-renderizam ao mudar o parâmetro `secao`).

**G13 — MENOR — Vazamentos lentos entre visitas**
- Medida (prod, 15 ciclos): +1 ouvinte JS, +2,7 nós de DOM e ~+0,07 MB de heap por ciclo depois do aquecimento (nós destacados: 63 → 83 em 20 ciclos). Sem crescimento de ouvintes em `window/document`, de rAF ou de object URLs. Origem não isolada.

## Suspeitas (sem medida suficiente)

- **S1** Fotos de celular como miniatura: 12 MP decodificam a ~48 MB cada; 12 miniaturas ≈ 576 MB. Conta de bitmap, não medida (a medida real foi 6 MB por miniatura de 1,9 MP). Como medir: `JW=4000 JH=3000 IMG=1 MODE=synth node scale.mjs` num aparelho com RSS confiável.
- **S2** Custo real de GPU com 36 borrões a DPR 2 em hardware (canvas do palco 1.008×1.000, fundo 1.789×1.118): medir em notebook/iPad com `chrome://gpu` + trace `devtools.timeline.frame`, ou `Tracing` com `cc`, `gpu`.
- **S3** Cabeçalhos de cache de `/assets/*` e `busto.glb` no host de produção: `curl -I` no domínio publicado.
- **S4** 94 chamadas de desenho por quadro poderiam cair com mesclagem por camada; não medi ganho.
- **S5** Dev-only (não é achado): StrictMode duplica a leitura de auditoria (2 linhas READ idênticas) e as decifragens (233 vs 76). No build há 1 gravação por abertura.

## O que passou (medido e dentro do limite)

- Interação do palco: hover com 500 `pointermove` sem tarefa longa (a 4× uma de 55 ms), arrastar, zoom, camadas (2 quadros até pintar), vistas, seleção com popover; com popover aberto o palco para de desenhar (0 chamadas).
- Pausas: aba oculta (CPU 0%, GPU 0,1%), palco coberto pelo painel (0 chamadas), palco abaixo da dobra no celular (0 quadros).
- Memória: heap plano; object URLs 100% revogados; contexto do palco perdido 15 de 15; rAF e ouvintes de `window/document` estáveis.
- CLS 0,000; `longtask` só a construção da cena; IndexedDB + decifragem 10 ms; auditoria 1 gravação de 2 ms fora do render; nenhuma gravação durante abrir/fechar seções (0 operações de escrita).
- Rolagem da página com vidro: p95 18,6 ms (1×) e 18,0 ms (4×).
- Entrega: three.js adiado (chunk próprio, só com o palco); `busto.glb` já é meshopt; fonte Inter com preload; só 2 fontes carregadas na entrada.

## Arquivos de apoio (scratchpad, podem ser apagados)

`/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p7/desempenho/` — `lib.mjs` (driver), `load.mjs`, `idle.mjs`, `idle_prod.mjs`, `gpu.mjs`, `glass.mjs`, `glass2.mjs`, `interact.mjs`, `leak.mjs`, `ctxloss.mjs`, `scale.mjs`, `scale_prod.mjs`, `buildprof.mjs`, `reopen.mjs`, `weight.mjs`, `extra.mjs`, `idbscale.mjs`, `out/*.json`, `out/*.png`.
