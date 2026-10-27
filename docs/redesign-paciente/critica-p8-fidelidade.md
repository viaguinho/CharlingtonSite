# Crítica P8 — Fidelidade à referência (prontuário do paciente)

- **Data:** 2026-10-26 (medições concluídas em 27/10, depois do reinício do limite de uso).
- **Lente:** fidelidade à referência "Quantis — Health Intelligence System Desktop App" (Dribbble 27474777, Jack R. / RonDesignLab), traduzida para o tema claro pela régua `bar.md` e pelo `guia.md` §2–§3.
- **Referência vista:** **sim.** Abri o shot no navegador e olhei as 8 imagens do conjunto (composição inteira no monitor, close das pastas e do "Biological Age", cards de biomarcador, pino "Right Clavicle", popover "Aortic Valve", cartão "Patient Profile" isolado). O vídeo (mp4) não foi visto.
- **Método:** Chromium headless do design-loop (`cdp.mjs`, porta 9333, perfil de verificação). Para medir sem tocar no projeto, usei uma cópia de `cdp.mjs` no scratchpad com um comando `pair`: duas capturas da mesma página, uma normal e outra com o canvas do busto escondido. A diferença entre as duas isola o que o WebGL pinta. Na primeira rodada, o fundo animado do shell (`canvas.shell__bg`) contaminou essa diferença e me deu um falso "véu azul" no tronco. Repeti com o `shell__bg` escondido nas duas capturas, e todos os números do busto abaixo vêm da rodada limpa. Medidas de DOM saem de `getComputedStyle`/`getBoundingClientRect`; as de pixel, de PIL sobre as capturas. Pacientes de seed: Clara Macedo Farias (`16df5f04-…`) e Rafael Siqueira Bastos (`4579401a-c511-4131-a339-7588293467c6`).
- **Gravações:** nenhuma. Só abri e fechei o diálogo Remarcar e o modal Emitir documento. Os painéis das 8 seções foram abertos por `?secao=`.
- **Não testado:** fallback sem WebGL, montagem do busto (carregando), teclado e leitor de tela, impressão, 5 ou mais alertas, paciente sem nenhum atendimento, arrasto e rotação manual, popover a 1920, diálogos além de Remarcar e Emitir. A crítica não leu `design-loop.md`, as críticas anteriores, os registros de conflito, o git nem o Obsidian.
- **Capturas:** `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/fidelidade/shots/`. O scratchpad pode ser apagado, então a evidência que importa está copiada abaixo.

---

## 1. Descrição cega da nossa tela (1440×900, Clara)

Fundo claro, quase branco, com granulado leve e uma matriz de pontos de 22 px que some nas bordas. No topo ficam a busca, a unidade e os ícones (shell). Abaixo vêm o breadcrumb, o nome em 32 px de peso leve com um botão circular de voltar, a linha de metadados (idade, nascimento, "em acompanhamento desde…", status com ponto verde, códigos CID) e, à direita, "Editar ficha" (branco) e "Emitir documento" (preto). Depois, uma barra de vidro com 9 pílulas de seção: a ativa, "Visão geral", é preta; as outras são texto com contagem.

O corpo da página tem três faixas:
- **Esquerda (340 px):** cards brancos de vidro com raio grande. "Perfil do paciente" tem uma luz azulada no canto, a grade Nascimento/Sexo/Responsável e a trilha tracejada de acompanhamento ("1 de 3 realizadas"). Depois vêm "Diagnósticos ativos" (ponto + código + descrição) e "Exames e anexos" em grade 2×2 de pastas, que a 1440 só aparece pelo título.
- **Centro (576×600, grudado no topo):** um busto em arame fino cinza, da cabeça aos ombros, com nós em anel nos vértices e o cérebro em linhas azuis dentro do crânio. No alto à esquerda ficam duas pílulas de vidro, "Alergias · Dipirona" e "Sem desfecho · Retorno de 07/10/2026 10:00 · Remarcar". À esquerda da cabeça há um arco fino com 5 botões redondos (cérebro, crânio, vasos, coluna, coração) e nós sobre o arco. Na base, 3 cápsulas de consulta (data pequena em cima, ponto de estado e status embaixo), um traço azul "Hoje", os botões quadrados `+ − 3D` à direita e a linha de crédito.
- **Direita (360 px):** "Escalas · Ver todas ↗" em grade de 2 colunas. SNAP-IV e Vanderbilt mostram traço âmbar, número de 52 px fino ("17" + "/54" pequeno), seta de tendência, pílula "−5 pontos", "há 3 semanas", gráfico de pontos com faixa verde clara, linha-limite e o último ponto com anel, e uma nota curta. Embaixo, M-CHAT-R/F ocupa a largura toda. Medicações e Marcos ficam abaixo da dobra.

