# Crítica P8 — Fidelidade à referência (prontuário do paciente)

- **Data:** 2026-10-26. As medições terminaram em 27/10, por volta das 14h25, depois do reinício do limite de uso.
- **Lente:** fidelidade à referência "Quantis — Health Intelligence System Desktop App" (Dribbble 27474777, Jack R. / RonDesignLab), traduzida para o tema claro pela régua `bar.md` e pelo `guia.md` §2–§3.
- **Referência vista:** **sim.** Abri o shot no navegador e olhei as 8 imagens do conjunto: composição inteira no monitor, close das pastas e do "Biological Age", cards de biomarcador, pino "Right Clavicle", popover "Aortic Valve" e o cartão "Patient Profile" isolado. O vídeo (mp4) não foi visto.
- **Método:** Chromium headless do design-loop (`cdp.mjs`, porta 9333, perfil de verificação). Usei uma cópia de `cdp.mjs` no scratchpad com um comando `pair`: duas capturas da mesma página, uma normal e outra com o canvas do busto escondido. A diferença entre elas isola o que o WebGL pinta. O fundo animado do shell (`canvas.shell__bg`) fica escondido nas duas, porque ele contamina a diferença (ver §6). Medidas de DOM saem de `getComputedStyle`/`getBoundingClientRect`; as de pixel, de PIL. Pacientes de seed: Clara Macedo Farias (`16df5f04-…`) e Rafael Siqueira Bastos (`4579401a-c511-4131-a339-7588293467c6`).
- **A tela mudou durante a crítica.** Entre a primeira rodada e a segunda, o código mudou várias vezes:
  - pastas antes de Diagnósticos;
  - máscara do canvas de 74→97 % para 82→100 %;
  - vidro das cápsulas e dos botões de 16 para 8 px;
  - cápsulas com ícone e data curta;
  - seletor de camadas em toque corrigido.

  O relatório descreve a tela **como estava às 14h15–14h25 de 27/10**. O que medi antes e já estava resolvido na segunda rodada está no §8.
- **Gravações:** nenhuma. Só abri e fechei o diálogo Remarcar e o modal Emitir documento. Os painéis das 8 seções foram abertos por `?secao=`.
- **Não testado:** fallback sem WebGL, montagem do busto (carregando), teclado e leitor de tela, impressão, 5 ou mais alertas, paciente sem atendimento, arrasto e rotação manual, popover a 1920. Hover e popover foram medidos só na primeira rodada; a mudança posterior foi de máscara e vidro, não do material. A crítica não leu `design-loop.md`, as críticas anteriores, os registros de conflito, o git nem o Obsidian.
- **Capturas:** o scratchpad foi limpo no meio da crítica, e as capturas da primeira rodada se perderam. As da segunda estão em `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/fidelidade/shots/` (`pa-1440.png`, `pa-1920.png`, `z-faixa-1440.png`, `z-pastas-dobra.png`, `z-pastas.png`, `pp-a.png`, `53-390-palco-pos-correcao.png`). A evidência que importa está copiada abaixo.

---

## 1. Descrição cega da nossa tela (1440×900, Clara)

Fundo claro com granulado leve e uma matriz de pontos de 22 px que some nas bordas. No topo ficam a busca, a unidade e os ícones (shell). Abaixo vêm o breadcrumb, o nome em 32 px de peso leve com botão circular de voltar, a linha de metadados (idade, nascimento, "em acompanhamento desde…", status com ponto verde, CIDs em chip) e, à direita, "Editar ficha" (branco) e "Emitir documento" (preto). Depois, uma barra de vidro com 9 pílulas: a ativa, "Visão geral", é preta; as outras são texto com contagem.

O corpo da página tem três faixas:
- **Esquerda (340 px):** card de vidro "Perfil do paciente", com luz azulada no canto, a grade Nascimento/Sexo/Responsável e a trilha tracejada "1 de 3 realizadas". Abaixo, "Exames e anexos · 7 arquivos ↗" em grade de pastas cinza-claras com rótulo "3 arquivos" e `+`. As folhas escuras quase não aparecem: só uma lasca preta no recorte da aba.
- **Centro (576×600, grudado no topo):** busto em arame fino cinza, da cabeça ao tórax, com nós em anel e o cérebro em linhas azuis. Os ombros descem até a faixa, e o coração aparece em malha rosada logo acima dela. No alto à esquerda ficam as pílulas de vidro "Alergias · Dipirona" e "Sem desfecho · Retorno de 07/10/2026 10:00 · Remarcar". À esquerda da cabeça há um arco fino com 5 botões redondos e nós. Na base, 3 cápsulas de vidro (ícone + "25 ago", ponto + status), um traço "Hoje", `+ − 3D` quadrados à direita e a linha de crédito.
- **Direita (360 px):** "Escalas · Ver todas ↗". SNAP-IV e Vanderbilt em 2 colunas mostram traço âmbar, "17" fino de 52 px com "/54" pequeno, seta, pílula "−5 pontos", "há 3 semanas", gráfico de pontos com faixa verde clara, linha-limite e anel no último ponto, e uma nota curta. Abaixo, M-CHAT-R/F ocupa a largura toda com um ponto só.

