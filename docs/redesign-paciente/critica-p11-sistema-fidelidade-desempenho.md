# Crítica p11: sistema de design, fidelidade e desempenho

Crítico de contexto limpo, 03/11/2026. Tela `#/pacientes/:id`, paciente de verificação Clara Macedo Farias (`16df5f04-4169-4ac5-a458-1668c6221ec3`). Não li outras críticas, registros de conflito, `design-loop.md`, `HANDOFF.md`, histórico do git nem o cofre.

## Veredito

| Peça | Veredito | Motivo |
|---|---|---|
| P1 Palco anatômico e alertas | **APROVA** | M1, M2, M5 e M7 cumprem com medida. 0 quadros do palco em repouso, 60 fps em hover e rotação com CPU a 1× e a 4×, pausa com o painel aberto, nada vaza. Ficam 5 MENORES (custo do raycast, vidro sobre fundo animado, composição a 1920, 11 px no popover, valores soltos). |
| P2 Colunas | **APROVA** | M3 cumpre em todos os itens. M6 cumpre só em parte: as folhas do leque mal aparecem e o PDF sozinho some. A trilha de acompanhamento satura com muitas consultas. As duas coisas são MENOR. |
| P3 Navegação e seções | **REPROVA** | G1: a 1024×768 o painel trava no mínimo de 360 px. Só 109 px (30%) ficam para o conteúdo, e a alergia aparece duas vezes na tela. Nas outras 44 combinações de largura e estado não há rolagem lateral, texto cortado nem nada fora da tela. |
| P4 Faixa de consultas e estados | **APROVA** | Uma fileira, 2 textos por cápsula, traço de "hoje" com 1 px, base alinhada com os controles (842 = 842). A janela de 40 cápsulas aguenta 300 consultas. Os estados (sem desfecho, na recepção, atrasado, futuro, vazio) estão corretos. A cápsula da ponta direita sai cortada no meio da palavra (MENOR). |

**Nota de fidelidade: 7,5/10.** 6 mecanismos cumprem e 1 cumpre em parte (M6). A nota não é maior por causa do conjunto: o busto em plexo cinza sobre fundo claro tem pouca presença, o corpo nunca passa por trás dos cards, e a 1920 sobra um vão de 200 a 400 px entre o arco de camadas, os alertas e o busto.

**Contagem: 0 BLOQUEIA · 1 GRAVE · 14 MENOR.**

---

## Método