No hover, a estrutura fica sólida (lobo temporal em azul; crânio em grafite), com a malha clara por cima e um pino com anel e rótulo de vidro. No clique, abre um popover de vidro claro com título, chip "Esquerdo", ×, texto para a família e uma lista "Exames do paciente…" com contagens à direita. Uma seção aberta vira um painel branco de raio 28 que cobre o palco e a coluna direita.

**Comparação com a referência.** O esqueleto é o mesmo:
- três colunas, com o corpo no centro e as colunas flutuando como cards;
- perfil e pastas à esquerda, biomarcadores à direita;
- cápsulas na base com controles quadrados no canto;
- seletor em arco, pílulas de alerta, pino com anel e popover com linhas rótulo/valor.

O card de escala é a peça mais fiel: número fino, unidade colada, traço de estado, pílula de variação e gráfico de pontos com faixa e anel praticamente 1:1.

Faltam três coisas que dão "cara de Quantis":
1. **Profundidade.** Na referência, os vidros ("Mild Inflammation", "Reduced Density", a faixa de exames, o popover "Aortic Valve") ficam por cima do corpo e deixam o corpo vazar através deles. Aqui todo vidro fica em mesa vazia, ou sobre a parte do busto que a máscara já apagou.
2. **Pastas na tela.** A 1440 as pastas ficam inteiras abaixo da dobra. A frente fosca não deixa ver nada atrás.
3. **Arco colado ao corpo.** Na referência o arco abraça o ombro. A 1920 o nosso fica solto na margem.

O tema claro e a ausência de cor em repouso são decisões registradas e não entram na conta.

---

## 2. Os 7 mecanismos da régua