No hover, uma estrutura fica sólida (temporal azul, crânio grafite), com a malha clara por cima e um pino com rótulo de vidro. No clique, abre um popover de vidro claro com título, chip, ×, texto para a família e lista "Exames do paciente…" com contagens à direita. Uma seção aberta vira um painel branco de raio 28 sobre o palco e a coluna direita.

**Comparação com a referência.** O esqueleto é o mesmo:
- três colunas, com o corpo no centro e as colunas como cards flutuando sobre a mesa pontilhada;
- perfil e pastas à esquerda, biomarcadores à direita;
- cápsulas na base, agora passando por cima dos ombros, com controles quadrados no canto;
- arco seletor, pílulas de alerta, pino com anel e popover com linhas rótulo/valor.

O card de escala é praticamente 1:1 com o biomarcador.

Faltam três coisas que dão "cara de Quantis":
1. **As pastas não mostram as imagens.** Na referência, as imagens saem em leque acima do bolso fosco. Aqui ficam escondidas atrás da frente.
2. **O arco não abraça o corpo a 1920.** Lá ele fica a ~300 px da silhueta; na referência, encosta no ombro.
3. **O painel de seção é uma folha branca opaca.** O corpo não aparece atrás dele.

O tema claro e a ausência de cor em repouso são decisões do dono e não entram na conta.

---

## 2. Os 7 mecanismos da régua

| # | Mecanismo | Resultado | Medição (segunda rodada, salvo indicação) |
|---|---|---|---|
| 1 | Anatomia é o maior objeto | **PASSA** | O palco tem 576 px de 1316 px de largura útil, **43,8 %** (40,0 % da viewport). O busto ocupa **81,7 %** da altura do palco a 1440 (y 90→579 de 600, limiar 18/255; 77,5–83,2 % com limiar 30 ou 8). A 1920 ocupa **85,3 %** (87→751 de 780; 82,7–87,2 %). `.pr-stage` não tem fundo, borda nem sombra. A matriz de pontos de 22 px tem máscara radial. Na primeira rodada, a massa de tinta do busto era o dobro da das colunas. |
| 2 | Plexo legível, uma estrutura por vez | **PASSA** | Linha WebGL de 1 px e nós em anel visíveis. Em repouso não há preenchimento: só 1,8 % dos pixels do palco mudam mais de 60/255 com o canvas (são as linhas e os nós). Hover, medido na primeira rodada: no temporal, os pixels azuis saturados passam de 283 para **3448**, numa região só, com a malha por cima; no crânio, os pixels grafite passam de 759 para 22 985. O resto recua. Em 380 pontos amostrados na cabeça, os alvos do cérebro dão 41 %, o crânio 11 % e o vazio 40 %. |
| 3 | Card no padrão biomarcador | **PASSA** | Número de 52 px contra título de 14 px: **3,71×**. Peso 300. Unidade de 14 px em rgb(85,86,90), a 2 px do número. Traço de 2×14 px antes do título (âmbar rgb(185,131,0) e verde rgb(26,143,72)). Gráfico com retângulo tingido, linha-limite de 1 px e anel r 6 no último ponto. Nota de 19–38 px, ou seja, 1 a 2 linhas. |
| 4 | Um acento só | **PASSA** | Na dobra de 1440 e 1920, o único fundo azul preenchido é o do dock (fora de escopo). No hover entra +1, a estrutura. A pílula ativa usa tinta rgb(15,16,18). O traço "Hoje" agora é tinta. "Agendar retorno" é azul claro rgb(232,242,253) e fica em y 1488, fora da dobra. Vermelho, âmbar e verde aparecem só como estado. |
| 5 | Tudo que flutua sobre o palco é vidro | **PASSA** (na margem) | Alertas e barra de seções usam rgba(240,240,244,.72) ou (246,246,249,.64) com `blur(16px)`. Cápsulas, camadas e `+ − 3D` usam .72 com `blur(8px) saturate(1.6)`. Cards e pastas têm raio 28. Borda de 1 px somada a sombra larga só aparece no `.btn` global, fora de escopo. Dentro das cápsulas sobre o busto, a diferença com e sem canvas é de **0,14–1,36/255 de média (máx. 19)** a 1440 e 0,04–0,53 (máx. 10–12) a 1920, contra 0,6–9,3 (máx. 35–117) logo acima. Cerca de 15 % do sinal atravessa, e a malha rosada do coração aparece borrada através de "Sem desfecho" (`z-faixa-1440.png`). |
| 6 | A pasta é o herói do card de exames | **PARCIAL** | Na dobra: a arte da pasta fica em y 758–870 a 1440. A pasta ocupa **85 %** da largura do card (140/164). Tem aba, rótulo "3 arquivos" sobre a frente, frente com `blur(22px)` e título, data e ↗ no topo, com o ↗ à direita. **As folhas não saem da pasta em repouso:** o topo das 3 folhas fica em y 787, 799 e 804, com a frente em 787, ou seja, 0, −12 e −17 px acima da borda. Só uma lasca escura aparece no recorte da aba e o leque não se vê (`z-pastas-dobra.png`). A pasta de 1 arquivo (Pareceres, PDF) tem folha branca sobre fundo cinza-claro e não aparece na captura (`z-pastas.png`). |
| 7 | Base do palco em faixa única | **PASSA** | Uma fileira só (1 topo), com 2 itens de texto e 1 ícone por cápsula e traço "Hoje". Os botões `+ − 3D` têm 44×44 e raio 12, de vidro. A base dos controles coincide com a da faixa: 842 = 842 a 1440 e 1022 = 1022 a 1920. A 1440 as 3 cápsulas cabem; a 1280, a primeira fica fora (F8-4). |