- **Build de produção limpo:** `npx vite build --outDir <scratchpad>/dist-p11 --emptyOutDir`. Os tamanhos de chunk vêm dele.
- **Build de produção instrumentado** para as medições: mesmo `vite.config` e mesmas 6 entradas. Um plugin no scratchpad acrescenta uma linha a `repository.js` e outra a `idb-adapter.js`, que só expõem em `window` funções que já existem (`useAdapter`, `mode`…). Os chunks ficam praticamente iguais: admin 522,06 contra 521,87 kB, e os demais idênticos. Foi servido por `vite preview` na porta **5199**.
- **Chrome próprio**, headless, na porta **9555**, com perfil copiado de `.claude/design-loop/profile` para o scratchpad. GPU: ANGLE Metal, Apple M2.
- **Base em memória**, confirmada com `mode() === 'memoria'` em todas as sessões. O prontuário da Clara foi exportado **só por leitura** com a ferramenta do projeto (`node .claude/design-loop/cdp.mjs eval`, usando `repo.list`, não auditado, sem listar a auditoria). Copiei só pacientes, responsáveis, consultas, atendimentos, evoluções, escalas, marcos, medicações, anexos (com os 6 binários), documentos, consentimentos, modelos, salas, clínica e usuário. No meu Chrome, um script de pré-carga põe o adapter de memória no lugar do IndexedDB no instante em que `repository.js` avalia, antes de qualquer leitura. Resultado em todas as sessões: `IDB open = 0`, `requisições IDB = 0`, `decrypt = 0`, `escritas = []`.
- **Login:** a base em memória não tem cifra e o login local só procura o perfil pelo e-mail (`session.jsx`). Preenchi o campo exigido com um valor descartável, que não é credencial de nada. Não li nem digitei a senha da base de verificação.
- **Medição:** DOM e computed style no próprio navegador. Framebuffer do WebGL lido logo após o quadro, para medir busto, área sólida e área colorida. Tracing do CDP (`toplevel`, `devtools.timeline`, `gpu`, `viz`) com união de intervalos por thread. Contadores de pré-carga para commits do React (gancho do DevTools), longtasks, ouvintes `keydown` em documento e janela, e contextos WebGL. `Emulation.setCPUThrottlingRate` a 1 e a 4.
- **Caminho real de leitura** (IDB e `decrypt` na abertura): no servidor de dev (5173), via `cdp.mjs eval`, com um adapter de leitura direta. `get`, `list` e `getBlob` vão ao IDB; **toda escrita fica em memória**, e só 2 entradas de auditoria foram desviadas. Nenhum paciente foi gravado.
- **Varredura:** 5 larguras (1440×900, 1280×800, 1024×768, 768×1024, 390×844 com toque) × (visão geral + 8 painéis), 45 estados. Mais 1920×1080, 1366×768, a janela baixa de 1280×480 e os estados sintéticos em memória (futuro, vazio, atrasado, 300 consultas + 150 evoluções).

## O que não consegui testar

- **A captura da referência Quantis não está em `.claude/design-loop/refs/`.** Nenhuma pasta ali é a Quantis; o guia diz que ela fica no `scratchpad/quantis-ref/` de outra sessão. Julguei pela régua `bar.md`, que se verifica só pela tela renderizada, e pela dissecação do guia §2. Não houve comparação lado a lado com a imagem.
- GPU integrada de notebook (Intel ou AMD): os números são de um Apple M2. O fator 4× limita só a CPU do renderer.
- Os tempos do caminho real de IDB (415 ms até o nome, 974 ms até o palco) vêm do servidor de dev, no Chrome da 9333 compartilhado com outro crítico. Servem só de indicação; as contagens são exatas.
- Gestos de toque reais (pinça, arrasto com 1 dedo), leitor de tela, `forced-colors`, impressão e fallback sem WebGL.
- Cada execução do `cdp.mjs`, usado 2 vezes e só para leitura, entra na base de verificação do perfil original como a ferramenta sempre faz, e isso grava 1 evento de LOGIN na auditoria. Nenhum registro clínico foi tocado.

---

## Fidelidade: os 7 mecanismos de `bar.md`