| # | Mecanismo | Resultado | Medição |
|---|---|---|---|
| 1 | Anatomia é o maior objeto | **PASSA** (na margem a 1440) | O palco tem 576 px de 1316 px de largura útil, **43,8 %** (40,0 % da viewport). O busto ocupa **77,5 %** da altura do palco a 1440 (y 90→554 de 600, limiar 18/255) e 72,8–80,0 % com limiar 30 ou 8. A 1920 ocupa **80,6 %** (87→715 de 780), entre 77,9 % e 83,6 % conforme o limiar. `.pr-stage` e `.an-stage` não têm fundo, borda nem sombra. Há matriz de pontos de 22 px (`--pr-dot`) com máscara radial. A massa de tinta do busto é o dobro da das colunas (média 12,6 contra 6,1–6,7). |
| 2 | Plexo legível, uma estrutura por vez | **PASSA** | Linha WebGL de 1 px e nós em anel visíveis. Em repouso não há preenchimento: só 1,7 % dos pixels do palco mudam mais de 60/255 com o canvas (são as linhas e os nós), e a assinatura de tinta chapada dá 0,02 %. No hover do temporal, os pixels azuis saturados passam de 283 para **3448**, numa região só, com a malha clara por cima. No hover do crânio, os pixels grafite passam de 759 para 22 985. O resto recua. Amostrei 380 pontos da cabeça: os alvos do cérebro dão 41 %, o crânio 11 %, a mandíbula 5 % e o vazio 40 %. O cérebro é alcançável. |
| 3 | Card no padrão biomarcador | **PASSA** | Número de 52 px contra título de 14 px: **3,71×**. Peso 300. Unidade de 14 px em rgb(85,86,90) contra o número em rgb(2,2,1), a 2 px dele. Traço de 2×14 px antes do título (âmbar rgb(185,131,0) e verde rgb(26,143,72)). Gráfico com retângulo tingido, linha-limite de 1 px e último ponto com anel (r 6, traço 1,25) sobre ponto r 3. Ponto de risco alto em rgb(217,67,47). Nota de 1 a 2 linhas. |
| 4 | Um acento só | **PASSA** | Na dobra de 1440 e 1920 não há azul preenchido fora do dock (fora de escopo) e do modelo. No hover entra +1, a estrutura. A pílula ativa usa tinta rgb(15,16,18). A "Próxima/Agendar retorno" é azul claro rgb(232,242,253) e fica fora da dobra. Vermelho aparece só em alerta, ponto de falta/sem desfecho e ponto de risco alto; âmbar e verde, só em traço de risco e no status. |
| 5 | Tudo que flutua sobre o palco é vidro | **PARCIAL** | No CSS está certo: alertas, cápsulas, camadas, `+ − 3D` e o popover usam rgba(240,240,244,.72) ou (246,246,249,.64) com `blur(16px) saturate(1.6)`; a barra de seções, .64 com o mesmo blur. Cards e pastas têm raio 28. Borda de 1 px somada a sombra larga só aparece no `.btn` global, fora de escopo. **Na tela, porém, nada aparece através do vidro:** dentro das 3 cápsulas, a diferença com e sem o busto atrás é de **0,05–0,77/255 de média (máx. 8–11)** a 1440 e **0,01–0,31 (máx. 4–7)** a 1920, contra 2,85 de média (máx. 77) logo acima. Alertas, arco e controles ficam sobre mesa vazia (F8-1). |
| 6 | A pasta é o herói do card de exames | **PARCIAL** | A pasta ocupa **85 %** da largura do card (140/164). Tem aba, rótulo "3 arquivos" sobre a frente e título, data e ↗ no topo, com o ↗ à direita. A frente usa `blur(22px) saturate(1.5)`. As folhas abrem em leque de −7,2°, +1,4° e +4,5° nas pastas de 3 arquivos. Falha em três pontos: **a 1440×900 a pasta fica 100 % abaixo da dobra** (topo da arte em y 913, dobra em 900); a pasta de 1 arquivo (PDF) mostra só 7 px de folha branca sobre o fundo claro, o que na captura some; e a frente fosca não tem nada atrás, porque o `clip-path` impede a folha de cruzar o vidro, e por isso lê como plástico opaco (F8-2). |
| 7 | Base do palco em faixa única | **PASSA** | Uma fileira só (1 topo distinto), com 2 itens de texto por cápsula e traço "Hoje". Os botões `+ − 3D` têm 44×44 e raio 12, de vidro. A base dos controles coincide com a da faixa: 842 = 842 a 1440 e 1022 = 1022 a 1920. Ressalva: a primeira cápsula sai cortada em repouso (F8-4). |

**Contagem:** 5 PASSA · 2 PARCIAL · 0 FALHA.

---

## 3. Vereditos por peça

| Peça | Veredito | Motivo |
|---|---|---|
| **P1 Palco anatômico** | **REPROVA** | Busto, hover, seleção, popover, camadas e controles estão certos e medidos (M1, M2 e M7 passam). Reprova pelo F8-1: o vidro nunca tem o corpo atrás, então a sensação de camadas da referência não aparece (M5 parcial). A 1920 o arco fica a ≥ 103 px do ombro e ~274 px da cabeça (F8-3). |
| **P2 Colunas** | **REPROVA** | Cards de escala, perfil, diagnósticos, medicações e marcos estão fiéis. Reprova pelo F8-2: a 1440×900 a pasta, que é o herói do card, não aparece na dobra. A pasta de 1 arquivo não mostra folha, e a frente fosca não deixa ver nada (M6 parcial). |
| **P3 Seções e modais** | **APROVA** | Painel branco de vidro com raio 28 sobre palco e coluna direita (regra do dono), cabeçalho com título de 22 px, contagem, ação e "Voltar à visão geral". Diálogos coerentes, com borda branca invisível sobre branco. Menores: o cabeçalho gasta 184 px antes do título (F8-6), e o vidro do painel não deixa ver o busto (F8-7). |
| **P4 Faixa e estados** | **APROVA** | A faixa cumpre o M7 e os estados vazios são honestos e têm ação ("Aplicar escala", "Registrar +", "Anexar exame"). Menores: primeira cápsula cortada (F8-4), cápsula sem ícone do tipo (F8-5) e resumo de alertas truncado a 1920 (F8-8). |