**Contagem:** 6 PASSA · 1 PARCIAL · 0 FALHA.

---

## 3. Vereditos por peça

| Peça | Veredito | Motivo |
|---|---|---|
| **P1 Palco anatômico** | **APROVA** | M1, M2, M5 e M7 passam com medida. Os ombros passam atrás das cápsulas e o coração aparece em repouso. O popover segue a gramática da referência. Em toque, o seletor de camadas foi re-medido depois da correção e os 5 botões estão alcançáveis (§5.1). Fica o F8-3: a 1920 o arco está a 280–334 px da silhueta. |
| **P2 Colunas** | **REPROVA** | O card de escala está fiel, e perfil, medicações e marcos estão coerentes. Reprova pelo F8-2: na pasta, o herói do card, as folhas não aparecem em repouso, e a pasta de PDF parece vazia (M6 parcial). Menores: diagnósticos saíram da dobra (F8-10), card largo com um ponto só (F8-11), faixa sempre verde (F8-12) e "Próxima" fora da dobra (F8-13). |
| **P3 Seções e modais** | **APROVA** | Painel de raio 28 sobre palco e coluna direita (regra do dono), com título de 22 px, contagem, ação e "Voltar à visão geral". Diálogos coerentes, com borda branca sobre branco, invisível. Menores: o cabeçalho gasta 168 px antes do título (F8-6), e o vidro do painel não deixa ver o busto (F8-7). |
| **P4 Faixa e estados** | **APROVA** | Cumpre o M7. As cápsulas agora têm ícone e data curta. Os estados vazios são honestos e têm ação (Rafael: "Aplicar escala", "Registrar +", "Anexar exame"). O resumo "2 estados do paciente" cabe a 1920 sem reticências. Menor: a 1280 a primeira cápsula fica fora da faixa (F8-4). |

## 4. Nota geral: **7,5/10** para "parece a mesma família visual"

Estrutura, gramática dos cards, faixa sobre o corpo, controles, arco, pino e popover são reconhecíveis à primeira vista. O que ainda separa a nossa tela da referência é a pasta sem as imagens em leque, o arco solto na margem a 1920 e o painel que apaga o palco. Resolvido o F8-2, a nota sobe para ≈ 8,5.

---

## 5. Achados

### BLOQUEIA
Nenhum.

### GRAVE