| # | Mecanismo | 1440×900 | 1920×1080 | Situação |
|---|---|---|---|---|
| 1 | Anatomia é o maior objeto | Palco com 576 px de 1364 úteis (**42,2%**). Busto com 509 de 600 px (**84,8%**) no framebuffer; até o ponto de 50% da máscara do pé, cerca de 76%. Palco sem fundo nem sombra (`rgba(0,0,0,0) / none`). Colunas são cards. | Palco com 1056 de 1844 (**57,3%**). Busto com 692 de 780 (**88,7%**). | **Cumpre** (a 1440, a altura está no limite) |
| 2 | Plexo legível, uma estrutura por vez | Repouso: linhas de 1 px (LineSegments), nós visíveis; só 4,9% dos pixels do modelo têm alfa > 140 (cruzamentos e nós), sem preenchimento. Hover em "Frontal esquerdo": 37,8% sólidos e 39,7% coloridos, com uma só estrutura sólida e o plexo por cima. As demais recuam (pixels visíveis do modelo caem de 32,8 mil para 18,6 mil). | Mesmo comportamento (repouso: 3,1% sólidos). | **Cumpre** |
| 3 | Card no padrão do biomarcador | Número com 52 px contra título com 14 px (**3,71×**), peso 300, unidade "/54" com 14 px em `--ink-500` colada a 2 px. Traço de 2×14 px na cor do risco. Faixa tingida, linha-limite e último ponto com anel. Rodapé com 1 ou 2 linhas. | Igual. | **Cumpre** |
| 4 | Um acento só | 0 azul preenchido na dobra em repouso; os 2 elementos achados são amostras da lista oculta. No hover, 1 (a estrutura). O resto do azul é texto de link (`--blue-600`) e o tom do "Remarcar". | 0 | **Cumpre** |
| 5 | O que flutua sobre o palco é vidro | Com `backdrop-filter`: alertas (2), cápsulas (3, 8 px), botões de camada ligados e controles (8), barra de seções, voltar, rótulo do pino e popover (alfa 0,64, desfoque de 16 px). Cards, pastas, escalas e painel **sem** `backdrop-filter`. Raio dos cards: 28 px. Borda de 1 px somada a sombra larga só no `.btn` global (fora de escopo). | Igual. | **Cumpre** |
| 6 | A pasta é o herói do card de exames | A frente da pasta tem 143 de 164 px (**87%**), com aba e frente reconhecíveis. O rótulo "3 arquivos" fica sobre a frente. Título e data no topo (12 px da borda), `↗` à direita. **O leque é fraco:** as 3 folhas aparecem só em tiras de 20 a 30 px, com miniaturas escuras irreconhecíveis, e o PDF sozinho de "Pareceres" aparece só 12 px, branco sobre cinza-claro. | Igual. | **Parcial** (M1) |
| 7 | Base do palco em faixa única | 1 linha, 2 textos por cápsula, traço de hoje com 1×32 px, base das cápsulas igual à dos controles (842 = 842). Controles `+ − 3D` em vidro, 44×44, raio de 12 px. | 1022 = 1022 | **Cumpre** |

Fora da régua, mas ligado à referência (guia §2.1): o corpo da Quantis invade as margens e passa por trás dos cards. Aqui o busto fica sempre dentro da coluna central. A 1920, o arco de camadas (x 490 a 600) e os alertas ficam longe do busto (x 690 a 1340). Ver M6.

---

## Sistema

| Critério | Resultado | Medida |
|---|---|---|
| Tokens em vez de valores soltos | **Parcial** | Cor: tudo em token, exceto `#000` em `patient-record.css:1385-1386` (M8). Tempo e curva: tudo em token. Espaço: 17 declarações em px soltos em `patient-record.css` e 48 em `anatomy.css`. `glass-folder.css` tem desfoque e `font-size: 14px` soltos (M9). |
| Escala de z-index | **Cumpre, com ressalvas** | Global por token (`--z-sticky`, `--z-drawer`, `--z-base`). O palco tem escala local (`--an-z-*`) em contexto isolado. Valores soltos em `patient-record.css:839` (1) e `:1298` (2) e em `glass-folder.css` (1 a 4), em M9. |
| Alvos ≥ 40 px nos controles principais | **Cumpre** | 1440 e 1920: 0 controles abaixo de 40 px. O "Pacientes" da trilha tem 58×21, com área de 44 px por pseudo-elemento. Painéis: 0 em 45 estados. Exceção: "Mostrar todos" do filtro de exames, com 110×32 (M10). |
| Fontes (nada principal abaixo de 12 px; até 4 tamanhos por tela) | **Parcial** | Visão geral 11·14·32·52 e painéis 11·14·22·32 (4 por tela). Ficam em 11 px: contagens das pílulas, data das cápsulas, "Hoje", crédito, chip de lado e rótulo da relação no popover, régua e eixo do painel de Escalas (M7). |
| Contraste AA | **Cumpre** | Pior texto medido: 5,52:1 (rótulos de alerta sobre o vidro). A única reprovação medida ("Emitir documento", 1,12:1) é falso positivo: o fundo é um gradiente escuro que a medida não lê; na tela é branco sobre quase preto. |
| Anel de foco | **Cumpre** | Tab real: 30 de 30 paradas dentro de `.pr` têm anel visível (contorno ou sombra azul de 2 px). Pasta: o anel fica no card. Lista do palco: traço de 2 px na opção. |
| Raio, sombra, espaço | **Cumpre** | Cards 28, popover 26 (`--r-lg`), botões de vidro 12, pílulas 999. Elevação declarada uma vez (`--e-glass`). |
| Um acento | **Cumpre** | 0 a 1 azul preenchido por dobra. |
| Vidro só em pílulas e botões pequenos | **Cumpre** | O único vidro grande é a barra de seções (1114×48 a 1440), que é pílula. Painel `rgb(255,255,255)` sem desfoque; cards em `--pr-card-solid`. |
| Estouro, corte, rolagem lateral (5 larguras × 9) | **Cumpre** | 45 de 45 estados: rolagem lateral 0, texto cortado 0, fora da tela 0. A sobreposição "cabeçalho × palco da pasta" (12 px) é a margem negativa desenhada e não tem colisão visível. A alergia está visível em 45 de 45 e na janela baixa de 1280×480 (faixa grudada a 16 px, com 40 px de altura). |
| Decisões do dono | **Respeitadas** | Alergia sempre visível; painel cobre o palco (`cobrePalco = true` a partir de 1024); só o modelo tem cor; coluna esquerda na ordem Perfil → Exames → Diagnósticos; faixa mínima de alergia em janela baixa. |