## 4. Nota geral: **7/10** para "parece a mesma família visual"

Estrutura, gramática dos cards, faixa, controles, arco, pino e popover são reconhecíveis à primeira vista. O que separa a nossa tela da referência é a profundidade: na Quantis, vidro e órgão se sobrepõem; aqui cada coisa fica no seu canto. As pastas também ficam fora da dobra no notebook de 1440. Resolvidos F8-1 e F8-2, a nota sobe para 8 ou mais.

---

## 5. Achados

### BLOQUEIA
Nenhum.

### GRAVE

**F8-1 — Nenhum vidro tem o busto atrás (P1, M5)**
- **Onde:** `.an-canvas-host` (máscara vertical), `.pr-visit`, `.pr-alert`, `.an-layers` (`admin/styles/components/anatomy.css`, `patient-record.css`).
- **Evidência medida:**
  - A máscara do canvas é `linear-gradient(to bottom, transparent 0, … 5%, … 74%, transparent 97%)`. A 1440, o busto começa a apagar em y = 444 do palco (600) e chega a ~0,28 de alfa no meio da faixa (y 544).
  - Dentro das cápsulas, com e sem canvas: média 0,05–0,77/255 (máx. 8–11) a 1440 e 0,01–0,31 (máx. 4–7) a 1920. A faixa logo acima mede 2,85 de média (máx. 77).
  - Alertas em y 292–348 (página), acima do topo da cabeça (y 366 a 1440).
  - O arco termina em x 596 e a cabeça começa em ~640 a 1440. A 1920 o arco vai até x 566, o ombro começa em 669 e a cabeça em ~840.
- **Deveria:** como na referência, ao menos a faixa e o popover passam por cima do corpo visível. Levar o fim da máscara para ≥ 90–92 % (ou baixar o alvo da câmera) para os ombros correrem atrás das cápsulas com alfa ≥ 0,7. Baixar o desfoque das cápsulas de 16 para ~8 px, para a malha ler como linha borrada. Meta: diferença média ≥ 3/255 dentro da cápsula, com e sem busto.
- **Reproduzir:** `fx.mjs pair <rota> A.png B.png --w 1440 --h 900 --eval "await __sleep(4500); document.querySelector('.shell__bg').style.visibility='hidden'" --toggle "document.querySelector('.an-canvas').style.visibility='hidden'"`, depois a diferença por pixel dentro dos retângulos de `.pr-visit`.