**F8-2 — As folhas não saem da pasta em repouso, e a pasta de 1 arquivo parece vazia (P2, M6)**
- **Onde:** `admin/components/GlassFolder.tsx` e `admin/styles/components/glass-folder.css`, que fazem `--gf-lift: 42px` em repouso (`translate` empurra as folhas para baixo), `.gf-files` com `clip-path` e a folha de PDF com `--gf-sheet-from/to`.
- **Evidência medida (1440, Clara):**
  - Imagem: topo das folhas em 787, 799 e 804, com a frente da pasta em 787. Neurofisiológico: 787, 800 e 801, com a frente em 787. As folhas sobem **0 px** acima da borda da frente e o leque (−7,2°…+7,5°) fica escondido. Só aparece uma lasca escura no recorte da aba (`z-pastas-dobra.png`).
  - Pareceres (1 PDF): folha em degradê branco (#fff→#f2f2f0) sobre o fundo cinza-claro da pasta; na captura não se vê folha (`z-pastas.png`).
  - Na primeira rodada, antes da mudança, as mesmas folhas subiam 28 px acima da frente.
  - Na referência ("Tomography", "Radiography"), 3 ou 4 imagens saem em leque visível acima do bolso fosco, e esse é o elemento que identifica o card.
- **Deveria:** em repouso, as folhas sobem ≥ 24–30 px acima da frente, com o leque de ±4–7° visível. A folha de PDF tem borda ou sombra que a separe do fundo (contraste da borda ≥ 1,5:1 sobre `--gf-back-*`). O hover pode abrir mais, mas o repouso já mostra o conteúdo.
- **Reproduzir:** `cdp.mjs eval '#/pacientes/16df5f04-4169-4ac5-a458-1668c6221ec3' "await __sleep(4500); return [...document.querySelectorAll('article.pr-folder')].map(f=>[f.querySelector('.gf-front').getBoundingClientRect().top, [...f.querySelectorAll('.gf-sheet')].map(s=>s.getBoundingClientRect().top)])" --w 1440 --h 900`.

### MENOR

**F8-3 — O arco de camadas fica solto na margem a 1920 (P1)**
- **Evidência medida:** os botões ficam em x 482–566 (y 509–761). Nessas alturas, a silhueta do busto começa em x 846–900, com diferença do canvas > 18/255. São **280–334 px de vão**. A 1440, o vão é de ~76 px até o botão mais próximo (busto em x 642–693).
- **Deveria:** o arco ancora na silhueta do busto, à esquerda da cabeça e do ombro, como o arco da referência, que encosta no ombro. Não deve ancorar na margem do palco.
- **Reproduzir:** par com e sem canvas a 1920×1080; menor x com diferença > 18 por linha em y 520–760, contra o `right` de `.an-layers__btn`.

**F8-4 — A 1280 a primeira cápsula fica fora da faixa (P4)**
- **Evidência medida:** a 1280×800, `.pr-rail__list` tem scrollWidth 394, clientWidth 316 e scrollLeft 78. A primeira cápsula ocupa x 384–457, com a faixa em x 438–754: fica cortada pela borda. A 1440 as 3 cabem.
- **Deveria:** com 3 ou 4 consultas, todas cabem a 1280. Por exemplo, a faixa cresce até os controles, ou a cápsula fica mais compacta.

**F8-6 — O cabeçalho do painel gasta 168 px antes do título (P3)**
- **Evidência medida:** a 1440, com `?secao=evolucoes`, `.pr-panel` começa em y 276. A alergia fica em 292–336, na linha do "Voltar à visão geral" (x 1207). O estado "Sem desfecho" fica sozinho numa segunda linha (364–408), e o título "Evoluções clínicas" (h3, 22 px) só aparece em y 444. São 28 % dos 596 px do painel antes do título, com ~590 px livres na primeira linha.
- **Deveria:** alergia e estados na mesma linha do cabeçalho.

**F8-7 — O vidro do painel de seção é imperceptível (P3)**
- **Evidência medida:** a diferença com e sem canvas sob o painel é de **0,84/255 de média, máx. 8**, com só 1,2 % dos pixels acima de 6. O painel usa `rgba(255,255,255,.55)` com `blur(16px)`, e o palco atrás tem `blur(5px)` e `opacity .8`. O comentário do token `--pr-panel-glass` promete "o busto desfocado aparece por baixo". Na tela, o painel lê como folha branca opaca.
- **Deveria:** a silhueta borrada do busto lê atrás do painel no desktop. Por exemplo: tirar a opacidade .8 do palco e baixar o alfa do painel.

**F8-10 — Diagnósticos ativos saíram da dobra (P2)**
- **Evidência medida:** a ordem da coluna esquerda agora é Perfil (276–600), Pastas (616–1107) e Diagnósticos (1123–1254). O card fica abaixo da dobra a 1440 e também a 1920. O guia §4.2 define a ordem Perfil → Diagnósticos → Pastas, e na referência o "Biological Age" fica entre o perfil e as pastas. Os códigos continuam em chip na barra da página, então a informação não some.
- **Deveria:** diagnósticos compactos (1 linha por CID) antes das pastas, sem tirar as pastas da dobra. Exemplo: Nascimento, Sexo e Responsável em 3 colunas no perfil, como Age/Gender/Ethnicity.

**F8-11 — Escala com 1 aplicação vira card largo quase vazio (P2)**
- **Evidência medida:** o M-CHAT-R/F ocupa 360×245 px com 1 ponto, na ponta direita de um gráfico de 328 px. Os cards da referência são compactos e têm de 4 a 6 pontos.
- **Deveria:** com 1 aplicação, o card fica na grade de 174 px, ou o gráfico encolhe.

**F8-12 — Faixa do gráfico sempre verde, também no risco moderado (P2)**
- **Evidência medida:** no SNAP-IV e no Vanderbilt (`pr-scale--mid`, traço âmbar), o `rect` tem fill rgba(39,196,98,.10), igual ao do M-CHAT de baixo risco. O guia §4.4 diz "faixa tingida na cor do risco atual". Se a faixa foi redefinida como "faixa de referência normal", desconsiderar: aqui só aponto a divergência do texto do guia.

**F8-13 — "Próxima consulta" fora da dobra (P2)**
- **Evidência medida:** para Clara, `.pr-next` ("Agendar retorno") fica em y 1488 a 1440 e a 1920. Na referência, o equivalente ("Doctor: Julian Hayes") ancora o pé da coluna dentro da tela.

### 5.1 Seletor de camadas em toque (390), re-medido depois da correção
Página recarregada depois do aviso do coordenador. A 390×844, os 5 botões ficam numa coluna em x 28 (40×40), em y 331–547. O palco vai de 232 a 747 e a faixa de 661 a 713, sem sobreposição. `elementFromPoint` no centro de cada botão devolve o próprio botão nos 5 casos (`53-390-palco-pos-correcao.png`). Na primeira rodada, antes da correção, "Coluna e medula" ficava sob a cápsula de 16/09 e "Coração" ficava fora do palco. **Resolvido.** O tamanho de 40 px é assunto do crítico de sistema.

---

## 6. Suspeitas

- **O fundo do shell anima com `prefers-reduced-motion: reduce`** (fora de escopo). Com reduce emulado antes de carregar, o pixel (520,720) foi de rgb(229,237,246) a rgb(249,249,251) em 0,6 s, sem nenhuma ação: `canvas.shell__bg` segue em movimento. Isso também produziu, na primeira rodada desta crítica, um falso "véu azul" no tronco, descartado depois de esconder o `shell__bg`. Fica para quem cuida do shell.
- **Painel a 390:** na primeira rodada, o vidro do painel em tela cheia mostrava borrões escuros dos botões do cabeçalho atrás do título. Não re-medi depois das mudanças.
- **Popover a 1920:** não capturado. A 1440 ele ocupa x 772–1020, dentro do palco (borda em 1036).

## 7. O que está bom

- O card de escala é o mais fiel da tela: número fino de 52 px, unidade colada, traço de 2 px, pílula de variação, seta e gráfico de pontos com faixa, limite e anel.
- O hover acende uma estrutura sólida com a malha por cima, o resto recua, e o cérebro é alcançável em 41 % da cabeça.
- A faixa passa por cima dos ombros: o busto ocupa 82–85 % da altura do palco e o coração aparece em repouso.
- O popover segue a referência: vidro claro, chip, ×, linhas rótulo/valor à direita e a cor da estrutura vazando pela esquerda.
- O palco não tem moldura e o azul preenchido fica no limite da régua.

## 8. Medido na primeira rodada e resolvido antes da segunda

Fica registrado para não reabrir:
- **Pastas abaixo da dobra a 1440:** a arte estava em y 913; agora está em 758.
- **Vidro sem nada atrás:** a máscara terminava em 74→97 % e o vidro tinha 16 px; a média dentro das cápsulas era ≤ 0,77. Agora a máscara vai a 82→100 %, o vidro tem 8 px e a média chega a até 1,36, com máx. 19.
- **Primeira cápsula cortada a 1440:** sobravam 27 px; agora as 3 cabem.
- **Cápsula sem ícone:** agora tem 1 `svg` por cápsula.
- **Resumo de alertas truncado a 1920 (Rafael):** mostrava 233 de 330 px; agora cabe.
- **Coração invisível em repouso:** eram 26 pixels avermelhados; agora são 116, na faixa y 519–789.
- **Camadas em toque:** ver §5.1.