---

## Desempenho (build de produção, Apple M2, 1440×900 salvo indicação)

### Palco 3D: thread principal e GPU (ms por segundo, Tracing)

| Estado | CPU | Thread principal | GPU (CrGpuMain) | Viz | Quadros do palco/s | fps (rAF) | p95 / máx (ms) | Longtasks |
|---|---|---|---|---|---|---|---|---|
| Repouso (14 s depois de pronto) | 1× | 30,4 | 112,2 | 82,0 | **0** | — | — | 0 |
| Hover contínuo (4 s) | 1× | 134,6 | 125,1 | 43,1 | 60 | 60 | 16,7 / 16,8 | 0 |
| Rotação por arrasto (4 s) | 1× | 68,8 | 149,2 | 48,6 | 58,4 | 60,2 | 16,7 / 16,8 | 0 |
| Painel aberto | 1× | 19,0 | 90,6 | 50,8 | **0** | — | — | 0 |
| Repouso | 4× | 17,8 | 55,3 | 23,0 | 0 | — | — | 0 |
| Hover | 4× | **448,7** | 154,8 | 36,0 | 59,6 | 59,6 | 16,8 / 33,4 | 0 |
| Rotação | 4× | 193,7 | 99,5 | 30,1 | 58,3 | 59,8 | 16,8 / 33,3 | 0 |
| Painel aberto | 4× | 28,3 | 57,4 | 30,4 | 0 | — | — | 0 |
| Hover, 1920×1080 | 4× | **428,8** | 142,0 | 28,2 | 59,4 | 59,4 | 16,7 / **49,9** | **1 (54 ms)** |
| Rotação, 1920×1080 | 4× | 171,0 | 79,0 | 25,9 | 59,1 | 60,1 | 16,7 / 16,8 | 0 |

Perfil de CPU do hover a 4× (4 s): `_raycastAt → intersectObjects` = **818 ms**, contra 340 ms de render (M4).

**Repouso, de onde vem a GPU** (A/B na mesma sessão, CPU 1×, 3 s cada):