**F8-2 — A pasta não aparece na dobra de 1440 e a frente fosca não deixa ver nada (P2, M6)**
- **Onde:** `ProfileColumn.jsx` (ordem e altura dos cards), `glass-folder.css` (`.gf-files` com `clip-path`; folha de PDF).
- **Evidência medida:**
  - A 1440×900, `.gf-stage` começa em y 913 com a dobra em 900: 0 px de pasta visível. Só os cabeçalhos aparecem (y 815–875).
  - A coluna antes das pastas soma Perfil 332 px + Diagnósticos 131 px + títulos.
  - Pareceres (1 arquivo): a folha sai 7 px acima da frente (topo 644 contra 651), em degradê branco (#fff→#f2f2f0) sobre um fundo cinza-claro, e some na captura (`z-pastas-1440.png`).
  - A frente tem `backdrop-filter: blur(22px)`, mas o comentário do CSS diz "Nenhuma folha cruza o vidro". Sem nada atrás, ela lê como plástico cinza opaco. Na referência, as imagens aparecem borradas através do bolso.
- **Deveria:**
  - Ganhar ~125 px na coluna esquerda a 1440 para a arte da pasta entrar inteira na dobra. Por exemplo: Nascimento, Sexo e Responsável numa linha de 3 colunas, como Age/Gender/Ethnicity no "Patient Profile"; trilha logo abaixo; diagnósticos compactos.
  - Fazer a folha de PDF subir ≥ 20 px, com borda ou sombra que a separe do fundo.
  - Deixar a parte de baixo das folhas aparecer borrada pela frente fosca.
- **Reproduzir:** `cdp.mjs shot '#/pacientes/16df5f04-4169-4ac5-a458-1668c6221ec3' out.png --w 1440 --h 900 --eval "await __sleep(4500)"` e medir `document.querySelector('.gf-stage').getBoundingClientRect().top`.

**F8-9 — Seletor de camadas em tela de toque (390): re-medição pedida pelo coordenador.** Ver §5.1 no fim. Fica como GRAVE só se a re-medição confirmar.

### MENOR

**F8-3 — O arco de camadas fica longe do corpo a 1920 (P1)**
- **Evidência medida:** os botões ficam em x 482–566 a 1920; o busto, em x 669–1341, e a cabeça começa em ~840. São ≥ 103 px até o ombro e ~274 px até a cabeça. A 1440 a distância até a cabeça é de ~44 px.
- **Deveria:** o arco fica ancorado ao busto, à esquerda da silhueta, como o arco que abraça o ombro na referência, e não à margem do palco.
- **Reproduzir:** `02-dobra-1920.png`, retângulos de `.an-layers__btn`.

**F8-4 — Primeira cápsula cortada em repouso (P4, M7)**
- **Evidência medida:** `.pr-rail__list` tem scrollWidth 407 para clientWidth 380 a 1440. Ficam 27 px escondidos e "25 ago 2026" é cortado pela máscara de borda (`z-rail-1440.png`). A 1280, só 2 das 3 cápsulas aparecem; a 390, a rolagem começa em 137 px. Com 3 ou 4 consultas, a cápsula cortada parece defeito, não rolagem.
- **Deveria:** com poucas consultas, todas cabem. O caminho é compactar a cápsula (data "25 ago" e o ano só quando muda) ou deixar a faixa crescer até os controles.
- **Reproduzir:** `document.querySelector('.pr-rail__list').scrollWidth` contra `clientWidth`.

**F8-5 — Cápsula sem ícone do tipo (P4)**
- **Evidência medida:** 0 `svg` por `.pr-visit`. O guia §4.3 pede "ícone do tipo", e na referência cada cápsula tem um ícone em círculo.
- **Deveria:** um ícone do `Icon.jsx` por tipo (retorno, primeira consulta, teleconsulta), mantendo no máximo 3 itens de texto.

**F8-6 — O cabeçalho do painel gasta 184 px antes do título (P3)**
- **Evidência medida:** a 1440, `.pr-panel` começa em y 276. A alergia fica em 292–336 na linha do "Voltar à visão geral", o estado "Sem desfecho" sozinho numa segunda linha (364–420), e o título "Evoluções clínicas" só em y 460. São 31 % dos 596 px do painel antes do conteúdo, com ~590 px livres entre a alergia e o "Voltar".
- **Deveria:** alergia e estados na mesma linha do cabeçalho, com o título logo abaixo.
- **Reproduzir:** `?secao=evolucoes` a 1440, retângulos de `.pr-panel .pr-alert` e `h2`.

**F8-7 — O vidro do painel de seção é imperceptível (P3)**
- **Evidência medida:** com e sem canvas, sob o painel: média **2,48/255**, máx. 8, e só 1,2 % dos pixels acima de 6. O painel combina `rgba(255,255,255,.55)` com `blur(16px)`, e o palco atrás tem `blur(5px)`, opacidade .8 e escala .98. O comentário do token `--pr-panel-glass` diz "o busto desfocado aparece por baixo", mas na tela isso não acontece. A 390, o vidro mostra borrões escuros dos botões do cabeçalho atrás do título (`52-390-painel.png`).
- **Deveria:** a silhueta do busto lê, borrada, atrás do painel no desktop. Por exemplo: tirar a opacidade .8 do palco e baixar o alfa do painel. No celular, nada escuro deve vazar atrás do título.

**F8-8 — Resumo de alertas truncado com espaço sobrando (P1/P4)**
- **Evidência medida:** Rafael a 1920. "Sem desfecho · Sem consentimento para teleconsulta" precisa de 330 px e mostra 233 com reticências (`max-width: 340px` na pílula), enquanto `.an-alerts` tem 1024 px de largura.
- **Deveria:** a pílula cresce até caber quando há espaço; a reticência fica para larguras estreitas.

**F8-10 — Escala com 1 aplicação vira card largo quase vazio (P2)**
- **Evidência medida:** o M-CHAT-R/F ocupa 360×245 px com um único ponto na ponta direita de um gráfico de 328 px. Os cards da referência são compactos e têm de 4 a 6 pontos.
- **Deveria:** com 1 aplicação, o card fica na grade de 174 px, ou o gráfico encolhe para a faixa com o ponto.

**F8-11 — Faixa do gráfico sempre verde, também no risco moderado (P2)**
- **Evidência medida:** no SNAP-IV e no Vanderbilt (`pr-scale--mid`, traço âmbar), o `rect` tem fill rgba(39,196,98,.10), o mesmo do M-CHAT de baixo risco. O guia §4.4 diz "faixa tingida na cor do risco atual". Se a faixa foi redefinida depois como "faixa de referência, sempre normal", desconsiderar: aqui só aponto a divergência do texto do guia.

**F8-12 — "Próxima consulta" sempre fora da dobra (P2)**
- **Evidência medida:** para Clara, `.pr-next` fica em y 1496 tanto a 1440 quanto a 1920. Na referência, o equivalente ("Doctor: Julian Hayes") ancora o pé da coluna dentro da tela. Para Rafael a 1920 ele entra na dobra (y ≈ 941), porque a coluna é curta.
- **Deveria:** a pílula fica visível na dobra de 1440 em qualquer paciente, logo depois do perfil ou fixa no pé da coluna.

**F8-13 — Coração quase invisível no enquadramento inicial (P1)**
- **Evidência medida:** em repouso, o palco inteiro tem 26 pixels avermelhados (1440, fora alertas e faixa). Com só coração e vasos ligados, o coração fica em y ≈ 480–520 do palco, dentro do apagamento da máscara e atrás da cápsula "07 out 2026" (`z-coracao.png`). O enquadramento na cabeça é decisão do dono, mas o botão "Coração" liga algo que quase não se vê.
- **Deveria:** ao ligar só coração ou vasos, a câmera recua ou desce até a estrutura. Ou o recuo de F8-1 já resolve.

---

## 6. Suspeitas

- **Fundo do shell anima com `prefers-reduced-motion: reduce`** (fora de escopo). Emulando reduce antes de carregar, o pixel (520,720) mudou de rgb(229,237,246) para rgb(249,249,251) em 0,6 s sem nenhuma ação: o `canvas.shell__bg` continua em movimento. Também é a causa do falso "véu azul" da primeira rodada desta crítica. Fica para quem cuida do shell.
- **Popover a 1920:** não capturei. A 1440 ele ocupa x 772–1020 dentro do palco (borda em 1036), sem colidir. A 1920 não verifiquei.

## 7. O que está bom

- O card de escala é o mais fiel da tela: número fino de 52 px, unidade colada, traço de estado de 2 px, pílula de variação, seta e gráfico de pontos com faixa, limite e anel.
- O hover acende exatamente uma estrutura, sólida e com a malha por cima. O resto recua, e o cérebro é alcançável em 41 % da cabeça.
- O popover segue a gramática da referência: vidro claro, título com chip, ×, linhas rótulo/valor à direita e a cor da estrutura vazando pela esquerda.
- A faixa e os controles estão alinhados na mesma base nas duas larguras, com botões quadrados de vidro de 44 px.
- O palco não tem moldura, a matriz de pontos é discreta e o azul preenchido fica no limite da régua.

---

### 5.1 Re-medição do seletor de camadas em toque (390)
_(preenchido abaixo)_