| Configuração | Principal | GPU | Viz | Quadros compostos/s |
|---|---|---|---|---|
| Normal | 38,7 | 164,3 | 101,3 | 60 |
| Sem `backdrop-filter` no prontuário | 43,0 | 106,2 | 58,6 | 60 |
| Sem o fundo animado do shell (`.shell__bg`) | 0,3 | 2,1 | 0,1 | 0 |
| Sem fundo e sem vidro | 0,2 | 2,0 | 0,3 | 0 |

O palco do prontuário está ocioso em repouso: 0 quadros. Quem compõe 60 quadros por segundo é o WebGL de fundo do shell, fora de escopo. Sobre ele, o vidro do prontuário custa cerca de 58 ms/s de GPU e 43 ms/s de Viz (M5).

### Commits do React por interação

| Interação | Commits |
|---|---|
| Abrir o prontuário | 12 |
| Hover por 4 s (troca de estrutura) | 6 |
| Rotação por 4 s | 1 |
| Ligar ou desligar camada | 1 |
| Trocar a vista | 1 |
| Abrir painel (Linha do tempo / Evoluções) | 3 / 2 |
| Fechar painel (Esc) | 2 |
| Clique na cápsula → Linha do tempo no item | 5 |

### Abertura: IndexedDB e `crypto.subtle.decrypt` (caminho real, escritas desviadas)

| Medida | Valor |
|---|---|
| Requisições IDB | **17** (9 `get` + 8 `index.getAll` por `pacienteId`; 0 `getAll` de loja inteira) |
| Por loja | pacientes 2, responsáveis 1, agendamentos 1, evoluções 1, escalas 1, marcos 1, medicações 1, anexos 1, documentos 1, consentimentos 1, anexosBinarios 6 |
| `decrypt` | **39** chamadas, 2 ms no total |
| Leituras a mais ao abrir as 8 seções | 0 requisições, 0 `decrypt` |
| Até o nome e até o palco pronto (dev, indicativo) | 415 ms / 974 ms |
| Base em memória (prod, todas as sessões) | 0 IDB, 0 `decrypt`, 0 escritas |

### Vazamentos (6 aberturas e fechamentos de cada diálogo, depois 6 montagens do prontuário)

| Ciclo × 6 | Ouvintes `keydown` (doc/janela) | Contextos WebGL vivos | Diálogos sobrando | Nós no DOM |
|---|---|---|---|---|
| Painel de seção (pílula → Esc) | 4 → 4 | 2 → 2 | 0 | 963 → 963 |
| Popover da estrutura (clique → Esc) | 4 → 4 | 2 → 2 | 0 | 963 → 963 |
| Editar ficha (abrir → Esc) | 4 → 4 | 2 → 2 | 0 | 963 → 963 |
| Emitir documento | 4 → 4 | 2 → 2 | 0 | 963 → 963 |
| Remarcar | 4 → 4 | 2 → 2 | 0 | 963 → 963 |
| Sair para Pacientes e voltar | 4 → 4 | 2 → 2 (6 criados, 6 descartados com `forceContextLoss`) | — | — |

O heap foi de 17 para 28 MB depois das 6 montagens, sem GC forçado. Depois da carga, com GC forçado, ficou em 14 MB.

### Carga: 300 consultas + 150 evoluções, só em memória

| Passo | CPU 1×: ms / commits / longtasks | CPU 4×: ms / commits / longtasks (máx) |
|---|---|---|
| Abrir o prontuário | 358 / 12 / 0 | **477 / 12 / 3 (91 ms)** |
| Faixa | 41 cápsulas montadas, "Anteriores +213", "Hoje" visível | igual |
| Abrir Linha do tempo | 48 / 3 / 0 (60 itens + "Mostrar mais") | **242 / 3 / 1 (91 ms)** |
| Abrir Evoluções | 50 / 2 / 0 (30 itens) | 148 / 2 / 1 (59 ms) |
| Fechar (Esc) | 32 / 2 / 0 | 71 / 2 / 0 |
| Cápsula → item da Linha do tempo | 44 / 5 / 0 | 181 / 5 / 1 (51 ms) |
| Nós no DOM (visão geral / com painel) | 1477 / 2156 a 2571 | igual |

### Tamanho (build limpo)

| Arquivo | Bruto | gzip |
|---|---|---|
| `PatientRecordScreen-*.js` | **142,46 kB** | 45,77 kB |
| `AnatomyStage-*.js` | 17,42 kB | 6,56 kB |
| `scene-*.js` (inclui three.js) | 686,47 kB | 178,78 kB |
| `estruturas-*.js` | 7,56 kB | 2,61 kB |
| `busto.glb` | 795,76 kB | — |
| `busto.json` | 13,02 kB | 2,17 kB |
| Transferido ao abrir a rota (a partir de `#/`) | **1035 kB** (GLB 777, cena 175, prontuário 45, modais 25) | |

---

## Achados

### BLOQUEIA

Nenhum.

### GRAVE

**G1. A 1024×768, o painel de seção mostra 30% de conteúdo e a alergia duas vezes.** Peça: P3.
- Reproduzir: janela de 1024×768 e `#/pacientes/<Clara>?secao=evolucoes` (vale para qualquer seção).
- Evidência: o painel vai de y=353 a y=713 e fica preso no mínimo (`SectionPanel.jsx:102`, `MIN_HEIGHT = 360`). O cabeçalho ocupa 72 px, a fileira de estados e o título vêm em seguida, e o primeiro registro começa em y=604. Sobram **109 px de conteúdo (30%)**. Para comparar: 1366×768 tem 225 px (47%), 1280×800 tem 244 px (49%) e 1440×900 tem 357 px (59%). Na mesma tela há **2 pílulas "Alergias · Dipirona"**: a da barra de seções (`patient-record.css:1053`, que mostra `.pr-pills__alerts` abaixo de 1180) e a do cabeçalho do painel. Com `--pr-sticky-h: 128px` (`:1052`) o topo da página chega a 353 px. Captura: `<scratchpad>/sfd11/shots/painel-evol-1024x768.png` e `v-1024-evolucoes.png`.
- Correção sugerida: entre 1024 e 1179 px, com o painel aberto, esconder `.pr-pills__alerts` (o cabeçalho do painel já mantém a alergia) e deixar a fileira de estados rolar junto com o corpo, para o painel chegar a pelo menos 50% de conteúdo.

### MENOR

**M1. O leque de folhas da pasta quase não aparece** (M6 parcial). Peça: P2.
- Reproduzir: visão geral a 1440; cards Imagem, Neurofisiológico e Pareceres.
- Evidência: as 3 folhas saem só 20 a 30 px acima da frente, e a miniatura escura vira uma tira preta. O PDF sozinho de "Pareceres" sai 12 px (`acimaDaFrente: 12`), branco sobre a pasta cinza-clara. Captura: `z-pastas.png`, `z-pasta-pareceres.png`.
- Correção sugerida: em repouso, subir o leque (`--gf-lift` mais negativo e `--gf-stack` maior, `patient-record.css:438`) até mostrar ao menos 1/3 da folha, e dar ao PDF título visível acima da frente.

**M2. A trilha de acompanhamento satura com muitas consultas.** Peça: P2.
- Reproduzir: carga com 300 consultas em memória.
- Evidência: com 255 traços de 3 px de ponta redonda (`patient-record.css:364`), a linha vira uma barra preta contínua. As 51 faltas (`--data-soft`) somem sob ela. O texto "201 de 253 realizadas · 51 faltas" continua certo. Captura: `carga-cpu4.png`.
- Correção sugerida: acima de cerca de 40 consultas, agregar por mês (um traço por mês, com altura ou tom pela proporção de faltas) ou mostrar só os últimos 12 meses.

**M3. A cápsula da ponta direita da faixa sai cortada no meio da palavra, encostada no "+".** Peça: P4.
- Reproduzir: consultas futuras em memória (o estado "futuro"), 1440×900.
- Evidência: "13 dez · Agenda…" cortada sob a máscara direita, colada aos controles. O `centerOnToday` (`VisitRail.jsx:153`) alinha só a borda esquerda. Captura: `estado-futuro-1440.png`.
- Correção sugerida: escolher a rolagem que também deixe a borda direita numa divisa entre cápsulas, ou recolher as futuras além da 2ª num botão "Posteriores +N".

**M4. O hover passa o tempo no raycast.** Peça: P1.
- Reproduzir: mouse circulando sobre a cabeça por 4 s, com CPU a 4×.
- Evidência: thread principal com 449 ms/s (1440) e 429 ms/s (1920). No perfil de CPU, `intersectObjects` leva 818 ms em 4 s. A 1920, a 4×, há 1 longtask de 54 ms e um quadro máximo de 49,9 ms. A média segue em 60 fps. O código está em `scene.js:1385`.
- Correção sugerida: BVH nas malhas-alvo (`three-mesh-bvh`) ou raycast contra uma malha decimada só para a sondagem.

**M5. Em repouso, o vidro do prontuário desfoca de novo, a cada quadro, um fundo que anima.** Peça: P1.
- Reproduzir: A/B em repouso (tabela de repouso acima).
- Evidência: com o vidro do prontuário, GPU em 164 ms/s e Viz em 101. Sem ele, 106 e 59. Sem o `.shell__bg`, cerca de 2. O palco em si desenha 0 quadros.
- Correção sugerida: nesta rota, pausar o fundo animado do shell em repouso (fora do escopo desta passada; encaminhar), ou usar vidro sem `backdrop-filter` nas pílulas enquanto o fundo anima.

**M6. Composição contra a referência: o herói tem pouca presença.** Peça: P1.
- Reproduzir: 1920×1080, visão geral.
- Evidência: o arco de camadas fica em x 490 a 600 e os alertas começam em x 476, enquanto o busto ocupa x 690 a 1340. O vão chega a cerca de 400 px. O plexo cinza a 20% (`--anat-line`) sobre a aurora clara lê como esboço; na referência, o corpo é o objeto mais luminoso e passa por trás das colunas. Captura: `visao-1920.png`.
- Correção sugerida: ancorar o arco e os alertas à caixa projetada do busto (como já se faz com o popover) e subir um degrau a densidade e o tom do plexo do crânio e da pele.

**M7. Informação em 11 px.** Peças: P1, P3, P4.
- Evidência: a data da cápsula ("25 ago", `patient-record.css:744`), o rótulo "Exames do paciente que costumam avaliar esta região" e o chip "Esquerdo" no popover (`anatomy.css:271` e `:333`), e a dica da régua e o eixo no painel de Escalas. O guia §3 permite micro para o mês da faixa; o rótulo do popover é cabeçalho de dado.
- Correção sugerida: passar o rótulo do popover e a data da cápsula para `--t-body` (ou um degrau de 12 px), e deixar o 11 px só para contagem, eixo e crédito.

**M8. Hexadecimal fora de `tokens.css`.** Peça: P3.
- Evidência: `patient-record.css:1385-1386` usa `#000` na máscara das abas do painel, contra a regra 3 do guia §0.
- Correção sugerida: usar `black` ou um token de máscara (`--mask-solid`).

**M9. Valores soltos.** Peças: P1, P2.
- Evidência: popover com `padding: 14px 10px 10px 18px` (`anatomy.css:221`) e 48 declarações de espaço em px nessa folha. `glass-folder.css` tem `blur(22px) saturate(1.5)` (`:143-144`), `blur(10px)` (`:209`, `:234`) e `blur(16px) saturate(1.6)` (`:255`) fora de `--glass-filter`, `font-size: 14px` (`:266`) e z-index de 1 a 4 soltos. Em `patient-record.css`, `z-index: 1` (`:839`) e `2` (`:1298`).
- Correção sugerida: trocar por `--s-*`, `--glass-filter` e `--t-body`, e declarar uma escala local `--gf-z-*` / `--pr-z-*` como a `--an-z-*` do palco.

**M10. Alvo de 32 px no filtro de exames.** Peça: P3.
- Reproduzir: clicar no `↗` de uma pasta; "Mostrar todos" aparece no painel.
- Evidência: 110×32 (`patient-record.css:1017-1018`). Captura: `filtro-exames-1440.png`.
- Correção sugerida: `min-height: var(--touch)`.

**M11. Com carga e CPU a 4×, abrir passa de 200 ms.** Peças: P3, P4.
- Evidência: abrir a Linha do tempo levou 242 ms (longtask de 91 ms); abrir o prontuário levou 477 ms, com 3 longtasks (91 ms no máximo).
- Correção sugerida: montar o painel com `startTransition` e renderizar os 60 itens iniciais em 2 lotes.

**M12. Os modais vêm junto com a rota.** Peça: P3.
- Evidência: ao abrir o prontuário com todos os modais fechados, descem `LetterheadPreview` (11,8 kB), `PatientForm` (5,0), `DocumentSheet` (4,3), `cid10` (2,0) e `DataTable` (1,5), cerca de 25 kB gzip, por causa dos imports estáticos em `PatientRecordScreen.jsx:12`, `:21` e `:22`.
- Correção sugerida: `lazy()` para `PatientForm`, `ClinicalDocumentModal` e `RescheduleDialog`, carregando na primeira abertura.

**M13. Um efeito do palco depende da identidade de um JSX.** Peça: P1.
- Evidência: `AnatomyStage.jsx:429` usa `[status, alerts]`. `alerts` é um elemento novo a cada render do pai (o tique de 60 s, cada recarga), então o ResizeObserver desconecta e reconecta a cada commit do pai.
- Correção sugerida: depender de uma chave estável, por exemplo a lista de rótulos dos estados.

**M14. Três nomes para a mesma seção.** Peça: P3.
- Evidência: a pílula diz "Exames" (`PatientRecordScreen.jsx:58`), a coluna e o `aria-label` do painel dizem "Exames e anexos" (`:99`), e o título dentro do painel diz "Exames e pareceres" (`AttachmentsView.jsx:170`).
- Correção sugerida: um nome só ("Exames e anexos") nos três lugares.

---

## Evidências

Todas em `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/b66e8cad-c129-42d0-8ba7-78e62caa1819/scratchpad/sfd11/` (scripts) e `…/sfd11/shots/` (capturas e JSON):
- `visao-1440.png` / `.json`, `visao-1920.png` / `.json`, `visao-1440-rolada.png`, `z-palco.png`, `z-pastas.png`, `z-pasta-pareceres.png`, `z-escala.png`
- `hover-1440.png`, `popover-1440.png`, `camada-cranio-off-frente.png`
- `v-<largura>-<seção>.png` (45) e `varredura.json`; `painel-evol-<w>x<h>.png`
- `estado-{futuro,vazio,atrasado}-{1440,390}.png`, `janela-baixa-1280x480.png`, `modal-doc-1440.png`, `modal-doc-390.png`, `modal-remarcar-1440.png`, `filtro-exames-1440.png`
- `perf-cpu1-1440.json`, `perf-cpu4-1440.json`, `perf-cpu4-1920.json`, `ab-cpu1.json`, `carga-cpu1.json`, `carga-cpu4.json`, `foco.json`
- Scripts: `lib.mjs` (sessão em memória), `medir-visao.js`, `busto.mjs`, `varrer.js`, `perf.mjs`, `ab.mjs`, `prof.mjs`, `vazamento.mjs`, `carga.mjs`, `idb-abertura.js`, `exportar-clara.js`, `vite.p11.config.mjs` (todos em `…/sfd11/`)
